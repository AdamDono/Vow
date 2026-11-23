import { Hono } from 'hono'
import { db } from '../db/client.js'
import {
  conversations,
  messages,
  matches,
  relationships,
  users,
} from '../db/schema/index.js'
import { eq, desc, or, and } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'
import { emitToUser, emitToUsers } from '../ws/hub.js'
import { getUserPlatformHistory } from '../lib/history.js'
import { sendPushToUser } from '../lib/push.js'

export const chatRouter = new Hono<AppEnv>()

chatRouter.use('*', authMiddleware)

// Resolve a conversation by conversationId, matchId, or relationshipId, verify participant access, and return partnerId
async function resolveAuthorizedConversation(idOrRef: string, userId: string) {
  const conv = await db.query.conversations.findFirst({
    where: or(
      eq(conversations.id, idOrRef),
      eq(conversations.matchId, idOrRef),
      eq(conversations.relationshipId, idOrRef)
    ),
  })

  if (!conv) return null

  if (conv.type === 'couple' && conv.relationshipId) {
    const rel = await db.query.relationships.findFirst({
      where: and(
        eq(relationships.id, conv.relationshipId),
        or(eq(relationships.partner1Id, userId), eq(relationships.partner2Id, userId))
      ),
    })
    if (!rel) return null
    const partnerId = rel.partner1Id === userId ? rel.partner2Id : rel.partner1Id
    return { conv, partnerId }
  }

  if (conv.matchId) {
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, conv.matchId),
        or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
      ),
    })
    if (!match) return null
    const partnerId = match.user1Id === userId ? match.user2Id : match.user1Id
    return { conv, partnerId }
  }

  return null
}

// GET /api/chat/conversations
chatRouter.get('/conversations', async (c) => {
  try {
    const authUser = c.get('user')

    // Find all active single matches for this user
    const userMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.isActive, true),
        or(eq(matches.user1Id, authUser.userId), eq(matches.user2Id, authUser.userId))
      ),
    })

    if (userMatches.length === 0) {
      return c.json({ conversations: [] })
    }

    const convList = await Promise.all(
      userMatches.map(async (m) => {
        const conv = await db.query.conversations.findFirst({
          where: eq(conversations.matchId, m.id),
        })

        const partnerId = m.user1Id === authUser.userId ? m.user2Id : m.user1Id
        const partner = await db.query.users.findFirst({
          where: eq(users.id, partnerId),
          with: { profile: true, photos: true },
        })

        const lastMsg = conv
          ? await db.query.messages.findFirst({
              where: eq(messages.conversationId, conv.id),
              orderBy: [desc(messages.createdAt)],
            })
          : null

        const sortedPhotos = (partner?.photos || []).slice().sort((a, b) => a.orderIndex - b.orderIndex)

        let previewText = lastMsg?.text || 'New match! Say hello 👋'
        if (previewText.startsWith('{')) {
          try {
            const parsed = JSON.parse(previewText)
            if (parsed.type === 'date_proposal') {
              previewText = `${parsed.emoji || '🗓️'} Date Proposal: ${parsed.activity}`
            }
          } catch (_) {}
        }

        const showResume = partner?.profile?.datingResumePublic !== false
        const platformHistory = partner?.id && showResume ? await getUserPlatformHistory(partner.id) : null

        return {
          id: conv?.id || m.id,
          matchId: m.id,
          partner: {
            id: partner?.id,
            name: partner?.profile?.firstName || 'Partner',
            age: partner?.profile?.age,
            city: partner?.profile?.city,
            bio: partner?.profile?.bio,
            lookingFor: partner?.profile?.lookingFor,
            vouchRating: partner?.profile?.vouchRating ?? 95,
            livenessVerified: partner?.profile?.livenessVerified ?? false,
            platformHistory,
            photo: sortedPhotos[0]?.url,
          },
          lastMessage: previewText,
          lastMessageTime: lastMsg?.createdAt || m.matchedAt,
        }
      })
    )

    return c.json({ conversations: convList })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// GET /api/chat/:conversationId/messages
chatRouter.get('/:conversationId/messages', async (c) => {
  try {
    const authUser = c.get('user')
    const { conversationId } = c.req.param()

    const resolved = await resolveAuthorizedConversation(conversationId, authUser.userId)
    if (!resolved) {
      return c.json({ error: 'Conversation not found or unauthorized' }, 404)
    }

    const msgList = await db.query.messages.findMany({
      where: eq(messages.conversationId, resolved.conv.id),
      orderBy: [desc(messages.createdAt)],
      limit: 100,
    })

    return c.json({ conversationId: resolved.conv.id, messages: msgList.reverse() })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/chat/:conversationId/messages
chatRouter.post('/:conversationId/messages', async (c) => {
  try {
    const authUser = c.get('user')
    const { conversationId } = c.req.param()
    const { text, mediaUrl } = await c.req.json()

    if ((!text || text.trim().length === 0) && !mediaUrl) {
      return c.json({ error: 'Message text or media required' }, 400)
    }

    const resolved = await resolveAuthorizedConversation(conversationId, authUser.userId)
    if (!resolved) {
      return c.json({ error: 'Conversation not found or unauthorized' }, 404)
    }

    const [newMsg] = await db
      .insert(messages)
      .values({
        conversationId: resolved.conv.id,
        senderId: authUser.userId,
        text: (text || '📷 Photo').trim(),
        mediaUrl: mediaUrl || null,
        isRead: false,
      })
      .returning()

    // Real-time push to the conversation partner (WebSockets + Mobile Push Notification)
    emitToUser(resolved.partnerId, {
      type: 'chat:message',
      conversationId: resolved.conv.id,
      matchId: resolved.conv.matchId,
      message: newMsg,
    })

    const senderUser = await db.query.users.findFirst({
      where: eq(users.id, authUser.userId),
      with: { profile: true },
    })
    const senderName = senderUser?.profile?.firstName || 'Vow'
    let pushPreview = newMsg.text
    if (pushPreview.startsWith('{')) {
      try {
        const parsed = JSON.parse(pushPreview)
        if (parsed.type === 'date_proposal') {
          pushPreview = `Sent a Date Proposal: ${parsed.emoji || '🗓️'} ${parsed.activity}`
        }
      } catch (_) {}
    } else if (newMsg.mediaUrl && pushPreview === '📷 Photo') {
      pushPreview = 'Sent you a photo 📷'
    }

    sendPushToUser(resolved.partnerId, {
      title: resolved.conv.type === 'couple' ? `${senderName} ♥` : senderName,
      body: pushPreview.slice(0, 120),
      data: {
        route:
          resolved.conv.type === 'couple'
            ? '/(couple)/chat'
            : `/(single)/chat/${resolved.conv.id}`,
      },
    })

    return c.json({ message: newMsg })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/chat/:conversationId/date-proposal/:messageId/respond — Stateful Date Proposal Accept/Decline
chatRouter.post('/:conversationId/date-proposal/:messageId/respond', async (c) => {
  try {
    const authUser = c.get('user')
    const { conversationId, messageId } = c.req.param()
    const { status } = await c.req.json()

    if (!['accepted', 'declined'].includes(status)) {
      return c.json({ error: 'status must be accepted or declined' }, 400)
    }

    const resolved = await resolveAuthorizedConversation(conversationId, authUser.userId)
    if (!resolved) {
      return c.json({ error: 'Conversation not found or unauthorized' }, 404)
    }

    const msg = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.conversationId, resolved.conv.id)
      ),
    })

    if (!msg) {
      return c.json({ error: 'Date proposal message not found' }, 404)
    }

    let parsed: any
    try {
      parsed = JSON.parse(msg.text)
    } catch {
      return c.json({ error: 'Message is not a structured date proposal' }, 400)
    }

    if (parsed.type !== 'date_proposal') {
      return c.json({ error: 'Message is not a date proposal' }, 400)
    }

    parsed.status = status
    parsed.respondedAt = new Date().toISOString()

    const [updatedMsg] = await db
      .update(messages)
      .set({ text: JSON.stringify(parsed) })
      .where(eq(messages.id, msg.id))
      .returning()

    emitToUsers([authUser.userId, resolved.partnerId], {
      type: 'chat:message_updated',
      conversationId: resolved.conv.id,
      matchId: resolved.conv.matchId,
      message: updatedMsg,
    })

    return c.json({ success: true, message: updatedMsg })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

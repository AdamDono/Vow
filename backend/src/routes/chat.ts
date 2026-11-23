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

export const chatRouter = new Hono<AppEnv>()

chatRouter.use('*', authMiddleware)

// Resolve a conversation by conversationId or matchId, and verify participant access
async function resolveAuthorizedConversation(idOrMatchId: string, userId: string) {
  let conv = await db.query.conversations.findFirst({
    where: or(
      eq(conversations.id, idOrMatchId),
      eq(conversations.matchId, idOrMatchId),
      eq(conversations.relationshipId, idOrMatchId)
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
    return rel ? conv : null
  }

  if (conv.matchId) {
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, conv.matchId),
        or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
      ),
    })
    return match ? conv : null
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
            photo: sortedPhotos[0]?.url,
          },
          lastMessage: lastMsg?.text || 'New match! Say hello 👋',
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

    const conv = await resolveAuthorizedConversation(conversationId, authUser.userId)
    if (!conv) {
      return c.json({ error: 'Conversation not found or unauthorized' }, 404)
    }

    const msgList = await db.query.messages.findMany({
      where: eq(messages.conversationId, conv.id),
      orderBy: [desc(messages.createdAt)],
      limit: 100,
    })

    return c.json({ conversationId: conv.id, messages: msgList.reverse() })
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

    const conv = await resolveAuthorizedConversation(conversationId, authUser.userId)
    if (!conv) {
      return c.json({ error: 'Conversation not found or unauthorized' }, 404)
    }

    const [newMsg] = await db
      .insert(messages)
      .values({
        conversationId: conv.id,
        senderId: authUser.userId,
        text: (text || '📷 Photo').trim(),
        mediaUrl: mediaUrl || null,
        isRead: false,
      })
      .returning()

    return c.json({ message: newMsg })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

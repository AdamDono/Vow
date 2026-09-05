import { Hono } from 'hono'
import { db } from '../db/client.js'
import { conversations, messages, matches, users, profiles, userPhotos } from '../db/schema/index.js'
import { eq, desc, or, and } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'

export const chatRouter = new Hono<AppEnv>()

chatRouter.use('*', authMiddleware)

// GET /api/chat/conversations
chatRouter.get('/conversations', async (c) => {
  try {
    const authUser = c.get('user')

    // Find all matches for this user
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

        return {
          id: conv?.id || m.id,
          matchId: m.id,
          partner: {
            id: partner?.id,
            name: partner?.profile?.firstName || 'Partner',
            photo: partner?.photos[0]?.url,
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
    const { conversationId } = c.req.param()

    const msgList = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [desc(messages.createdAt)],
      limit: 50,
    })

    return c.json({ messages: msgList.reverse() })
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

    if (!text || text.trim().length === 0) {
      return c.json({ error: 'Message text required' }, 400)
    }

    const [newMsg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: authUser.userId,
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        isRead: false,
      })
      .returning()

    return c.json({ message: newMsg })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

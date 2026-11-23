import { Hono } from 'hono'
import { db } from '../db/client.js'
import {
  relationshipInvites,
  relationships,
  users,
  matches,
  conversations,
  timelineMilestones,
} from '../db/schema/index.js'
import { eq, and, or, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'

export const proposalsRouter = new Hono<AppEnv>()

proposalsRouter.use('*', authMiddleware)

async function formatUserSummary(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      profile: true,
      photos: true,
    },
  })

  const sortedPhotos = (user?.photos || []).slice().sort((a, b) => a.orderIndex - b.orderIndex)

  return {
    id: user?.id || userId,
    name: user?.profile?.firstName || 'Vow Member',
    age: user?.profile?.age || null,
    city: user?.profile?.city || null,
    lookingFor: user?.profile?.lookingFor || null,
    vouchRating: user?.profile?.vouchRating ?? 100,
    photo: sortedPhotos[0]?.url || null,
  }
}

// GET /api/proposals — List pending incoming and outgoing Vow proposals
proposalsRouter.get('/', async (c) => {
  try {
    const authUser = c.get('user')

    const pendingInvites = await db.query.relationshipInvites.findMany({
      where: and(
        eq(relationshipInvites.status, 'pending'),
        or(
          eq(relationshipInvites.senderId, authUser.userId),
          eq(relationshipInvites.receiverId, authUser.userId)
        )
      ),
      orderBy: [desc(relationshipInvites.sentAt)],
    })

    const incoming: any[] = []
    const outgoing: any[] = []

    for (const inv of pendingInvites) {
      if (inv.receiverId === authUser.userId) {
        const sender = await formatUserSummary(inv.senderId)
        incoming.push({
          id: inv.id,
          status: inv.status,
          sentAt: inv.sentAt,
          senderId: inv.senderId,
          receiverId: inv.receiverId,
          partner: sender,
        })
      } else {
        const receiver = await formatUserSummary(inv.receiverId)
        outgoing.push({
          id: inv.id,
          status: inv.status,
          sentAt: inv.sentAt,
          senderId: inv.senderId,
          receiverId: inv.receiverId,
          partner: receiver,
        })
      }
    }

    return c.json({ incoming, outgoing })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/proposals/send
proposalsRouter.post('/send', async (c) => {
  try {
    const authUser = c.get('user')
    const { receiverId } = await c.req.json()

    if (!receiverId) return c.json({ error: 'receiverId required' }, 400)
    if (receiverId === authUser.userId) {
      return c.json({ error: 'You cannot send a Vow proposal to yourself' }, 400)
    }

    // Verify both users exist and are currently single
    const [senderUser, receiverUser] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, authUser.userId) }),
      db.query.users.findFirst({ where: eq(users.id, receiverId) }),
    ])

    if (!senderUser || !receiverUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (senderUser.relationshipStatus === 'coupled') {
      return c.json({ error: 'You are already in an active Vow relationship' }, 400)
    }

    if (receiverUser.relationshipStatus === 'coupled') {
      return c.json({ error: 'This member is already in an exclusive Vow relationship' }, 400)
    }

    // Check if receiver already sent a pending proposal to sender
    const reversePending = await db.query.relationshipInvites.findFirst({
      where: and(
        eq(relationshipInvites.senderId, receiverId),
        eq(relationshipInvites.receiverId, authUser.userId),
        eq(relationshipInvites.status, 'pending')
      ),
    })

    if (reversePending) {
      return c.json({
        success: true,
        alreadyReceived: true,
        message: 'They already sent you a Vow! You can accept it directly.',
        invite: reversePending,
      })
    }

    // Check for existing outgoing pending proposal to this receiver
    const existingPending = await db.query.relationshipInvites.findFirst({
      where: and(
        eq(relationshipInvites.senderId, authUser.userId),
        eq(relationshipInvites.receiverId, receiverId),
        eq(relationshipInvites.status, 'pending')
      ),
    })

    if (existingPending) {
      return c.json({
        success: true,
        alreadyPending: true,
        message: 'Your Vow proposal is already pending their response.',
        invite: existingPending,
      })
    }

    const [invite] = await db
      .insert(relationshipInvites)
      .values({
        senderId: authUser.userId,
        receiverId,
        status: 'pending',
      })
      .returning()

    return c.json({
      success: true,
      message: 'Vow proposal sent! Awaiting response.',
      invite,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/proposals/decline — Receiver declines or sender withdraws a pending invite
proposalsRouter.post('/decline', async (c) => {
  try {
    const authUser = c.get('user')
    const { inviteId } = await c.req.json()

    if (!inviteId) return c.json({ error: 'inviteId required' }, 400)

    const invite = await db.query.relationshipInvites.findFirst({
      where: and(
        eq(relationshipInvites.id, inviteId),
        eq(relationshipInvites.status, 'pending'),
        or(
          eq(relationshipInvites.receiverId, authUser.userId),
          eq(relationshipInvites.senderId, authUser.userId)
        )
      ),
    })

    if (!invite) {
      return c.json({ error: 'Invite not found or already processed' }, 404)
    }

    await db
      .update(relationshipInvites)
      .set({ status: 'rejected', respondedAt: new Date() })
      .where(eq(relationshipInvites.id, invite.id))

    const isWithdraw = invite.senderId === authUser.userId
    return c.json({
      success: true,
      message: isWithdraw ? 'Vow proposal withdrawn.' : 'Vow proposal declined gently.',
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/proposals/accept — COMMITMENT LOCK TRANSITION
proposalsRouter.post('/accept', async (c) => {
  try {
    const authUser = c.get('user')
    const { inviteId } = await c.req.json()

    if (!inviteId) return c.json({ error: 'inviteId required' }, 400)

    const invite = await db.query.relationshipInvites.findFirst({
      where: and(
        eq(relationshipInvites.id, inviteId),
        eq(relationshipInvites.receiverId, authUser.userId),
        eq(relationshipInvites.status, 'pending')
      ),
    })

    if (!invite) {
      return c.json({ error: 'Invite not found or already processed' }, 404)
    }

    // Ensure neither partner is already in an active relationship
    const existingActive = await db.query.relationships.findFirst({
      where: and(
        eq(relationships.status, 'active'),
        or(
          eq(relationships.partner1Id, invite.senderId),
          eq(relationships.partner2Id, invite.senderId),
          eq(relationships.partner1Id, invite.receiverId),
          eq(relationships.partner2Id, invite.receiverId)
        )
      ),
    })

    if (existingActive) {
      return c.json({ error: 'One of the members is already in an active relationship' }, 400)
    }

    // 1. Update accepted invite status
    await db
      .update(relationshipInvites)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(eq(relationshipInvites.id, invite.id))

    // 2. Reject any other pending invites involving either partner
    await db
      .update(relationshipInvites)
      .set({ status: 'rejected', respondedAt: new Date() })
      .where(
        and(
          eq(relationshipInvites.status, 'pending'),
          or(
            eq(relationshipInvites.senderId, invite.senderId),
            eq(relationshipInvites.receiverId, invite.senderId),
            eq(relationshipInvites.senderId, invite.receiverId),
            eq(relationshipInvites.receiverId, invite.receiverId)
          )
        )
      )

    // 3. Lock both users into 'coupled' status (removes both from Singles discovery)
    await db
      .update(users)
      .set({ relationshipStatus: 'coupled', updatedAt: new Date() })
      .where(or(eq(users.id, invite.senderId), eq(users.id, invite.receiverId)))

    // 4. Deactivate all single matches for both partners
    await db
      .update(matches)
      .set({ isActive: false })
      .where(
        or(
          eq(matches.user1Id, invite.senderId),
          eq(matches.user2Id, invite.senderId),
          eq(matches.user1Id, invite.receiverId),
          eq(matches.user2Id, invite.receiverId)
        )
      )

    // 5. Create active relationship record
    const today = new Date().toISOString().split('T')[0]
    const [relationship] = await db
      .insert(relationships)
      .values({
        partner1Id: invite.senderId,
        partner2Id: invite.receiverId,
        status: 'active',
        anniversaryDate: today,
        harmonyScore: 100,
      })
      .returning()

    // 6. Create private couple conversation
    const [coupleConv] = await db
      .insert(conversations)
      .values({
        type: 'couple',
        relationshipId: relationship.id,
      })
      .returning()

    // 7. Create initial milestone
    await db.insert(timelineMilestones).values({
      relationshipId: relationship.id,
      title: 'Our Vow Day',
      description: 'Accepted our Vow Proposal and stepped out of the dating market together.',
      eventDate: today,
    })

    return c.json({
      success: true,
      message: 'Congratulations! You are now locked in Couples Mode together.',
      relationshipId: relationship.id,
      conversationId: coupleConv.id,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

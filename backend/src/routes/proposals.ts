import { Hono } from 'hono'
import { db } from '../db/client.js'
import { relationshipInvites, relationships, users, timelineMilestones } from '../db/schema/index.js'
import { eq, and, or } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'

export const proposalsRouter = new Hono<AppEnv>()

proposalsRouter.use('*', authMiddleware)

// POST /api/proposals/send
proposalsRouter.post('/send', async (c) => {
  try {
    const authUser = c.get('user')
    const { receiverId } = await c.req.json()

    if (!receiverId) return c.json({ error: 'receiverId required' }, 400)

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

    // 1. Update invite status to accepted
    await db
      .update(relationshipInvites)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(eq(relationshipInvites.id, invite.id))

    // 2. Lock both users into 'coupled' status
    await db
      .update(users)
      .set({ relationshipStatus: 'coupled' })
      .where(or(eq(users.id, invite.senderId), eq(users.id, invite.receiverId)))

    // 3. Create active relationship record
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

    // 4. Create initial milestone
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
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

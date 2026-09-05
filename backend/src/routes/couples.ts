import { Hono } from 'hono'
import { db } from '../db/client.js'
import { relationships, dailyCheckins, sharedGoals, timelineMilestones, users, profiles, userPhotos } from '../db/schema/index.js'
import { eq, or, and, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'

export const couplesRouter = new Hono<AppEnv>()

couplesRouter.use('*', authMiddleware)

// Helper: Get user's active relationship
async function getActiveRelationship(userId: string) {
  return await db.query.relationships.findFirst({
    where: and(
      eq(relationships.status, 'active'),
      or(eq(relationships.partner1Id, userId), eq(relationships.partner2Id, userId))
    ),
  })
}

// GET /api/couples/dashboard
couplesRouter.get('/dashboard', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)

    if (!relationship) {
      return c.json({ error: 'No active relationship found for user' }, 404)
    }

    const partnerId = relationship.partner1Id === authUser.userId ? relationship.partner2Id : relationship.partner1Id
    const partner = await db.query.users.findFirst({
      where: eq(users.id, partnerId),
      with: { profile: true, photos: true },
    })

    // Calculate days together
    const annivDate = relationship.anniversaryDate ? new Date(relationship.anniversaryDate) : new Date(relationship.createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - annivDate.getTime())
    const daysTogether = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Check today's check-in status
    const today = new Date().toISOString().split('T')[0]
    const userCheckin = await db.query.dailyCheckins.findFirst({
      where: and(
        eq(dailyCheckins.relationshipId, relationship.id),
        eq(dailyCheckins.userId, authUser.userId),
        eq(dailyCheckins.checkinDate, today)
      ),
    })

    const partnerCheckin = await db.query.dailyCheckins.findFirst({
      where: and(
        eq(dailyCheckins.relationshipId, relationship.id),
        eq(dailyCheckins.userId, partnerId),
        eq(dailyCheckins.checkinDate, today)
      ),
    })

    const isDoubleBlindSealed = !(userCheckin && partnerCheckin)

    return c.json({
      relationshipId: relationship.id,
      harmonyScore: relationship.harmonyScore,
      daysTogether,
      anniversaryDate: relationship.anniversaryDate,
      partner: {
        id: partner?.id,
        name: partner?.profile?.firstName,
        photo: partner?.photos[0]?.url,
      },
      todayCheckin: {
        userSubmitted: !!userCheckin,
        partnerSubmitted: !!partnerCheckin,
        isSealed: isDoubleBlindSealed,
        userEntry: userCheckin || null,
        partnerEntry: isDoubleBlindSealed ? null : partnerCheckin,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/couples/checkin — Double-Blind Daily Submission
couplesRouter.post('/checkin', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) {
      return c.json({ error: 'No active relationship found' }, 404)
    }

    const { moodScore, promptQuestion, promptAnswer } = await c.req.json()
    if (!moodScore || moodScore < 1 || moodScore > 5) {
      return c.json({ error: 'Valid moodScore (1-5) required' }, 400)
    }

    const partnerId = relationship.partner1Id === authUser.userId ? relationship.partner2Id : relationship.partner1Id
    const today = new Date().toISOString().split('T')[0]

    // Check if partner already checked in today
    const partnerCheckin = await db.query.dailyCheckins.findFirst({
      where: and(
        eq(dailyCheckins.relationshipId, relationship.id),
        eq(dailyCheckins.userId, partnerId),
        eq(dailyCheckins.checkinDate, today)
      ),
    })

    const shouldUnseal = !!partnerCheckin

    // Insert or update current user checkin
    const [checkin] = await db
      .insert(dailyCheckins)
      .values({
        relationshipId: relationship.id,
        userId: authUser.userId,
        partnerId,
        moodScore: Number(moodScore),
        promptQuestion: promptQuestion || 'What made you feel loved today?',
        promptAnswer: promptAnswer || '',
        checkinDate: today,
        isSealed: !shouldUnseal,
      })
      .returning()

    // If partner also submitted, unseal both and update Harmony score
    if (shouldUnseal) {
      await db
        .update(dailyCheckins)
        .set({ isSealed: false })
        .where(
          and(
            eq(dailyCheckins.relationshipId, relationship.id),
            eq(dailyCheckins.checkinDate, today)
          )
        )

      // Dynamic harmony score adjustment (average mood normalized to %)
      const avgTodayMood = ((checkin.moodScore + (partnerCheckin?.moodScore || 5)) / 10) * 100
      const updatedHarmony = Math.min(100, Math.round((relationship.harmonyScore * 0.7) + (avgTodayMood * 0.3)))

      await db
        .update(relationships)
        .set({ harmonyScore: updatedHarmony })
        .where(eq(relationships.id, relationship.id))
    }

    return c.json({
      success: true,
      checkin,
      revealed: shouldUnseal,
      message: shouldUnseal
        ? 'Both partners have checked in! Your daily responses are now revealed.'
        : 'Your check-in is sealed. It will unlock once your partner checks in.',
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// GET /api/couples/goals
couplesRouter.get('/goals', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) return c.json({ error: 'No active relationship' }, 404)

    const goals = await db.query.sharedGoals.findMany({
      where: eq(sharedGoals.relationshipId, relationship.id),
      orderBy: [desc(sharedGoals.createdAt)],
    })

    return c.json({ goals })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/couples/goals
couplesRouter.post('/goals', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) return c.json({ error: 'No active relationship' }, 404)

    const { title, description, targetDate } = await c.req.json()
    if (!title) return c.json({ error: 'Title required' }, 400)

    const [goal] = await db
      .insert(sharedGoals)
      .values({
        relationshipId: relationship.id,
        title,
        description: description || '',
        targetDate: targetDate || null,
        isCompleted: false,
      })
      .returning()

    return c.json({ goal })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// GET /api/couples/timeline
couplesRouter.get('/timeline', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) return c.json({ error: 'No active relationship' }, 404)

    const milestones = await db.query.timelineMilestones.findMany({
      where: eq(timelineMilestones.relationshipId, relationship.id),
      orderBy: [desc(timelineMilestones.eventDate)],
    })

    return c.json({ milestones })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

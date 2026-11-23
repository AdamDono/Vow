import { Hono } from 'hono'
import { db } from '../db/client.js'
import {
  relationships,
  dailyCheckins,
  sharedGoals,
  timelineMilestones,
  conversations,
  users,
  profiles,
} from '../db/schema/index.js'
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

async function getOrCreateCoupleConversation(relationshipId: string) {
  const existing = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.type, 'couple'),
      eq(conversations.relationshipId, relationshipId)
    ),
  })
  if (existing) return existing

  const [created] = await db
    .insert(conversations)
    .values({
      type: 'couple',
      relationshipId,
    })
    .returning()
  return created
}

function getPrimaryPhoto(photos?: Array<{ url: string; orderIndex: number }>) {
  if (!photos || photos.length === 0) return null
  const sorted = photos.slice().sort((a, b) => a.orderIndex - b.orderIndex)
  return sorted[0]?.url || null
}

// GET /api/couples/dashboard
couplesRouter.get('/dashboard', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)

    if (!relationship) {
      return c.json({ error: 'No active relationship found for user' }, 404)
    }

    const partnerId =
      relationship.partner1Id === authUser.userId
        ? relationship.partner2Id
        : relationship.partner1Id

    const [selfUser, partnerUser, coupleConv, goals, milestones] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, authUser.userId),
        with: { profile: true, photos: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, partnerId),
        with: { profile: true, photos: true },
      }),
      getOrCreateCoupleConversation(relationship.id),
      db.query.sharedGoals.findMany({
        where: eq(sharedGoals.relationshipId, relationship.id),
      }),
      db.query.timelineMilestones.findMany({
        where: eq(timelineMilestones.relationshipId, relationship.id),
      }),
    ])

    // Calculate days together (at least Day 1 on Vow Day)
    const annivDate = relationship.anniversaryDate
      ? new Date(relationship.anniversaryDate)
      : new Date(relationship.createdAt)
    const now = new Date()
    const diffMs = Math.max(0, now.getTime() - annivDate.getTime())
    const daysTogether = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)

    // Check today's check-in status
    const today = new Date().toISOString().split('T')[0]
    const [userCheckin, partnerCheckin] = await Promise.all([
      db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.relationshipId, relationship.id),
          eq(dailyCheckins.userId, authUser.userId),
          eq(dailyCheckins.checkinDate, today)
        ),
      }),
      db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.relationshipId, relationship.id),
          eq(dailyCheckins.userId, partnerId),
          eq(dailyCheckins.checkinDate, today)
        ),
      }),
    ])

    const isDoubleBlindSealed = !(userCheckin && partnerCheckin)

    return c.json({
      relationshipId: relationship.id,
      conversationId: coupleConv.id,
      harmonyScore: relationship.harmonyScore,
      daysTogether,
      anniversaryDate: relationship.anniversaryDate,
      stats: {
        goalsTotal: goals.length,
        goalsCompleted: goals.filter((g) => g.isCompleted).length,
        milestonesCount: milestones.length,
      },
      self: {
        id: selfUser?.id || authUser.userId,
        name: selfUser?.profile?.firstName || 'You',
        photo: getPrimaryPhoto(selfUser?.photos),
      },
      partner: {
        id: partnerUser?.id || partnerId,
        name: partnerUser?.profile?.firstName || 'Partner',
        age: partnerUser?.profile?.age || null,
        city: partnerUser?.profile?.city || null,
        photo: getPrimaryPhoto(partnerUser?.photos),
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

// POST /api/couples/checkin — Double-Blind Daily Submission (idempotent upsert per day)
couplesRouter.post('/checkin', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) {
      return c.json({ error: 'No active relationship found' }, 404)
    }

    const { moodScore, promptQuestion, promptAnswer } = await c.req.json()
    if (!moodScore || Number(moodScore) < 1 || Number(moodScore) > 5) {
      return c.json({ error: 'Valid moodScore (1-5) required' }, 400)
    }

    const partnerId =
      relationship.partner1Id === authUser.userId
        ? relationship.partner2Id
        : relationship.partner1Id
    const today = new Date().toISOString().split('T')[0]

    const [existingOwn, partnerCheckin] = await Promise.all([
      db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.relationshipId, relationship.id),
          eq(dailyCheckins.userId, authUser.userId),
          eq(dailyCheckins.checkinDate, today)
        ),
      }),
      db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.relationshipId, relationship.id),
          eq(dailyCheckins.userId, partnerId),
          eq(dailyCheckins.checkinDate, today)
        ),
      }),
    ])

    const shouldUnseal = !!partnerCheckin
    let checkin

    if (existingOwn) {
      const [updated] = await db
        .update(dailyCheckins)
        .set({
          moodScore: Number(moodScore),
          promptQuestion: promptQuestion || existingOwn.promptQuestion || 'What made you feel loved today?',
          promptAnswer: promptAnswer ?? existingOwn.promptAnswer ?? '',
          isSealed: !shouldUnseal,
        })
        .where(eq(dailyCheckins.id, existingOwn.id))
        .returning()
      checkin = updated
    } else {
      const [inserted] = await db
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
      checkin = inserted
    }

    let updatedHarmony = relationship.harmonyScore

    // If partner also submitted, unseal both and recalculate Harmony Score
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

      const avgTodayMood = ((checkin.moodScore + (partnerCheckin?.moodScore || 5)) / 10) * 100
      updatedHarmony = Math.min(100, Math.round(relationship.harmonyScore * 0.7 + avgTodayMood * 0.3))

      await db
        .update(relationships)
        .set({ harmonyScore: updatedHarmony })
        .where(eq(relationships.id, relationship.id))
    }

    return c.json({
      success: true,
      checkin,
      partnerEntry: shouldUnseal ? partnerCheckin : null,
      harmonyScore: updatedHarmony,
      revealed: shouldUnseal,
      message: shouldUnseal
        ? 'Both partners have checked in! Your daily reflections are now revealed.'
        : 'Your check-in is sealed. It will unlock as soon as your partner checks in today.',
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
    if (!title || !String(title).trim()) return c.json({ error: 'Title required' }, 400)

    const [goal] = await db
      .insert(sharedGoals)
      .values({
        relationshipId: relationship.id,
        title: String(title).trim(),
        description: description ? String(description).trim() : '',
        targetDate: targetDate || null,
        isCompleted: false,
      })
      .returning()

    return c.json({ goal })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// PATCH /api/couples/goals/:goalId — Toggle completion or edit goal
couplesRouter.patch('/goals/:goalId', async (c) => {
  try {
    const authUser = c.get('user')
    const { goalId } = c.req.param()
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) return c.json({ error: 'No active relationship' }, 404)

    const body = await c.req.json()
    const existing = await db.query.sharedGoals.findFirst({
      where: and(
        eq(sharedGoals.id, goalId),
        eq(sharedGoals.relationshipId, relationship.id)
      ),
    })

    if (!existing) return c.json({ error: 'Goal not found' }, 404)

    const nextCompleted =
      typeof body.isCompleted === 'boolean' ? body.isCompleted : !existing.isCompleted

    const [goal] = await db
      .update(sharedGoals)
      .set({
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(sharedGoals.id, goalId))
      .returning()

    return c.json({ goal })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// DELETE /api/couples/goals/:goalId
couplesRouter.delete('/goals/:goalId', async (c) => {
  try {
    const authUser = c.get('user')
    const { goalId } = c.req.param()
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) return c.json({ error: 'No active relationship' }, 404)

    await db
      .delete(sharedGoals)
      .where(
        and(
          eq(sharedGoals.id, goalId),
          eq(sharedGoals.relationshipId, relationship.id)
        )
      )

    return c.json({ success: true })
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
      orderBy: [desc(timelineMilestones.eventDate), desc(timelineMilestones.createdAt)],
    })

    return c.json({ milestones })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/couples/timeline — Add a new memory milestone
couplesRouter.post('/timeline', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) return c.json({ error: 'No active relationship' }, 404)

    const { title, description, eventDate, photoUrl } = await c.req.json()
    if (!title || !String(title).trim()) {
      return c.json({ error: 'Milestone title is required' }, 400)
    }

    const formattedDate =
      eventDate && /^\d{4}-\d{2}-\d{2}$/.test(String(eventDate).trim())
        ? String(eventDate).trim()
        : new Date().toISOString().split('T')[0]

    const [milestone] = await db
      .insert(timelineMilestones)
      .values({
        relationshipId: relationship.id,
        title: String(title).trim(),
        description: description ? String(description).trim() : '',
        eventDate: formattedDate,
        photoUrl: photoUrl || null,
      })
      .returning()

    return c.json({ milestone })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/couples/end — End Relationship & Re-entry to Single Mode
couplesRouter.post('/end', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) {
      return c.json({ error: 'No active relationship found' }, 404)
    }

    const body = await c.req.json().catch(() => ({}))
    const respectRating = body.respectRating ? Number(body.respectRating) : null

    const partnerId =
      relationship.partner1Id === authUser.userId
        ? relationship.partner2Id
        : relationship.partner1Id

    // 1. Terminate active relationship
    await db
      .update(relationships)
      .set({
        status: 'terminated',
        terminatedAt: new Date(),
      })
      .where(eq(relationships.id, relationship.id))

    // 2. Return both users to Single Mode
    await db
      .update(users)
      .set({
        relationshipStatus: 'single',
        updatedAt: new Date(),
      })
      .where(
        or(
          eq(users.id, relationship.partner1Id),
          eq(users.id, relationship.partner2Id)
        )
      )

    // 3. Optionally reflect mutual respect rating in partner's Vow Trust Score
    if (respectRating && respectRating >= 1 && respectRating <= 5) {
      const partnerProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, partnerId),
      })
      if (partnerProfile) {
        const currentScore = partnerProfile.vouchRating ?? 100
        const delta = respectRating >= 4 ? 2 : respectRating === 3 ? 0 : -5
        const nextScore = Math.max(50, Math.min(100, currentScore + delta))
        await db
          .update(profiles)
          .set({ vouchRating: nextScore, updatedAt: new Date() })
          .where(eq(profiles.userId, partnerId))
      }
    }

    return c.json({
      success: true,
      message:
        'Your Vow relationship has been respectfully closed. Both profiles have returned to Single Mode.',
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// GET /api/couples/history — Anonymized Vow Platform History for current user
couplesRouter.get('/history', async (c) => {
  try {
    const authUser = c.get('user')

    const pastRelationships = await db.query.relationships.findMany({
      where: and(
        eq(relationships.status, 'terminated'),
        or(
          eq(relationships.partner1Id, authUser.userId),
          eq(relationships.partner2Id, authUser.userId)
        )
      ),
      orderBy: [desc(relationships.terminatedAt)],
    })

    const summary = pastRelationships.map((rel) => {
      const start = rel.anniversaryDate ? new Date(rel.anniversaryDate) : new Date(rel.createdAt)
      const end = rel.terminatedAt ? new Date(rel.terminatedAt) : new Date()
      const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      return {
        id: rel.id,
        daysTogether: days,
        finalHarmonyScore: rel.harmonyScore,
        startedAt: rel.anniversaryDate,
        endedAt: rel.terminatedAt,
      }
    })

    return c.json({
      count: summary.length,
      relationships: summary,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

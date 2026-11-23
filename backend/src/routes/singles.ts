import { Hono } from 'hono'
import { db } from '../db/client.js'
import { users, profiles, userPhotos, userInterests, swipes, matches, conversations, userBlocks, userReports } from '../db/schema/index.js'
import { eq, ne, and, or, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'
import { emitToUser } from '../ws/hub.js'
import { getUserPlatformHistory } from '../lib/history.js'
import { sendPushToUser } from '../lib/push.js'

export const singlesRouter = new Hono<AppEnv>()

// Require auth for all single endpoints
singlesRouter.use('*', authMiddleware)

// GET /api/singles/feed — Discovery Stack with Live Filters
singlesRouter.get('/feed', async (c) => {
  try {
    const authUser = c.get('user')
    const minAge = Number(c.req.query('minAge')) || 18
    const maxAge = Number(c.req.query('maxAge')) || 99
    const cityFilter = c.req.query('city')?.trim()
    const lookingForFilter = c.req.query('lookingFor')?.trim()
    const verifiedOnly = c.req.query('verifiedOnly') === 'true'
    const includeSwiped = c.req.query('includeSwiped') === 'true'

    // Get IDs of users already swiped on and blocked (either direction)
    const [mySwipes, blockRows] = await Promise.all([
      includeSwiped
        ? Promise.resolve([])
        : db.query.swipes.findMany({
            where: eq(swipes.swiperId, authUser.userId),
            columns: { targetId: true },
          }),
      db.query.userBlocks.findMany({
        where: or(
          eq(userBlocks.blockerId, authUser.userId),
          eq(userBlocks.blockedId, authUser.userId)
        ),
      }),
    ])

    const swipedTargetIds = mySwipes.map((s) => s.targetId)
    const blockedUserIds = new Set<string>()
    for (const b of blockRows) {
      blockedUserIds.add(b.blockerId === authUser.userId ? b.blockedId : b.blockerId)
    }

    // Find single candidates
    const candidates = await db.query.users.findMany({
      where: and(ne(users.id, authUser.userId), eq(users.relationshipStatus, 'single')),
      with: {
        profile: true,
        photos: true,
        interests: true,
      },
      limit: 50,
    })

    const filteredRaw = candidates
      .filter((cand) => cand.profile !== null)
      .filter((cand) => {
        // Respect Discovery Visibility pause & blocks
        if (cand.profile?.discoveryActive === false) return false
        if (blockedUserIds.has(cand.id)) return false
        // Exclude already swiped
        if (!includeSwiped && swipedTargetIds.includes(cand.id)) {
          return false
        }
        const p = cand.profile!
        const candAge = p.age || 25
        if (candAge < minAge || candAge > maxAge) return false

        if (cityFilter && cityFilter !== 'All') {
          if (!p.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
        }

        if (lookingForFilter && lookingForFilter !== 'All') {
          if (!p.lookingFor?.toLowerCase().includes(lookingForFilter.toLowerCase())) return false
        }

        if (verifiedOnly && !p.isVerified) return false

        return true
      })

    const filtered = await Promise.all(
      filteredRaw.map(async (cand) => {
        const showResume = cand.profile?.datingResumePublic !== false
        const platformHistory = showResume ? await getUserPlatformHistory(cand.id) : null
        const sortedPhotos = (cand.photos || []).slice().sort((a, b) => a.orderIndex - b.orderIndex)

        return {
          id: cand.id,
          name: `${cand.profile?.firstName || 'User'}`,
          age: cand.profile?.age || 25,
          city: cand.profile?.city || 'Johannesburg, SA',
          bio: cand.profile?.bio || '',
          lookingFor: cand.profile?.lookingFor || 'Long-term relationship',
          vouchRating: cand.profile?.vouchRating || 95,
          isVerified: cand.profile?.isVerified ?? true,
          livenessVerified: cand.profile?.livenessVerified ?? false,
          platformHistory,
          photos: sortedPhotos.map((p) => p.url),
          interests: cand.interests.map((i) => i.interest),
        }
      })
    )

    return c.json({ feed: filtered })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/singles/reset-swipes — Reset swipes to re-discover profiles
singlesRouter.post('/reset-swipes', async (c) => {
  try {
    const authUser = c.get('user')
    await db
      .delete(swipes)
      .where(eq(swipes.swiperId, authUser.userId))

    return c.json({ success: true, message: 'Deck & swipe history reset successfully' })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/singles/swipe — Record Like/Pass/SuperLike
singlesRouter.post('/swipe', async (c) => {
  try {
    const authUser = c.get('user')
    const { targetId, direction } = await c.req.json()

    if (!targetId || !['like', 'pass', 'super_like'].includes(direction)) {
      return c.json({ error: 'Valid targetId and direction required' }, 400)
    }

    // Insert swipe record
    await db.insert(swipes).values({
      swiperId: authUser.userId,
      targetId,
      direction,
    })

    let isMatch = false
    let matchId = null

    // Check mutual like
    if (direction === 'like' || direction === 'super_like') {
      const mutualSwipe = await db.query.swipes.findFirst({
        where: and(
          eq(swipes.swiperId, targetId),
          eq(swipes.targetId, authUser.userId),
          or(eq(swipes.direction, 'like'), eq(swipes.direction, 'super_like'))
        ),
      })

      if (mutualSwipe) {
        isMatch = true
        // Create match
        const [newMatch] = await db
          .insert(matches)
          .values({
            user1Id: authUser.userId,
            user2Id: targetId,
            isActive: true,
          })
          .returning()

        matchId = newMatch.id

        // Create match conversation
        await db.insert(conversations).values({
          type: 'single_match',
          matchId: newMatch.id,
        })

        // Notify the other user in real time (WebSockets + Push Notification)
        emitToUser(targetId, {
          type: 'single:match',
          matchId: newMatch.id,
          partnerId: authUser.userId,
        })
        const swiperProfile = await db.query.profiles.findFirst({ where: eq(profiles.userId, authUser.userId) })
        sendPushToUser(targetId, {
          title: "It's a Vow Match! ♥",
          body: `You and ${swiperProfile?.firstName || 'someone special'} liked each other. Say hello!`,
          data: { route: '/(single)/matches', matchId: newMatch.id },
        })
      }
    }

    return c.json({
      success: true,
      isMatch,
      matchId,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// GET /api/singles/matches — Active matches list
singlesRouter.get('/matches', async (c) => {
  try {
    const authUser = c.get('user')

    const userMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.isActive, true),
        or(eq(matches.user1Id, authUser.userId), eq(matches.user2Id, authUser.userId))
      ),
    })

    const detailedMatches = await Promise.all(
      userMatches.map(async (m) => {
        const partnerId = m.user1Id === authUser.userId ? m.user2Id : m.user1Id
        const partner = await db.query.users.findFirst({
          where: eq(users.id, partnerId),
          with: {
            profile: true,
            photos: true,
          },
        })

        return {
          matchId: m.id,
          matchedAt: m.matchedAt,
          partner: {
            id: partner?.id,
            name: partner?.profile?.firstName || 'Match',
            age: partner?.profile?.age,
            city: partner?.profile?.city,
            photo: partner?.photos[0]?.url,
          },
        }
      })
    )

    return c.json({ matches: detailedMatches })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// GET /api/singles/likes — Users who liked current user
singlesRouter.get('/likes', async (c) => {
  try {
    const authUser = c.get('user')

    const incomingSwipes = await db.query.swipes.findMany({
      where: and(
        eq(swipes.targetId, authUser.userId),
        or(eq(swipes.direction, 'like'), eq(swipes.direction, 'super_like'))
      ),
      orderBy: [desc(swipes.createdAt)],
    })

    const likesList = await Promise.all(
      incomingSwipes.map(async (s) => {
        const swiper = await db.query.users.findFirst({
          where: eq(users.id, s.swiperId),
          with: {
            profile: true,
            photos: true,
          },
        })

        if (!swiper || !swiper.profile) return null

        return {
          id: swiper.id,
          name: swiper.profile.firstName,
          age: swiper.profile.age,
          city: swiper.profile.city,
          photo: swiper.photos[0]?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
          superLike: s.direction === 'super_like',
          createdAt: s.createdAt,
        }
      })
    )

    return c.json({ likes: likesList.filter(Boolean) })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/singles/unmatch — Deactivate a match
singlesRouter.post('/unmatch', async (c) => {
  try {
    const authUser = c.get('user')
    const { matchId } = await c.req.json()

    if (!matchId) {
      return c.json({ error: 'matchId is required' }, 400)
    }

    await db
      .update(matches)
      .set({ isActive: false })
      .where(
        and(
          eq(matches.id, matchId),
          or(eq(matches.user1Id, authUser.userId), eq(matches.user2Id, authUser.userId))
        )
      )

    return c.json({ success: true, message: 'Unmatched successfully' })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/singles/block — Block & optionally Report a user (persisted in DB + adjusts Trust Score)
singlesRouter.post('/block', async (c) => {
  try {
    const authUser = c.get('user')
    const { targetUserId, matchId, report, reason, details } = await c.req.json()

    if (!targetUserId) {
      return c.json({ error: 'targetUserId is required' }, 400)
    }

    // 1. Insert block if not already blocked
    const existingBlock = await db.query.userBlocks.findFirst({
      where: and(
        eq(userBlocks.blockerId, authUser.userId),
        eq(userBlocks.blockedId, targetUserId)
      ),
    })

    if (!existingBlock) {
      await db.insert(userBlocks).values({
        blockerId: authUser.userId,
        blockedId: targetUserId,
      })
    }

    // 2. Deactivate any matches between the two users
    await db
      .update(matches)
      .set({ isActive: false })
      .where(
        or(
          and(eq(matches.user1Id, authUser.userId), eq(matches.user2Id, targetUserId)),
          and(eq(matches.user1Id, targetUserId), eq(matches.user2Id, authUser.userId)),
          ...(matchId ? [eq(matches.id, matchId)] : [])
        )
      )

    // 3. Optionally record a safety report & lower reported user's vouchRating
    if (report) {
      await db.insert(userReports).values({
        reporterId: authUser.userId,
        reportedId: targetUserId,
        reason: reason || 'Safety concern',
        details: details || null,
      })

      const targetProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, targetUserId),
      })
      if (targetProfile) {
        const nextScore = Math.max(0, (targetProfile.vouchRating ?? 100) - 10)
        await db
          .update(profiles)
          .set({ vouchRating: nextScore, updatedAt: new Date() })
          .where(eq(profiles.userId, targetUserId))
      }
    }

    return c.json({
      success: true,
      message: report ? 'User blocked and safety report submitted.' : 'User blocked.',
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

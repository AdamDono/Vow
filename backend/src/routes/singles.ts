import { Hono } from 'hono'
import { db } from '../db/client.js'
import { users, profiles, userPhotos, userInterests, swipes, matches, conversations } from '../db/schema/index.js'
import { eq, ne, and, or, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'

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

    // Get IDs of users already swiped on by current user
    let swipedTargetIds: string[] = []
    if (!includeSwiped) {
      const mySwipes = await db.query.swipes.findMany({
        where: eq(swipes.swiperId, authUser.userId),
        columns: { targetId: true },
      })
      swipedTargetIds = mySwipes.map((s) => s.targetId)
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

    const filtered = candidates
      .filter((cand) => cand.profile !== null)
      .filter((cand) => {
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
      .map((c) => ({
        id: c.id,
        name: `${c.profile?.firstName || 'User'}`,
        age: c.profile?.age || 25,
        city: c.profile?.city || 'Johannesburg, SA',
        bio: c.profile?.bio || '',
        lookingFor: c.profile?.lookingFor || 'Long-term relationship',
        vouchRating: c.profile?.vouchRating || 95,
        isVerified: c.profile?.isVerified ?? true,
        photos: c.photos.map((p) => p.url),
        interests: c.interests.map((i) => i.interest),
      }))

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

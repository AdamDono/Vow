import { Hono } from 'hono'
import { db } from '../db/client.js'
import { users, profiles, userPhotos, userInterests, swipes, matches, conversations } from '../db/schema/index.js'
import { eq, ne, and, or } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'

export const singlesRouter = new Hono<AppEnv>()

// Require auth for all single endpoints
singlesRouter.use('*', authMiddleware)

// GET /api/singles/feed — Discovery Stack
singlesRouter.get('/feed', async (c) => {
  try {
    const authUser = c.get('user')

    // Find all single users except current user
    const candidates = await db.query.users.findMany({
      where: and(ne(users.id, authUser.userId), eq(users.relationshipStatus, 'single')),
      with: {
        profile: true,
        photos: true,
        interests: true,
      },
      limit: 20,
    })

    const feed = candidates
      .filter((c) => c.profile !== null)
      .map((c) => ({
        id: c.id,
        name: `${c.profile?.firstName || 'User'}`,
        age: c.profile?.age || 25,
        city: c.profile?.city || 'Cape Town, SA',
        bio: c.profile?.bio || '',
        lookingFor: c.profile?.lookingFor || 'Long-term relationship',
        vouchRating: c.profile?.vouchRating || 95,
        isVerified: c.profile?.isVerified ?? true,
        photos: c.photos.map((p) => p.url),
        interests: c.interests.map((i) => i.interest),
      }))

    return c.json({ feed })
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
            name: partner?.profile?.firstName,
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

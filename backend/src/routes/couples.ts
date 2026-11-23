import { Hono } from 'hono'
import { db } from '../db/client.js'
import {
  relationships,
  dailyCheckins,
  sharedGoals,
  timelineMilestones,
  conversations,
  messages,
  users,
  profiles,
} from '../db/schema/index.js'
import { eq, or, and, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'
import { emitToUser } from '../ws/hub.js'

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

    emitToUser(partnerId, {
      type: 'couple:checkin',
      revealed: shouldUnseal,
      harmonyScore: updatedHarmony,
    })

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

    emitToUser(partnerId, {
      type: 'couple:ended',
      relationshipId: relationship.id,
    })

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

// --- LIVE NEARBY DATE SPOTS (Free OpenStreetMap Overpass API + Curated Fallback) ---

interface DateSpot {
  id: string
  name: string
  category: 'dining' | 'coffee' | 'drinks' | 'outdoors'
  cuisine: string
  address: string
  city: string
  lat?: number
  lng?: number
  source: 'live_osm' | 'curated'
}

const CITY_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  'cape town': { lat: -33.9249, lng: 18.4241, label: 'Cape Town' },
  johannesburg: { lat: -26.2041, lng: 28.0473, label: 'Johannesburg' },
  durban: { lat: -29.8587, lng: 31.0218, label: 'Durban' },
  pretoria: { lat: -25.7479, lng: 28.2293, label: 'Pretoria' },
  london: { lat: 51.5072, lng: -0.1276, label: 'London' },
}

const CURATED_FALLBACKS: Record<string, DateSpot[]> = {
  'cape town': [
    { id: 'ct-1', name: 'Kloof Street House', category: 'dining', cuisine: 'Romantic Brasserie', address: '30 Kloof St, Gardens', city: 'Cape Town', lat: -33.9288, lng: 18.4136, source: 'curated' },
    { id: 'ct-2', name: 'Truth Coffee Roasting', category: 'coffee', cuisine: 'Artisan Coffee & Brunch', address: '36 Buitenkant St, CBD', city: 'Cape Town', lat: -33.9281, lng: 18.4227, source: 'curated' },
    { id: 'ct-3', name: 'Bouchon Bistro', category: 'drinks', cuisine: 'Wine Bar & Tapas', address: '95 Hout St, City Centre', city: 'Cape Town', lat: -33.9225, lng: 18.4173, source: 'curated' },
    { id: 'ct-4', name: 'Kirstenbosch Botanical Garden', category: 'outdoors', cuisine: 'Sunset Picnic & Walks', address: 'Rhodes Dr, Newlands', city: 'Cape Town', lat: -33.9881, lng: 18.4327, source: 'curated' },
    { id: 'ct-5', name: 'La Colombe', category: 'dining', cuisine: 'Fine Dining Tasting Menu', address: 'Silvermist Wine Estate, Constantia', city: 'Cape Town', lat: -34.0154, lng: 18.4046, source: 'curated' },
  ],
  johannesburg: [
    { id: 'jhb-1', name: 'Marble Restaurant', category: 'dining', cuisine: 'Live-Fire Dining & Views', address: 'Trumpet on Keyes, Rosebank', city: 'Johannesburg', lat: -26.1449, lng: 28.0394, source: 'curated' },
    { id: 'jhb-2', name: 'Father Coffee', category: 'coffee', cuisine: 'Specialty Espresso Bar', address: '73 Juta St, Braamfontein', city: 'Johannesburg', lat: -26.1925, lng: 28.0339, source: 'curated' },
    { id: 'jhb-3', name: 'Sin+Tax', category: 'drinks', cuisine: 'Craft Cocktail Lounge', address: 'Cnr Bolton & Jan Smuts, Rosebank', city: 'Johannesburg', lat: -26.1466, lng: 28.0407, source: 'curated' },
    { id: 'jhb-4', name: 'Walter Sisulu Botanical Garden', category: 'outdoors', cuisine: 'Waterfall Picnic & Trails', address: 'Malcolm Rd, Roodepoort', city: 'Johannesburg', lat: -26.0867, lng: 27.8442, source: 'curated' },
    { id: 'jhb-5', name: 'Saint Restaurant', category: 'dining', cuisine: 'Modern Italian', address: 'The Marc, Rivonia Rd, Sandton', city: 'Johannesburg', lat: -26.1072, lng: 28.0567, source: 'curated' },
  ],
  durban: [
    { id: 'dbn-1', name: 'The Chefs’ Table', category: 'dining', cuisine: 'Contemporary Seasonal Dining', address: '23 Protea Mall, Umhlanga', city: 'Durban', lat: -29.7267, lng: 31.0846, source: 'curated' },
    { id: 'dbn-2', name: 'Lineage Coffee', category: 'coffee', cuisine: 'Craft Coffee Roastery', address: 'Hillcrest & Morningside', city: 'Durban', lat: -29.8276, lng: 31.0169, source: 'curated' },
    { id: 'dbn-3', name: 'The Oyster Box Lighthouse Bar', category: 'drinks', cuisine: 'Oceanfront Sunset Cocktails', address: '2 Lighthouse Rd, Umhlanga', city: 'Durban', lat: -29.7279, lng: 31.0884, source: 'curated' },
    { id: 'dbn-4', name: 'Durban Botanic Gardens', category: 'outdoors', cuisine: 'Botanical Stroll & Picnic', address: '9A John Zikhali Rd, Berea', city: 'Durban', lat: -29.8466, lng: 31.0065, source: 'curated' },
  ],
}

const spotsCache = new Map<string, { expiresAt: number; spots: DateSpot[]; source: 'live_osm' | 'curated' }>()

function mapOsmAmenityToCategory(tags: Record<string, string>): DateSpot['category'] {
  if (tags.amenity === 'cafe') return 'coffee'
  if (tags.amenity === 'bar' || tags.amenity === 'pub' || tags.amenity === 'wine_bar') return 'drinks'
  if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.tourism === 'viewpoint') return 'outdoors'
  return 'dining'
}

async function fetchLiveOsmSpots(
  lat: number,
  lng: number,
  cityLabel: string,
  category: string,
  hasGps: boolean
): Promise<DateSpot[]> {
  const categoryQueries: Array<{ q: string; cat: DateSpot['category'] }> =
    category === 'dining'
      ? [{ q: 'restaurant', cat: 'dining' }]
      : category === 'coffee'
      ? [{ q: 'cafe', cat: 'coffee' }]
      : category === 'drinks'
      ? [{ q: 'bar', cat: 'drinks' }]
      : category === 'outdoors'
      ? [{ q: 'park', cat: 'outdoors' }]
      : [
          { q: 'restaurant', cat: 'dining' },
          { q: 'cafe', cat: 'coffee' },
          { q: 'bar', cat: 'drinks' },
          { q: 'park', cat: 'outdoors' },
        ]

  const delta = 0.09
  const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`
  const perQueryLimit = category === 'all' ? 5 : 15

  const seenNames = new Set<string>()
  const results: DateSpot[] = []

  await Promise.all(
    categoryQueries.map(async ({ q, cat }) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 7000)
      try {
        const params = new URLSearchParams({
          q: hasGps ? q : `${q} in ${cityLabel}`,
          format: 'json',
          addressdetails: '1',
          limit: String(perQueryLimit),
          viewbox,
          bounded: hasGps ? '1' : '0',
        })

        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: { 'User-Agent': 'VowRelationshipOS/1.0 (https://vow.app)' },
          signal: controller.signal,
        })

        if (!res.ok) return
        const items: any[] = await res.json()
        if (!Array.isArray(items)) return

        for (const item of items) {
          const name = (item.name || '').trim()
          if (!name || seenNames.has(name.toLowerCase())) continue
          seenNames.add(name.toLowerCase())

          const addr = item.address || {}
          const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
          const suburb = addr.suburb || addr.neighbourhood || addr.city || addr.town || cityLabel
          const formattedAddr = street ? `${street}, ${suburb}` : suburb

          const rawType = (item.type || '').replace(/_/g, ' ')
          const cuisineLabel =
            cat === 'coffee'
              ? 'Artisan Coffee & Cafe'
              : cat === 'drinks'
              ? 'Bar & Wine Lounge'
              : cat === 'outdoors'
              ? 'Park & Scenic Walk'
              : rawType && rawType !== 'restaurant'
              ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
              : 'Local Restaurant'

          results.push({
            id: `osm-${item.place_id}`,
            name,
            category: cat,
            cuisine: cuisineLabel,
            address: formattedAddr,
            city: addr.city || addr.town || cityLabel,
            lat: Number(item.lat),
            lng: Number(item.lon),
            source: 'live_osm',
          })
        }
      } catch {
        // ignore individual category timeout
      } finally {
        clearTimeout(timer)
      }
    })
  )

  return results
}

// GET /api/couples/date-spots — Free real nearby date spots via OpenStreetMap Overpass API
couplesRouter.get('/date-spots', async (c) => {
  try {
    const authUser = c.get('user')
    const rawCity = (c.req.query('city') || '').trim()
    const category = (c.req.query('category') || 'all').toLowerCase()
    const latParam = Number(c.req.query('lat'))
    const lngParam = Number(c.req.query('lng'))

    let cityLabel = rawCity
    if (!cityLabel) {
      const userProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, authUser.userId),
      })
      cityLabel = (userProfile?.city || 'Cape Town').split(',')[0].trim()
    }

    const cityKey = cityLabel.toLowerCase()
    const knownCity = Object.entries(CITY_COORDS).find(([k]) => cityKey.includes(k))

    let lat = !isNaN(latParam) && latParam !== 0 ? latParam : knownCity?.[1].lat
    let lng = !isNaN(lngParam) && lngParam !== 0 ? lngParam : knownCity?.[1].lng

    // Geocode unknown cities via free OpenStreetMap Nominatim
    if (!lat || !lng) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cityLabel)}`,
          { headers: { 'User-Agent': 'VowRelationshipOS/1.0' } }
        )
        if (nomRes.ok) {
          const nomData: any = await nomRes.json()
          if (nomData?.[0]) {
            lat = Number(nomData[0].lat)
            lng = Number(nomData[0].lon)
          }
        }
      } catch (_) {}
    }

    if (!lat || !lng) {
      lat = CITY_COORDS['cape town'].lat
      lng = CITY_COORDS['cape town'].lng
      cityLabel = 'Cape Town'
    }

    const cacheKey = `${lat.toFixed(2)}:${lng.toFixed(2)}:${category}`
    const cached = spotsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return c.json({ city: cityLabel, source: cached.source, spots: cached.spots })
    }

    const hasGps = !isNaN(latParam) && latParam !== 0 && !isNaN(lngParam) && lngParam !== 0
    const liveSpots = await fetchLiveOsmSpots(lat, lng, cityLabel, category, hasGps)
    if (liveSpots.length > 0) {
      spotsCache.set(cacheKey, {
        expiresAt: Date.now() + 10 * 60 * 1000,
        spots: liveSpots,
        source: 'live_osm',
      })
      return c.json({ city: cityLabel, source: 'live_osm', spots: liveSpots })
    }

    // Fallback to curated local spots if Overpass API times out or is rate-limited
    const fallbackPool =
      CURATED_FALLBACKS[knownCity?.[0] || 'cape town'] || CURATED_FALLBACKS['cape town']
    const filteredFallback =
      category === 'all' ? fallbackPool : fallbackPool.filter((s) => s.category === category)

    return c.json({
      city: knownCity?.[1].label || cityLabel,
      source: 'curated',
      spots: filteredFallback,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Could not load nearby date spots' }, 500)
  }
})

// POST /api/couples/date-spots/plan — Save planned date to Shared Vows + notify partner in Couple Chat
couplesRouter.post('/date-spots/plan', async (c) => {
  try {
    const authUser = c.get('user')
    const relationship = await getActiveRelationship(authUser.userId)
    if (!relationship) {
      return c.json({ error: 'No active relationship found' }, 404)
    }

    const { spotName, address, dateTimeLabel, note } = await c.req.json()
    if (!spotName) {
      return c.json({ error: 'spotName is required' }, 400)
    }

    const partnerId =
      relationship.partner1Id === authUser.userId
        ? relationship.partner2Id
        : relationship.partner1Id

    // 1. Add to Shared Vows / Upcoming Date Plans
    const [goal] = await db
      .insert(sharedGoals)
      .values({
        relationshipId: relationship.id,
        title: `Date Night: ${String(spotName).trim()}`,
        description: [dateTimeLabel, address, note].filter(Boolean).join(' • '),
        isCompleted: false,
      })
      .returning()

    // 2. Post a live message in their Private Vow Channel
    const coupleConv = await getOrCreateCoupleConversation(relationship.id)
    const msgText = `🍽️ Date Night Planned: ${spotName}${dateTimeLabel ? ` (${dateTimeLabel})` : ''}${address ? ` — ${address}` : ''}${note ? `\n"${note}"` : ''}`

    const [newMsg] = await db
      .insert(messages)
      .values({
        conversationId: coupleConv.id,
        senderId: authUser.userId,
        text: msgText,
        isRead: false,
      })
      .returning()

    // 3. Real-time push to partner over WebSockets
    emitToUser(partnerId, {
      type: 'chat:message',
      conversationId: coupleConv.id,
      message: newMsg,
    })

    return c.json({
      success: true,
      goal,
      message: newMsg,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Could not plan date night' }, 500)
  }
})

import { Hono } from 'hono'
import { db } from '../db/client.js'
import { users, profiles, userPhotos, userInterests } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'vow_super_secret_jwt_key_development_2026'

export const authRouter = new Hono<AppEnv>()

// POST /api/auth/signup
authRouter.post('/signup', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, firstName, lastName, age, gender, city, bio, lookingFor, photos, interests } = body

    if (!email || !password || !firstName) {
      return c.json({ error: 'Missing required signup fields' }, 400)
    }

    // Check existing user
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    })

    if (existing) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        relationshipStatus: 'single',
      })
      .returning()

    // Insert profile
    await db.insert(profiles).values({
      userId: newUser.id,
      firstName,
      lastName: lastName || '',
      age: Number(age) || 25,
      gender: gender || '',
      city: city || 'Cape Town, SA',
      bio: bio || '',
      lookingFor: lookingFor || 'Long-term relationship',
      vouchRating: 100,
    })

    // Insert photos if any
    if (Array.isArray(photos) && photos.length > 0) {
      await db.insert(userPhotos).values(
        photos.map((url: string, index: number) => ({
          userId: newUser.id,
          url,
          orderIndex: index,
          isPrimary: index === 0,
        }))
      )
    }

    // Insert interests if any
    if (Array.isArray(interests) && interests.length > 0) {
      await db.insert(userInterests).values(
        interests.map((interest: string) => ({
          userId: newUser.id,
          interest,
        }))
      )
    }

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '30d' })

    return c.json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        relationshipStatus: newUser.relationshipStatus,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
      with: {
        profile: true,
        photos: true,
        interests: true,
      },
    })

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        relationshipStatus: user.relationshipStatus,
        profile: user.profile,
        photos: user.photos,
        interests: user.interests,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500)
  }
})

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user')
  const user = await db.query.users.findFirst({
    where: eq(users.id, authUser.userId),
    with: {
      profile: true,
      photos: true,
      interests: true,
    },
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ user })
})

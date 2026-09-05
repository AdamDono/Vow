import { Hono } from 'hono'
import { db, client as sqlClient } from '../db/client.js'
import { users, profiles, userPhotos, userInterests } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
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

// POST /api/auth/google — 1-Tap Gmail / Google OAuth
authRouter.post('/google', async (c) => {
  try {
    const { email, name, firstName, lastName, photoUrl } = await c.req.json()

    if (!email) {
      return c.json({ error: 'Google email is required' }, 400)
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 1. Check if user already exists
    let user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
      with: {
        profile: true,
        photos: true,
        interests: true,
      },
    })

    let isNewUser = false

    // 2. If new user, register them in Neon
    if (!user) {
      isNewUser = true
      const randomPassword = crypto.randomBytes(32).toString('hex')
      const passwordHash = await bcrypt.hash(randomPassword, 6)

      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          relationshipStatus: 'single',
        })
        .returning()

      const parsedFirstName = firstName || (name ? name.split(' ')[0] : 'Google User')
      const parsedLastName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '')

      const [newProfile] = await db
        .insert(profiles)
        .values({
          userId: newUser.id,
          firstName: parsedFirstName,
          lastName: parsedLastName,
          age: 25,
          gender: 'Not specified',
          city: 'Cape Town, SA',
          bio: 'Joined via Google',
          lookingFor: 'Long-term relationship',
          vouchRating: 100,
          isVerified: true,
        })
        .returning()

      if (photoUrl) {
        await db.insert(userPhotos).values({
          userId: newUser.id,
          url: photoUrl,
          orderIndex: 0,
          isPrimary: true,
        })
      }

      user = await db.query.users.findFirst({
        where: eq(users.id, newUser.id),
        with: {
          profile: true,
          photos: true,
          interests: true,
        },
      })
    }

    if (!user) {
      return c.json({ error: 'Could not create or find Google user' }, 500)
    }

    // 3. Issue Vow JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })

    return c.json({
      success: true,
      token,
      isNewUser,
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

// POST /api/auth/neon-sync — Sync real Google account from Neon Auth into Vow database
authRouter.post('/neon-sync', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    let email = body.email
    let name = body.name
    let image = body.image
    const sessionToken = body.sessionToken

    // 1. If session token or nothing provided, inspect neon_auth tables
    if (sessionToken) {
      const sessionRows = await sqlClient`
        SELECT u.email, u.name, u.image 
        FROM neon_auth.session s
        JOIN neon_auth.user u ON s."userId" = u.id
        WHERE s.token = ${sessionToken}
        LIMIT 1
      `
      if (sessionRows.length > 0) {
        email = sessionRows[0].email
        name = sessionRows[0].name
        image = sessionRows[0].image
      }
    }

    // 2. Fallback to latest authenticated user in neon_auth.user
    if (!email) {
      const latestUserRows = await sqlClient`
        SELECT email, name, image 
        FROM neon_auth.user 
        ORDER BY "createdAt" DESC 
        LIMIT 1
      `
      if (latestUserRows.length > 0) {
        email = latestUserRows[0].email
        name = latestUserRows[0].name
        image = latestUserRows[0].image
      }
    }

    if (!email) {
      return c.json({ error: 'No authenticated Neon/Google account found' }, 404)
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 3. Find or create in public.users
    let user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
      with: {
        profile: true,
        photos: true,
        interests: true,
      },
    })

    let isNewUser = false

    if (!user) {
      isNewUser = true
      const randomPassword = crypto.randomBytes(32).toString('hex')
      const passwordHash = await bcrypt.hash(randomPassword, 6)

      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          relationshipStatus: 'single',
        })
        .returning()

      const parsedFirstName = name ? name.split(' ')[0] : 'Google User'
      const parsedLastName = name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : ''

      const [newProfile] = await db
        .insert(profiles)
        .values({
          userId: newUser.id,
          firstName: parsedFirstName,
          lastName: parsedLastName,
          age: 25,
          gender: 'Not specified',
          city: 'Cape Town, SA',
          bio: 'Joined via Google OAuth',
          lookingFor: 'Long-term relationship',
          vouchRating: 100,
          isVerified: true,
        })
        .returning()

      if (image) {
        await db.insert(userPhotos).values({
          userId: newUser.id,
          url: image,
          orderIndex: 0,
          isPrimary: true,
        })
      }

      user = await db.query.users.findFirst({
        where: eq(users.id, newUser.id),
        with: {
          profile: true,
          photos: true,
          interests: true,
        },
      })
    }

    if (!user) {
      return c.json({ error: 'Failed to sync user from Neon Auth' }, 500)
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })

    return c.json({
      success: true,
      token,
      isNewUser,
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


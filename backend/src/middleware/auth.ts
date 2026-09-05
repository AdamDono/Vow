import { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'
import { AuthUser, AppEnv } from '../types/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'vow_super_secret_jwt_key_development_2026'

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    c.set('user', decoded)
    await next()
  } catch (err) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401)
  }
}

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import * as dotenv from 'dotenv'
import { authRouter } from './routes/auth.js'
import { singlesRouter } from './routes/singles.js'
import { couplesRouter } from './routes/couples.js'
import { proposalsRouter } from './routes/proposals.js'
import { chatRouter } from './routes/chat.js'
import { uploadRouter } from './routes/upload.js'
import { serveStatic } from '@hono/node-server/serve-static'

dotenv.config()

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Serve local uploaded images statically
app.use('/uploads/*', serveStatic({ root: './' }))

// Healthcheck
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Vow Backend API',
    database: 'Neon Postgres (Serverless)',
    time: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return c.json({
    name: 'Vow - The Relationship Operating System API',
    version: '1.0.0',
    docs: {
      health: '/health',
      auth: '/api/auth',
      upload: '/api/upload',
      singles: '/api/singles',
      couples: '/api/couples',
      proposals: '/api/proposals',
      chat: '/api/chat',
    },
  })
})

// Mount routers
app.route('/api/auth', authRouter)
app.route('/api/upload', uploadRouter)
app.route('/api/singles', singlesRouter)
app.route('/api/couples', couplesRouter)
app.route('/api/proposals', proposalsRouter)
app.route('/api/chat', chatRouter)

const port = Number(process.env.PORT) || 3001

console.log(`🌸 Vow Backend API server starting on http://localhost:${port}`)
serve({
  fetch: app.fetch,
  port,
})

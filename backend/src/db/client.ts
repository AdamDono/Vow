import { neon, neonConfig, Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema/index.js'
import * as dotenv from 'dotenv'
import ws from 'ws'

dotenv.config()

// Required for neon websocket connections in Node.js environments
neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL || ''

// Create Neon serverless pool
export const pool = new Pool({ connectionString })

// Export Drizzle database client with schema
export const db = drizzle(pool, { schema })

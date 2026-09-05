import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema/index.js'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL || ''

// Direct Postgres connection with SSL
export const client = postgres(connectionString, {
  ssl: 'require',
  max: 10,
})

export const db = drizzle(client, { schema })

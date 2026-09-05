import { migrate } from 'drizzle-orm/neon-http/migrator'
import { db } from './client.js'

async function runMigration() {
  console.log('🚀 Running Drizzle migrations on Neon Postgres over HTTP...')
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('✅ Migrations applied successfully to Neon Postgres!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()

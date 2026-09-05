import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, client } from './client.js'

async function runMigration() {
  console.log('🚀 Running Drizzle migrations on Neon Postgres...')
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('✅ Migrations applied successfully to Neon Postgres!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
    process.exit(0)
  }
}

runMigration()

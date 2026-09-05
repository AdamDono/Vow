import postgres from 'postgres'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const connectionString = process.env.DATABASE_URL || ''
const sql = postgres(connectionString, { ssl: 'require', max: 1 })

async function initSchema() {
  console.log('⚡ Initializing complete Vow database schema on Neon...')
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql')
  const schemaSql = fs.readFileSync(schemaPath, 'utf8')

  // Execute schema directly
  await sql.unsafe(schemaSql)

  console.log('✅ Neon Postgres database schema created successfully!')
  await sql.end()
  process.exit(0)
}

initSchema().catch((err) => {
  console.error('❌ Init failed:', err)
  process.exit(1)
})

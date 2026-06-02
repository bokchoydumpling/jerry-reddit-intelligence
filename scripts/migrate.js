#!/usr/bin/env node
// Runs the initial schema migration against Supabase
// Usage: node scripts/migrate.js
// Requires: DATABASE_URL in .env.local OR as env var

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error(`
ERROR: DATABASE_URL not found.

To get your database URL:
1. Go to https://supabase.com/dashboard/project/ipyzqrazbvecyfskodpu
2. Click Settings → Database
3. Copy the "Connection string" (URI format, Session mode)
4. Add it to .env.local as: DATABASE_URL=<paste here>
5. Run this script again: node scripts/migrate.js
`)
    process.exit(1)
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log('✓ Connected to database')

    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql'),
      'utf8'
    )

    await client.query(sql)
    console.log('✓ Schema migration applied successfully')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

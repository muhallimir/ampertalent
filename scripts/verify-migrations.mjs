#!/usr/bin/env node
/**
 * verify-migrations.mjs
 *
 * Runs AFTER `prisma migrate deploy` in the build step.
 * Queries the live database directly to confirm every expected column exists.
 * If anything is missing → exits with code 1, which fails the Vercel build immediately.
 *
 * Why this matters:
 *  - `prisma migrate deploy` uses DATABASE_URL. When that URL points to a pgbouncer
 *    pooler (Supabase default), DDL transactions are silently skipped / rolled back.
 *  - Without this guard you get a green build but a broken prod database.
 */

import pg from 'pg'

const { Client } = pg

// Prefer DIRECT_URL (bypasses pgbouncer) for the verification query.
// Falls back to DATABASE_URL if DIRECT_URL is not set.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ verify-migrations: neither DIRECT_URL nor DATABASE_URL is set')
  process.exit(1)
}

/**
 * List of { table, column } pairs that MUST exist after all migrations have run.
 * Add a new entry here whenever you create a migration that adds a column.
 */
const REQUIRED_COLUMNS = [
  // Migration: 20260425000000_add_stripe_customer_id
  { table: 'employers',   column: 'stripe_customer_id' },
  { table: 'job_seekers', column: 'stripe_customer_id' },

  // Core columns — if these are missing the DB is completely wrong
  { table: 'user_profiles', column: 'clerk_user_id' },
  { table: 'user_profiles', column: 'role' },
  { table: 'employers',     column: 'user_id' },
  { table: 'job_seekers',   column: 'user_id' },
]

async function main() {
  const client = new Client({ connectionString })
  await client.connect()

  console.log('🔍 verify-migrations: checking required columns...')

  const missing = []

  for (const { table, column } of REQUIRED_COLUMNS) {
    const res = await client.query(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = $1
          AND column_name  = $2`,
      [table, column]
    )
    if (res.rowCount === 0) {
      missing.push(`${table}.${column}`)
    }
  }

  await client.end()

  if (missing.length > 0) {
    console.error('❌ verify-migrations: MISSING COLUMNS DETECTED — migrations did not apply!')
    console.error('   Missing:', missing.join(', '))
    console.error('')
    console.error('   HINT: Make sure DIRECT_URL in Vercel points to the Supabase direct')
    console.error('   connection (db.<project>.supabase.co:5432), NOT the pgbouncer pooler.')
    console.error('   The pooler URL prevents DDL from running inside transactions.')
    process.exit(1)
  }

  console.log(`✅ verify-migrations: all ${REQUIRED_COLUMNS.length} required columns present`)
  process.exit(0)
}

main().catch(err => {
  console.error('❌ verify-migrations: unexpected error:', err.message)
  process.exit(1)
})

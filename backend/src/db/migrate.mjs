import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATION_NAME = /^\d{4}_[a-z0-9_-]+\.sql$/
const MIGRATION_LOCK_ID = '782341064'
const migrationsDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url))

function getMigrationConnectionOptions(env) {
  const connectionString = env.DATABASE_MIGRATION_URL
  if (typeof connectionString !== 'string' || connectionString.trim() === '') {
    throw new Error('DATABASE_MIGRATION_URL must be configured with the separate migration database role.')
  }
  if (env.NODE_ENV === 'production' && env.DATABASE_SSL !== 'require') {
    throw new Error('DATABASE_SSL=require is required in production.')
  }
  return {
    connectionString,
    ssl: env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false,
  }
}

async function listMigrationFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && MIGRATION_NAME.test(entry.name))
    .map((entry) => entry.name)
    .sort()
}

async function getMigrationRows(client) {
  const result = await client.query("SELECT to_regclass('public.schema_migrations') AS table_name")
  if (!result.rows[0]?.table_name) return new Map()
  const applied = await client.query('SELECT name, checksum FROM public.schema_migrations')
  return new Map(applied.rows.map((row) => [row.name, row.checksum]))
}

export async function migrateDatabase({ env = process.env, directory = migrationsDirectory } = {}) {
  const { Client } = await import('pg')
  const client = new Client(getMigrationConnectionOptions(env))
  let lockHeld = false
  try {
    await client.connect()
    await client.query('SELECT pg_advisory_lock($1::bigint)', [MIGRATION_LOCK_ID])
    lockHeld = true
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        name text PRIMARY KEY,
        checksum char(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    const applied = await getMigrationRows(client)
    for (const name of await listMigrationFiles(directory)) {
      const sql = await readFile(join(directory, name), 'utf8')
      const checksum = createHash('sha256').update(sql).digest('hex')
      if (applied.has(name)) {
        if (applied.get(name).trim() !== checksum) {
          throw new Error(`Applied migration ${name} has changed; add a new migration instead.`)
        }
        continue
      }

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum])
        await client.query('COMMIT')
      } catch (error) {
        try { await client.query('ROLLBACK') } catch { /* Preserve the migration error. */ }
        throw error
      }
      console.log(`Applied database migration ${name}`)
    }
  } finally {
    if (lockHeld) {
      try { await client.query('SELECT pg_advisory_unlock($1::bigint)', [MIGRATION_LOCK_ID]) } catch { /* Closing releases the lock. */ }
    }
    await client.end()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrateDatabase().catch((error) => {
    console.error(`Database migrations failed: ${error.message}`)
    process.exitCode = 1
  })
}

/** Create the application pool. Production database connections must verify TLS. */
export async function createDatabasePool({ env = process.env, connectionString = env.DATABASE_URL } = {}) {
  if (typeof connectionString !== 'string' || connectionString.trim() === '') {
    throw new Error('DATABASE_URL must be configured for database access.')
  }
  if (env.NODE_ENV === 'production' && env.DATABASE_SSL !== 'require') {
    throw new Error('DATABASE_SSL=require is required in production.')
  }

  const { Pool } = await import('pg')
  return new Pool({
    connectionString,
    ssl: env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
}

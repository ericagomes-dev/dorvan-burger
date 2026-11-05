import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { migrateDatabase } from '../src/db/migrate.mjs'
import { createDatabasePool } from '../src/db/pool.mjs'

const migration = readFileSync(resolve(import.meta.dirname, '../migrations/0001_tenant_core.sql'), 'utf8')
const runtimeGrants = readFileSync(resolve(import.meta.dirname, '../scripts/grant-runtime-permissions.sql'), 'utf8')
const frontendMenu = readFileSync(resolve(import.meta.dirname, '../../frontend/src/data/menu.ts'), 'utf8')

test('baseline models one independent store installation', () => {
  for (const table of [
    'store_settings', 'admin_users', 'categories', 'products', 'modifier_groups',
    'modifier_options', 'product_modifier_groups', 'orders', 'order_items',
    'order_item_options', 'order_status_events',
  ]) {
    assert.ok(migration.includes(`CREATE TABLE public.${table} (`), `missing table ${table}`)
  }

  assert.match(migration, /id smallint PRIMARY KEY DEFAULT 1 CHECK \(id = 1\)/)
  assert.match(migration, /VALUES\s*\(1, 'dorvan-burger', 'Dorvan Burger', 'active', true, 'BRL', 'America\/Sao_Paulo', 800\)/)
  assert.match(frontendMenu, /DELIVERY_FEE_CENTS\s*=\s*800/)
  assert.match(migration, /idempotency_key text NOT NULL UNIQUE/)
  assert.match(migration, /payment_status text NOT NULL DEFAULT 'not_charged' CHECK \(payment_status = 'not_charged'\)/)
  assert.doesNotMatch(migration, /\bestablishment_id\b|\bmemberships\b|\bCREATE\s+POLICY\b|\bROW LEVEL SECURITY\b/i)
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i)
})

test('single-store product, modifier, order, and history relations retain integrity', () => {
  assert.match(migration, /category_id uuid NOT NULL REFERENCES public\.categories\(id\) ON DELETE RESTRICT/)
  assert.match(migration, /group_id uuid NOT NULL REFERENCES public\.modifier_groups\(id\) ON DELETE RESTRICT/)
  assert.match(migration, /product_id uuid NOT NULL REFERENCES public\.products\(id\) ON DELETE RESTRICT/)
  assert.match(migration, /order_id uuid NOT NULL REFERENCES public\.orders\(id\) ON DELETE RESTRICT/)
  assert.match(migration, /product_id uuid NOT NULL REFERENCES public\.products\(id\) ON DELETE RESTRICT/)
  assert.match(migration, /actor_user_id uuid REFERENCES public\.admin_users\(id\) ON DELETE RESTRICT/)
})

test('runtime privileges are limited for one installation', () => {
  assert.match(runtimeGrants, /REVOKE CREATE ON SCHEMA public FROM PUBLIC/)
  assert.match(runtimeGrants, /GRANT USAGE ON SCHEMA public TO dorvan_app/)
  assert.match(runtimeGrants, /GRANT SELECT ON public\.store_settings TO dorvan_app/)
  assert.match(runtimeGrants, /GRANT UPDATE \(status, updated_at\) ON public\.orders TO dorvan_app/)
  assert.match(runtimeGrants, /REVOKE ALL PRIVILEGES ON public\.admin_users FROM dorvan_app/)
  assert.match(runtimeGrants, /REVOKE ALL PRIVILEGES ON public\.schema_migrations FROM dorvan_app/)
  assert.doesNotMatch(runtimeGrants, /GRANT\s+ALL\b|\bDELETE\b|\bTRUNCATE\b|\bREFERENCES\b/i)
})

test('database startup requires a URL and verified TLS in production', async () => {
  await assert.rejects(createDatabasePool({ env: {} }), /DATABASE_URL must be configured/)
  await assert.rejects(
    createDatabasePool({ env: { NODE_ENV: 'production', DATABASE_URL: 'postgres://127.0.0.1/dorvan' } }),
    /DATABASE_SSL=require is required in production/,
  )
})

test('migration runner requires a separate migration connection URL', async () => {
  await assert.rejects(migrateDatabase({ env: {} }), /DATABASE_MIGRATION_URL must be configured/)
})


import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

async function expectDatabaseError(client, sql, values, expectedCode, savepoint) {
  await client.query(`SAVEPOINT ${savepoint}`)
  await assert.rejects(client.query(sql, values), (error) => error.code === expectedCode)
  await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`)
  await client.query(`RELEASE SAVEPOINT ${savepoint}`)
}

test('single-store PostgreSQL schema preserves the Dorvan catalog, order relations, and runtime limits', {
  skip: testDatabaseUrl ? false : 'Set TEST_DATABASE_URL to the dedicated local dorvan_phase1_test database.',
}, async () => {
  const connection = new URL(testDatabaseUrl)
  const databaseName = decodeURIComponent(connection.pathname.slice(1))
  if (databaseName !== 'dorvan_phase1_test'
    || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(connection.hostname)) {
    throw new Error('TEST_DATABASE_URL must target local dorvan_phase1_test only.')
  }

  const { Client } = await import('pg')
  const client = new Client({ connectionString: testDatabaseUrl })
  await client.connect()

  const categoryId = randomUUID()
  const productId = randomUUID()
  const modifierGroupId = randomUUID()
  const modifierOptionId = randomUUID()
  const orderId = randomUUID()
  const itemId = randomUUID()
  const itemOptionId = randomUUID()

  try {
    await client.query('BEGIN')

    const runtimeRole = await client.query(`
      SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolcreatedb,
             r.rolcreaterole, r.rolreplication, r.rolinherit, r.rolcanlogin,
             (SELECT count(*) FROM pg_auth_members m WHERE m.member = r.oid) AS granted_roles
      FROM pg_roles r
      WHERE r.rolname = current_user
    `)
    assert.equal(runtimeRole.rows.length, 1)
    assert.equal(runtimeRole.rows[0].rolname, 'dorvan_app')
    assert.equal(runtimeRole.rows[0].rolsuper, false)
    assert.equal(runtimeRole.rows[0].rolbypassrls, false)
    assert.equal(runtimeRole.rows[0].rolcreatedb, false)
    assert.equal(runtimeRole.rows[0].rolcreaterole, false)
    assert.equal(runtimeRole.rows[0].rolreplication, false)
    assert.equal(runtimeRole.rows[0].rolinherit, false)
    assert.equal(runtimeRole.rows[0].rolcanlogin, true)
    assert.equal(Number(runtimeRole.rows[0].granted_roles), 0)

    const tables = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `)
    const tableNames = new Set(tables.rows.map(({ tablename }) => tablename))
    for (const table of [
      'store_settings', 'admin_users', 'categories', 'products', 'modifier_groups',
      'modifier_options', 'product_modifier_groups', 'orders', 'order_items',
      'order_item_options', 'order_status_events',
    ]) assert.ok(tableNames.has(table), `missing single-store table ${table}`)
    assert.equal(tableNames.has('establishments'), false)
    assert.equal(tableNames.has('memberships'), false)

    const tenantColumns = await client.query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'establishment_id'
    `)
    assert.deepEqual(tenantColumns.rows, [])
    const tenantFunction = await client.query("SELECT to_regprocedure('public.current_establishment_id()') AS function_name")
    assert.equal(tenantFunction.rows[0].function_name, null)

    const rlsState = await client.query(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('products', 'orders')
    `)
    assert.equal(rlsState.rows.length, 2)
    for (const table of rlsState.rows) {
      assert.equal(table.relrowsecurity, false, `${table.relname} should not carry unused tenant RLS`)
      assert.equal(table.relforcerowsecurity, false)
    }

    const store = await client.query('SELECT id, slug, name, delivery_fee_cents FROM public.store_settings')
    assert.deepEqual(store.rows, [{
      id: 1,
      slug: 'dorvan-burger',
      name: 'Dorvan Burger',
      delivery_fee_cents: 800,
    }])

    const privileges = await client.query(`
      SELECT has_table_privilege(current_user, 'public.admin_users', 'SELECT') AS can_read_admin_users,
             has_table_privilege(current_user, 'public.orders', 'DELETE') AS can_delete_orders,
             has_table_privilege(current_user, 'public.orders', 'TRUNCATE') AS can_truncate_orders,
             has_column_privilege(current_user, 'public.orders', 'status', 'UPDATE') AS can_update_status,
             has_column_privilege(current_user, 'public.orders', 'customer_name', 'UPDATE') AS can_update_customer,
             has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_objects
    `)
    assert.deepEqual(privileges.rows[0], {
      can_read_admin_users: false,
      can_delete_orders: false,
      can_truncate_orders: false,
      can_update_status: true,
      can_update_customer: false,
      can_create_objects: false,
    })

    await client.query(
      'INSERT INTO public.categories (id, slug, name) VALUES ($1, $2, $3)',
      [categoryId, `test-category-${categoryId.slice(0, 8)}`, 'Temporary category'],
    )
    await client.query(
      `INSERT INTO public.products (id, category_id, slug, name, price_cents, customizable)
       VALUES ($1, $2, $3, $4, 1250, true)`,
      [productId, categoryId, `test-product-${productId.slice(0, 8)}`, 'Temporary product'],
    )
    await client.query(
      'INSERT INTO public.modifier_groups (id, name, min_select, max_select) VALUES ($1, $2, 0, 1)',
      [modifierGroupId, 'Temporary modifiers'],
    )
    await client.query(
      `INSERT INTO public.modifier_options
       (id, group_id, slug, name, price_delta_cents)
       VALUES ($1, $2, $3, $4, 250)`,
      [modifierOptionId, modifierGroupId, `test-extra-${modifierOptionId.slice(0, 8)}`, 'Temporary extra'],
    )
    await client.query(
      'INSERT INTO public.product_modifier_groups (product_id, group_id) VALUES ($1, $2)',
      [productId, modifierGroupId],
    )
    await client.query(
      `INSERT INTO public.orders
         (id, public_order_number, idempotency_key, fulfillment_type, customer_name,
          subtotal_cents, delivery_fee_cents, total_cents)
       VALUES ($1, $2, $3, 'delivery', 'Temporary customer', 1250, 800, 2050)`,
      [orderId, `TEST-${orderId.slice(0, 8)}`, randomUUID().replaceAll('-', '')],
    )
    await client.query(
      `INSERT INTO public.order_items
         (id, order_id, product_id, product_name_snapshot, unit_price_cents, quantity, line_total_cents)
       VALUES ($1, $2, $3, 'Temporary product', 1250, 1, 1250)`,
      [itemId, orderId, productId],
    )
    await client.query(
      `INSERT INTO public.order_item_options
         (id, order_item_id, modifier_option_id, option_name_snapshot, price_delta_cents)
       VALUES ($1, $2, $3, 'Temporary extra', 250)`,
      [itemOptionId, itemId, modifierOptionId],
    )
    await client.query(
      `INSERT INTO public.order_status_events (id, order_id, from_status, to_status)
       VALUES ($1, $2, NULL, 'pending')`,
      [randomUUID(), orderId],
    )

    const orderHistory = await client.query(`
      SELECT o.delivery_fee_cents, o.total_cents, p.name,
             i.quantity, option.option_name_snapshot, event.to_status
      FROM public.orders o
      JOIN public.order_items i ON i.order_id = o.id
      JOIN public.products p ON p.id = i.product_id
      JOIN public.order_item_options option ON option.order_item_id = i.id
      JOIN public.order_status_events event ON event.order_id = o.id
      WHERE o.id = $1
    `, [orderId])
    assert.deepEqual(orderHistory.rows, [{
      delivery_fee_cents: 800,
      total_cents: 2050,
      name: 'Temporary product',
      quantity: 1,
      option_name_snapshot: 'Temporary extra',
      to_status: 'pending',
    }])

    await expectDatabaseError(client, `
      INSERT INTO public.products (id, category_id, slug, name, price_cents)
      VALUES ($1, $2, $3, 'Invalid category', 100)
    `, [randomUUID(), randomUUID(), `bad-category-${randomUUID().slice(0, 8)}`], '23503', 'single_store_fk')
    await expectDatabaseError(client,
      'UPDATE public.orders SET customer_name = $1 WHERE id = $2',
      ['Blocked rewrite', orderId], '42501', 'order_pii_update')

    const statusUpdate = await client.query(
      "UPDATE public.orders SET status = 'accepted' WHERE id = $1",
      [orderId],
    )
    assert.equal(statusUpdate.rowCount, 1)
  } finally {
    try { await client.query('ROLLBACK') } catch { /* The transaction may already have rolled back. */ }
    await client.end()
  }
})

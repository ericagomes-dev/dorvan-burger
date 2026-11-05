
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import {
  DEMO_NOTICE,
  PRODUCTION_BLOCKED_NOTICE,
  resolvePaymentsPolicy,
  validateProductionRequirements,
} from '../src/payment-policy.mjs'
import { createDatabasePool } from '../src/db/pool.mjs'
import { createApiServer } from '../src/server.mjs'

const projectRoot = resolve(import.meta.dirname, '../..')

function getTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL

  assert.ok(
    value,
    'Configure TEST_DATABASE_URL para o banco local de testes.',
  )

  const url = new URL(value)

  assert.ok(
    ['localhost', '127.0.0.1', '::1'].includes(url.hostname),
    'Os testes só podem gravar em um banco local.',
  )

  assert.equal(
    decodeURIComponent(url.pathname.slice(1)),
    'dorvan_phase1_test',
    'Os testes só podem gravar no banco dorvan_phase1_test.',
  )

  return value
}

async function withApi(env, run, { database = false } = {}) {
  const pool = database
    ? await createDatabasePool({
        env: { ...env, NODE_ENV: 'test' },
        connectionString: getTestDatabaseUrl(),
      })
    : null

  const server = createApiServer({ env, pool })

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const { port } = server.address()

    await run(`http://127.0.0.1:${port}`, pool)
  } finally {
    server.closeAllConnections()

    if (server.listening) {
      await new Promise((resolve) => server.close(resolve))
    }

    await pool?.end()
  }
}

const jsonPost = (url, body, idempotencyKey = crypto.randomUUID()) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })

function validCheckout() {
  return {
    mode: 'demo',
    fulfillment: 'delivery',
    paymentMethod: 'pix',
    customer: {
      name: 'Cliente de teste',
      phone: '21999990000',
      address: 'Rua de Teste, 123',
      reference: 'Portão azul',
      notes: 'Pedido de teste automatizado',
    },
    items: [
      {
        id: 'classico-double',
        quantity: 1,
        addOnIds: [],
        removedIngredients: [],
        note: '',
      },
    ],
  }
}

async function assertCheckoutCreated(response) {
  const body = await response.json()

  assert.equal(
    response.status,
    201,
    `Checkout deveria retornar 201. Resposta recebida: ${JSON.stringify(body)}`,
  )

  return body
}

test('missing PAYMENTS_MODE defaults to demo and production requirements fail closed', () => {
  const policy = resolvePaymentsPolicy({})

  assert.equal(policy.mode, 'demo')
  assert.equal(policy.productionReady, false)
  assert.equal(validateProductionRequirements({}).ready, false)
})

test('production URL validation rejects HTTP, local hosts, and cross-origin return URLs', () => {
  const result = validateProductionRequirements({
    NODE_ENV: 'production',
    PUBLIC_BASE_URL: 'http://localhost:5173',
    MP_WEBHOOK_URL: 'http://localhost:8787/api/payments/mercado-pago/webhook',
    MP_SUCCESS_URL: 'https://another.invalid/ok',
    MP_FAILURE_URL: 'http://localhost/fail',
    MP_PENDING_URL: 'http://localhost/pending',
  })

  assert.equal(result.ready, false)
  assert.equal(result.checks.publicBaseUrlIsHttps, false)
  assert.equal(result.checks.productionWebhookUrlIsHttpsAndSameOrigin, false)
  assert.equal(result.checks.backUrlsAreHttpsAndSameOrigin, false)
})

test('VITE_* and invalid public mode values cannot enable production', () => {
  assert.equal(
    resolvePaymentsPolicy({ VITE_PAYMENTS_MODE: 'production' }).mode,
    'demo',
  )

  assert.equal(
    resolvePaymentsPolicy({ PAYMENTS_MODE: 'live' }).mode,
    'demo',
  )

  assert.equal(
    resolvePaymentsPolicy({
      PAYMENTS_MODE: 'production',
      NODE_ENV: 'development',
    }).mode,
    'demo',
  )
})

test('checkout without a database does not create a fake order', async () => {
  await withApi({}, async (baseUrl) => {
    const response = await jsonPost(
      `${baseUrl}/api/checkout`,
      validCheckout(),
    )

    assert.equal(response.status, 503)
  })
})

test('demo checkout persists an order and calculates its total using database prices', async () => {
  await withApi(
    {},
    async (baseUrl, pool) => {
      const productResult = await pool.query(
        `SELECT p.id, p.price_cents
         FROM public.products p
         WHERE p.slug = $1 AND p.active = true`,
        ['classico-double'],
      )

      assert.equal(productResult.rowCount, 1)

      const storeResult = await pool.query(
        `SELECT delivery_fee_cents
         FROM public.store_settings
         WHERE id = 1`,
      )

      assert.equal(storeResult.rowCount, 1)

      const product = productResult.rows[0]
      const deliveryFee = storeResult.rows[0].delivery_fee_cents
      const expectedTotal = product.price_cents + deliveryFee
      const idempotencyKey = crypto.randomUUID()

      const response = await jsonPost(
        `${baseUrl}/api/checkout`,
        validCheckout(),
        idempotencyKey,
      )

      const body = await assertCheckoutCreated(response)

      assert.equal(body.mode, 'demo')
      assert.equal(body.paymentStatus, 'not_charged')
      assert.ok(body.orderId)
      assert.equal(body.totalCents, expectedTotal)
      assert.equal('payment' in body, false)

      const orderResult = await pool.query(
        `SELECT id, customer_name, customer_phone,
                delivery_address, delivery_reference,
                subtotal_cents, delivery_fee_cents,
                total_cents, payment_method, payment_status,
                status, fulfillment_type
         FROM public.orders
         WHERE idempotency_key = $1`,
        [idempotencyKey],
      )

      assert.equal(orderResult.rowCount, 1)

      const order = orderResult.rows[0]

      assert.equal(order.customer_name, 'Cliente de teste')
      assert.equal(order.customer_phone, '21999990000')
      assert.equal(order.delivery_address, 'Rua de Teste, 123')
      assert.equal(order.delivery_reference, 'Portão azul')
      assert.equal(order.subtotal_cents, product.price_cents)
      assert.equal(order.delivery_fee_cents, deliveryFee)
      assert.equal(order.total_cents, expectedTotal)
      assert.equal(order.payment_method, 'pix')
      assert.equal(order.payment_status, 'not_charged')
      assert.equal(order.status, 'pending')
      assert.equal(order.fulfillment_type, 'delivery')

      const itemResult = await pool.query(
        `SELECT product_name_snapshot, quantity, unit_price_cents,
                line_total_cents, removed_ingredients, item_note
         FROM public.order_items
         WHERE order_id = $1`,
        [order.id],
      )

      assert.equal(itemResult.rowCount, 1)
      assert.equal(itemResult.rows[0].quantity, 1)
      assert.equal(itemResult.rows[0].unit_price_cents, product.price_cents)
      assert.equal(itemResult.rows[0].line_total_cents, product.price_cents)

      const eventResult = await pool.query(
        `SELECT from_status, to_status
         FROM public.order_status_events
         WHERE order_id = $1`,
        [order.id],
      )

      assert.equal(eventResult.rowCount, 1)
      assert.equal(eventResult.rows[0].from_status, null)
      assert.equal(eventResult.rows[0].to_status, 'pending')
    },
    { database: true },
  )
})

test('repeating the same idempotency key does not create a second order', async () => {
  await withApi(
    {},
    async (baseUrl, pool) => {
      const idempotencyKey = crypto.randomUUID()

      const first = await jsonPost(
        `${baseUrl}/api/checkout`,
        validCheckout(),
        idempotencyKey,
      )

      const firstBody = await assertCheckoutCreated(first)

      const second = await jsonPost(
        `${baseUrl}/api/checkout`,
        validCheckout(),
        idempotencyKey,
      )

      const secondBody = await second.json()

      assert.equal(
        second.status,
        200,
        `A segunda chamada deveria reutilizar o pedido. Resposta: ${JSON.stringify(secondBody)}`,
      )

      assert.equal(secondBody.orderId, firstBody.orderId)

      const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM public.orders
         WHERE idempotency_key = $1`,
        [idempotencyKey],
      )

      assert.equal(result.rows[0].count, 1)
    },
    { database: true },
  )
})

test('checkout rejects production mode and browser-controlled prices', async () => {
  const validItem = validCheckout().items[0]

  const invalidPayloads = [
    { ...validCheckout(), mode: 'production' },
    { ...validCheckout(), payment: 'pix' },
    {
      ...validCheckout(),
      items: [{ ...validItem, priceCents: 1 }],
    },
    {
      ...validCheckout(),
      items: [{ ...validItem, id: 'produto inexistente' }],
    },
    {
      ...validCheckout(),
      items: [{ ...validItem, quantity: 0 }],
    },
    {
      ...validCheckout(),
      items: [{ ...validItem, quantity: 21 }],
    },
    {
      items: [{ id: 'classico-double', quantity: 1 }],
    },
  ]

  await withApi({}, async (baseUrl) => {
    for (const payload of invalidPayloads) {
      const response = await jsonPost(
        `${baseUrl}/api/checkout`,
        payload,
      )

      assert.equal(response.status, 400)

      assert.deepEqual(await response.json(), {
        error: 'Invalid demo checkout request.',
      })
    }
  })
})

test('checkout rejects malformed and oversized request bodies', async () => {
  await withApi({}, async (baseUrl) => {
    const malformed = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })

    assert.equal(malformed.status, 400)

    const oversized = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ' '.repeat(24 * 1024 + 1),
    })

    assert.equal(oversized.status, 413)

    assert.deepEqual(await oversized.json(), {
      error: 'Request body too large.',
    })
  })
})

test('checkout requires the exact JSON media type', async () => {
  await withApi({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jsonp' },
      body: JSON.stringify(validCheckout()),
    })

    assert.equal(response.status, 415)

    assert.deepEqual(await response.json(), {
      error: 'Invalid demo checkout request.',
    })
  })
})

test('demo preference route rejects payment creation and returns no checkout redirect', async () => {
  await withApi({}, async (baseUrl) => {
    const response = await jsonPost(
      `${baseUrl}/api/payments/preference`,
      { mode: 'production' },
    )

    const body = await response.json()

    assert.equal(response.status, 409)
    assert.equal(body.mode, 'demo')
    assert.equal(body.realPaymentsEnabled, false)
    assert.equal(body.error, DEMO_NOTICE)
    assert.equal('init_point' in body, false)
  })
})

test('explicit production without validated requirements is blocked safely', async () => {
  const env = {
    PAYMENTS_MODE: 'production',
    NODE_ENV: 'production',
  }

  const policy = resolvePaymentsPolicy(env)

  assert.equal(policy.mode, 'demo')
  assert.equal(policy.productionBlocked, true)

  await withApi(env, async (baseUrl) => {
    const response = await jsonPost(
      `${baseUrl}/api/payments/preference`,
      {},
    )

    const body = await response.json()

    assert.equal(response.status, 503)
    assert.equal(body.mode, 'demo')
    assert.equal(body.realPaymentsEnabled, false)
    assert.equal(body.error, PRODUCTION_BLOCKED_NOTICE)
  })
})

test('payment status is read-only and always reports demo in this release', async () => {
  await withApi(
    { PAYMENTS_MODE: 'production' },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/payments/status`)
      const body = await response.json()

      assert.equal(response.status, 200)
      assert.equal(body.mode, 'demo')
      assert.equal(body.realPaymentsEnabled, false)
      assert.equal(body.message, DEMO_NOTICE)
    },
  )
})

test('demo API rejects card data instead of processing or retaining it', async () => {
  await withApi({}, async (baseUrl) => {
    const response = await jsonPost(`${baseUrl}/api/checkout`, {
      ...validCheckout(),
      cardNumber: 'not-accepted',
    })

    assert.equal(response.status, 400)

    assert.deepEqual(await response.json(), {
      error: 'Card data is not accepted in demo mode.',
    })
  })
})

test('frontend states the demo-only rule and contains neither card fields nor payment secrets', () => {
  const cartSource = readFileSync(
    join(projectRoot, 'frontend/src/components/CartDrawer.tsx'),
    'utf8',
  )

  assert.ok(cartSource.includes(DEMO_NOTICE))

  assert.doesNotMatch(
    cartSource,
    /name=["'](?:cardNumber|cardholder|securityCode|cvv|cvc)["']/i,
  )

  const collectSources = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)

      return entry.isDirectory()
        ? collectSources(path)
        : /\.(?:ts|tsx|js|jsx|scss)$/.test(entry.name)
          ? [path]
          : []
    })

  const frontendSources = collectSources(join(projectRoot, 'frontend/src'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')

  assert.doesNotMatch(
    frontendSources,
    /MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET|VITE_PAYMENTS_MODE|PAYMENTS_MODE/i,
  )
})

test('environment example contains only demo mode and no credential values', () => {
  const example = readFileSync(
    join(projectRoot, '.env.example'),
    'utf8',
  )

  assert.match(example, /^PAYMENTS_MODE=demo$/m)
  assert.match(example, /^MP_ACCESS_TOKEN=$/m)
  assert.match(example, /^MP_WEBHOOK_SECRET=$/m)
  assert.doesNotMatch(example, /^VITE_/m)
})


import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createDatabasePool } from './db/pool.mjs'
import {
  DEMO_NOTICE,
  PRODUCTION_BLOCKED_NOTICE,
  resolvePaymentsPolicy,
} from './payment-policy.mjs'

const MAX_BODY_BYTES = 24 * 1024
const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/
const PAYMENT_METHODS = new Set(['pix', 'credito', 'debito', 'dinheiro'])

function containsCardData(value) {
  if (Array.isArray(value)) return value.some(containsCardData)
  if (!value || typeof value !== 'object') return false

  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase().replaceAll(/[_-]/g, '')
    return normalized.includes('card')
      || ['securitycode', 'cvv', 'cvc', 'pan'].includes(normalized)
      || normalized.includes('expiration')
      || normalized.includes('expiry')
      || containsCardData(child)
  })
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const mediaType = request.headers['content-type']
    ?.split(';', 1)[0].trim().toLowerCase()

  if (mediaType !== 'application/json') {
    const error = new Error('Content-Type must be application/json')
    error.statusCode = 415
    throw error
  }

  const chunks = []
  let total = 0

  for await (const chunk of request) {
    total += chunk.length

    if (total > MAX_BODY_BYTES) {
      const error = new Error('Request body too large')
      error.statusCode = 413
      throw error
    }

    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Invalid JSON')
    error.statusCode = 400
    throw error
  }
}

function validateCheckout(payload, idempotencyKey) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }

  const allowedKeys = [
    'mode',
    'items',
    'customer',
    'fulfillment',
    'paymentMethod',
    'cashChangeForCents',
  ]

  if (Object.keys(payload).some((key) => !allowedKeys.includes(key))) return false
  if (payload.mode !== 'demo') return false

  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 128
  ) return false

  if (
    !Array.isArray(payload.items) ||
    payload.items.length < 1 ||
    payload.items.length > 100
  ) return false

  if (!payload.items.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false

    if (Object.keys(item).some((key) => ![
      'id',
      'quantity',
      'addOnIds',
      'removedIngredients',
      'note',
    ].includes(key))) return false

    return typeof item.id === 'string'
      && ITEM_ID_PATTERN.test(item.id)
      && Number.isSafeInteger(item.quantity)
      && item.quantity >= 1
      && item.quantity <= 20
      && Array.isArray(item.addOnIds)
      && item.addOnIds.length <= 20
      && item.addOnIds.every((id) => typeof id === 'string' && ITEM_ID_PATTERN.test(id))
      && new Set(item.addOnIds).size === item.addOnIds.length
      && Array.isArray(item.removedIngredients)
      && item.removedIngredients.length <= 30
      && item.removedIngredients.every((name) => typeof name === 'string' && name.trim().length <= 100)
      && new Set(item.removedIngredients).size === item.removedIngredients.length
      && typeof item.note === 'string'
      && item.note.length <= 180
  })) return false

  const { customer } = payload

  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) return false

  if (Object.keys(customer).some((key) => ![
    'name',
    'phone',
    'address',
    'reference',
    'notes',
  ].includes(key))) return false

  if (
    typeof customer.name !== 'string' ||
    customer.name.trim().length < 2 ||
    customer.name.trim().length > 120
  ) return false

  if (typeof customer.phone !== 'string') return false

  const phone = customer.phone.trim()
  const phoneDigits = phone.replace(/\D/g, '')

  if (
    !/^[0-9()+.\- ]{10,20}$/.test(phone) ||
    ![10, 11].includes(phoneDigits.length)
  ) return false

  if (
    customer.address !== undefined &&
    (typeof customer.address !== 'string' || customer.address.trim().length > 300)
  ) return false

  if (
    customer.reference !== undefined &&
    (typeof customer.reference !== 'string' || customer.reference.length > 180)
  ) return false

  if (
    customer.notes !== undefined &&
    (typeof customer.notes !== 'string' || customer.notes.length > 240)
  ) return false

  if (!['delivery', 'pickup'].includes(payload.fulfillment)) return false
  if (!PAYMENT_METHODS.has(payload.paymentMethod)) return false

  if (
    payload.cashChangeForCents !== undefined &&
    (!Number.isSafeInteger(payload.cashChangeForCents) || payload.cashChangeForCents < 0)
  ) return false

  if (
    payload.paymentMethod !== 'dinheiro' &&
    payload.cashChangeForCents !== undefined
  ) return false

  if (payload.fulfillment === 'delivery') {
    const address = customer.address?.trim()

    if (!address || address.length < 5 || !/\d/.test(address)) {
      return false
    }
  }

  return true
}

function publicOrderNumber() {
  return `DOR-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`
}

async function findExistingOrder(pool, idempotencyKey) {
  const result = await pool.query(
    `SELECT public_order_number
       FROM public.orders
      WHERE idempotency_key = $1`,
    [idempotencyKey],
  )

  return result.rows[0]?.public_order_number ?? null
}

async function createOrder(pool, payload, idempotencyKey) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const storeResult = await client.query(`
      SELECT delivery_fee_cents
      FROM public.store_settings
      WHERE id = 1 AND status = 'active' AND storefront_enabled = true
      FOR SHARE
    `)

    if (storeResult.rowCount !== 1) {
      const error = new Error('Storefront unavailable')
      error.statusCode = 503
      throw error
    }

    const productSlugs = [...new Set(payload.items.map((item) => item.id))]

    const productsResult = await client.query(`
      SELECT p.id, p.slug, p.name, p.price_cents, p.ingredients
      FROM public.products p
      JOIN public.categories c ON c.id = p.category_id
      WHERE p.slug = ANY($1::text[])
        AND p.active = true
        AND c.active = true
    `, [productSlugs])

    const productsBySlug = new Map(
      productsResult.rows.map((product) => [product.slug, product]),
    )

    if (productsBySlug.size !== productSlugs.length) {
      const error = new Error('Unavailable product')
      error.statusCode = 400
      throw error
    }

    const requestedOptionSlugs = [
      ...new Set(payload.items.flatMap((item) => item.addOnIds)),
    ]

    let optionsBySlug = new Map()

    if (requestedOptionSlugs.length) {
      const optionsResult = await client.query(`
        SELECT DISTINCT mo.id, mo.slug, mo.name, mo.price_delta_cents
        FROM public.modifier_options mo
        JOIN public.product_modifier_groups pmg ON pmg.group_id = mo.group_id
        JOIN public.products p ON p.id = pmg.product_id
        WHERE mo.slug = ANY($1::text[])
          AND mo.active = true
          AND p.active = true
      `, [requestedOptionSlugs])

      optionsBySlug = new Map(
        optionsResult.rows.map((option) => [option.slug, option]),
      )
    }

    let subtotalCents = 0
    const preparedItems = []

    for (const item of payload.items) {
      const product = productsBySlug.get(item.id)

      if (!product) {
        const error = new Error('Unavailable product')
        error.statusCode = 400
        throw error
      }

      const ingredients = product.ingredients ?? []

      if (item.removedIngredients.some((name) => !ingredients.includes(name))) {
        const error = new Error('Invalid removed ingredient')
        error.statusCode = 400
        throw error
      }

      const selectedOptions = []

      for (const slug of item.addOnIds) {
        const option = optionsBySlug.get(slug)

        if (!option) {
          const error = new Error('Invalid modifier')
          error.statusCode = 400
          throw error
        }

        const allowed = await client.query(`
          SELECT 1
          FROM public.product_modifier_groups pmg
          JOIN public.modifier_options mo ON mo.group_id = pmg.group_id
          WHERE pmg.product_id = $1
            AND mo.id = $2
            AND mo.active = true
        `, [product.id, option.id])

        if (allowed.rowCount !== 1) {
          const error = new Error('Modifier not allowed for product')
          error.statusCode = 400
          throw error
        }

        selectedOptions.push(option)
      }

      const optionsTotal = selectedOptions.reduce(
        (sum, option) => sum + option.price_delta_cents,
        0,
      )

      const lineTotal = (product.price_cents + optionsTotal) * item.quantity

      if (!Number.isSafeInteger(lineTotal)) {
        const error = new Error('Invalid order total')
        error.statusCode = 400
        throw error
      }

      subtotalCents += lineTotal

      preparedItems.push({
        product,
        quantity: item.quantity,
        options: selectedOptions,
        removedIngredients: item.removedIngredients,
        note: item.note,
        lineTotal,
      })
    }

    const deliveryFeeCents = payload.fulfillment === 'delivery'
      ? storeResult.rows[0].delivery_fee_cents
      : 0

    const totalCents = subtotalCents + deliveryFeeCents

    if (!Number.isSafeInteger(totalCents) || totalCents > 2_000_000_000) {
      const error = new Error('Invalid order total')
      error.statusCode = 400
      throw error
    }

    if (
      payload.paymentMethod === 'dinheiro' &&
      payload.cashChangeForCents !== undefined &&
      payload.cashChangeForCents < totalCents
    ) {
      const error = new Error('Cash change amount is below order total')
      error.statusCode = 400
      throw error
    }

    const orderId = randomUUID()
    const orderNumber = publicOrderNumber()
    const customer = payload.customer

    await client.query(`
      INSERT INTO public.orders (
        id,
        public_order_number,
        idempotency_key,
        fulfillment_type,
        customer_name,
        customer_phone,
        delivery_address,
        delivery_reference,
        customer_notes,
        payment_method,
        cash_change_for_cents,
        subtotal_cents,
        delivery_fee_cents,
        total_cents,
        payment_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'not_charged'
      )
    `, [
      orderId,
      orderNumber,
      idempotencyKey,
      payload.fulfillment,
      customer.name.trim(),
      customer.phone.trim(),
      payload.fulfillment === 'delivery' ? customer.address.trim() : null,
      payload.fulfillment === 'delivery' ? customer.reference?.trim() || null : null,
      customer.notes?.trim() || null,
      payload.paymentMethod,
      payload.paymentMethod === 'dinheiro' ? payload.cashChangeForCents ?? null : null,
      subtotalCents,
      deliveryFeeCents,
      totalCents,
    ])

    for (const item of preparedItems) {
      const itemId = randomUUID()

      await client.query(`
        INSERT INTO public.order_items (
          id,
          order_id,
          product_id,
          product_name_snapshot,
          unit_price_cents,
          quantity,
          line_total_cents,
          removed_ingredients,
          item_note
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        itemId,
        orderId,
        item.product.id,
        item.product.name,
        item.product.price_cents,
        item.quantity,
        item.lineTotal,
        item.removedIngredients,
        item.note,
      ])

      for (const option of item.options) {
        await client.query(`
          INSERT INTO public.order_item_options (
            id,
            order_item_id,
            modifier_option_id,
            option_name_snapshot,
            price_delta_cents
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          randomUUID(),
          itemId,
          option.id,
          option.name,
          option.price_delta_cents,
        ])
      }
    }

    await client.query(`
      INSERT INTO public.order_status_events (
        id, order_id, from_status, to_status, reason
      ) VALUES ($1, $2, NULL, 'pending', 'Demo checkout registered')
    `, [randomUUID(), orderId])

    await client.query('COMMIT')

    return {
      orderId: orderNumber,
      subtotalCents,
      deliveryFeeCents,
      totalCents,
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Preserve the original database error.
    }

    throw error
  } finally {
    client.release()
  }
}

export function createApiServer({ env = process.env, pool = null } = {}) {
  const policy = resolvePaymentsPolicy(env)

  return createServer(async (request, response) => {
    let pathname

    try {
      pathname = new URL(request.url, 'http://127.0.0.1').pathname
    } catch {
      return sendJson(response, 400, { error: 'Invalid request URL.' })
    }

    if (request.method === 'GET' && pathname === '/api/payments/status') {
      return sendJson(response, 200, {
        mode: 'demo',
        realPaymentsEnabled: false,
        message: DEMO_NOTICE,
      })
    }

    if (request.method === 'POST' && pathname === '/api/checkout') {
      try {
        const payload = await readJson(request)

        if (containsCardData(payload)) {
          return sendJson(response, 400, {
            error: 'Card data is not accepted in demo mode.',
          })
        }

        const idempotencyKey = request.headers['idempotency-key']

        if (!validateCheckout(payload, idempotencyKey)) {
          return sendJson(response, 400, {
            error: 'Invalid demo checkout request.',
          })
        }

        if (!pool) {
          return sendJson(response, 503, {
            error: 'Order database is unavailable.',
          })
        }

        const existingOrder = await findExistingOrder(pool, idempotencyKey)

        if (existingOrder) {
          return sendJson(response, 200, {
            mode: 'demo',
            orderType: 'demo',
            orderId: existingOrder,
            paymentStatus: 'not_charged',
            message: DEMO_NOTICE,
          })
        }

        let order

        try {
          order = await createOrder(pool, payload, idempotencyKey)
        } catch (error) {
          if (error.code === '23505') {
            const duplicate = await findExistingOrder(pool, idempotencyKey)

            if (duplicate) {
              return sendJson(response, 200, {
                mode: 'demo',
                orderType: 'demo',
                orderId: duplicate,
                paymentStatus: 'not_charged',
                message: DEMO_NOTICE,
              })
            }
          }

          throw error
        }

        return sendJson(response, 201, {
          mode: 'demo',
          orderType: 'demo',
          orderId: order.orderId,
          subtotalCents: order.subtotalCents,
          deliveryFeeCents: order.deliveryFeeCents,
          totalCents: order.totalCents,
          paymentStatus: 'not_charged',
          message: policy.productionBlocked
            ? PRODUCTION_BLOCKED_NOTICE
            : DEMO_NOTICE,
        })
      } catch (error) {
        if (error.statusCode) {
          return sendJson(response, error.statusCode, {
            error: error.statusCode === 413
              ? 'Request body too large.'
              : error.statusCode === 503
                ? 'Storefront unavailable.'
                : 'Invalid demo checkout request.',
          })
        }

        return sendJson(response, 500, {
          error: 'Unable to register demo order.',
        })
      }
    }

    if (request.method === 'POST' && pathname === '/api/payments/preference') {
      const status = policy.productionBlocked ? 503 : 409
      const message = policy.productionBlocked
        ? PRODUCTION_BLOCKED_NOTICE
        : DEMO_NOTICE

      return sendJson(response, status, {
        mode: 'demo',
        realPaymentsEnabled: false,
        error: message,
      })
    }

    return sendJson(response, 404, { error: 'Not found.' })
  })
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === process.argv[1]

if (isDirectExecution) {
  const port = Number(process.env.PORT || 8787)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.')
  }

  const pool = await createDatabasePool()
  const server = createApiServer({ pool })

  server.listen(port, '127.0.0.1', () => {
    console.log(`Dorvan demo API listening on http://127.0.0.1:${port}`)

    if (resolvePaymentsPolicy(process.env).productionBlocked) {
      console.warn(PRODUCTION_BLOCKED_NOTICE)
    }
  })

  const close = async () => {
    server.close()
    await pool.end()
  }

  process.once('SIGINT', close)
  process.once('SIGTERM', close)
}

import { isIP } from 'node:net'

export const DEMO_NOTICE = 'Projeto demonstrativo: nenhum pagamento real será realizado.'
export const PRODUCTION_BLOCKED_NOTICE = 'Pagamentos reais indisponíveis: os requisitos de produção ainda não foram validados.'

// Intentionally false until a reviewed server integration implements each control below.
const LIVE_INTEGRATION_IMPLEMENTED = false
const WEBHOOK_SIGNATURE_VALIDATION_IMPLEMENTED = false
const OFFICIAL_PAYMENT_LOOKUP_IMPLEMENTED = false
const ORDER_RECONCILIATION_IMPLEMENTED = false

function isPublicHttpsUrl(value, expectedOrigin) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password) return false
    const normalizedHost = host.replace(/^\[|\]$/g, '')
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.example') || host.endsWith('.test') || host.endsWith('.invalid') || isIP(normalizedHost)) return false
    if (!host.includes('.')) return false
    if (expectedOrigin && url.origin !== expectedOrigin) return false
    if (url.search || url.hash) return false
    return true
  } catch {
    return false
  }
}

export function validateProductionRequirements(env = process.env) {
  const publicBase = (() => {
    if (!isPublicHttpsUrl(env.PUBLIC_BASE_URL)) return null
    try { return new URL(env.PUBLIC_BASE_URL) } catch { return null }
  })()
  const webhookUrl = (() => {
    if (!publicBase || !isPublicHttpsUrl(env.MP_WEBHOOK_URL, publicBase.origin)) return null
    try { return new URL(env.MP_WEBHOOK_URL) } catch { return null }
  })()
  const accessToken = typeof env.MP_ACCESS_TOKEN === 'string' ? env.MP_ACCESS_TOKEN.trim() : ''
  const webhookSecret = typeof env.MP_WEBHOOK_SECRET === 'string' ? env.MP_WEBHOOK_SECRET.trim() : ''
  const backUrlsValid = ['MP_SUCCESS_URL', 'MP_FAILURE_URL', 'MP_PENDING_URL']
    .every((key) => publicBase && isPublicHttpsUrl(env[key], publicBase.origin))

  const checks = {
    productionNodeEnvironment: env.NODE_ENV === 'production',
    explicitProductionCredentialEnvironment: env.MP_CREDENTIALS_ENV === 'production',
    serverAccessTokenPresent: accessToken.length >= 32,
    publicBaseUrlIsHttps: Boolean(publicBase && publicBase.pathname === '/'),
    productionWebhookUrlIsHttpsAndSameOrigin: Boolean(webhookUrl && webhookUrl.pathname === '/api/payments/mercado-pago/webhook'),
    webhookSecretPresent: webhookSecret.length >= 32,
    productionPaymentWebhookEnabled: env.MP_WEBHOOK_PAYMENTS_EVENT_ENABLED === 'true',
    productionWebhookWasValidated: env.MP_WEBHOOK_VALIDATED === 'true',
    backUrlsAreHttpsAndSameOrigin: Boolean(backUrlsValid),
    securityReviewCompletedOnServer: env.PAYMENTS_SECURITY_REVIEWED === 'true',
    liveIntegrationImplemented: LIVE_INTEGRATION_IMPLEMENTED,
    webhookSignatureValidationImplemented: WEBHOOK_SIGNATURE_VALIDATION_IMPLEMENTED,
    officialPaymentLookupImplemented: OFFICIAL_PAYMENT_LOOKUP_IMPLEMENTED,
    orderReconciliationImplemented: ORDER_RECONCILIATION_IMPLEMENTED,
  }
  return { ready: Object.values(checks).every(Boolean), checks }
}

/** Reads only server process configuration. Request bodies and VITE_* values are never consulted. */
export function resolvePaymentsPolicy(env = process.env) {
  const rawMode = typeof env.PAYMENTS_MODE === 'string' ? env.PAYMENTS_MODE.trim().toLowerCase() : ''
  const requestedMode = rawMode || 'demo'

  if (requestedMode !== 'demo' && requestedMode !== 'production') {
    return { mode: 'demo', requestedMode: 'demo', productionReady: false, productionBlocked: false, notice: DEMO_NOTICE }
  }
  if (requestedMode === 'demo') {
    return { mode: 'demo', requestedMode: 'demo', productionReady: false, productionBlocked: false, notice: DEMO_NOTICE }
  }

  const validation = validateProductionRequirements(env)
  if (!validation.ready) {
    return { mode: 'demo', requestedMode: 'production', productionReady: false, productionBlocked: true, notice: PRODUCTION_BLOCKED_NOTICE }
  }

  // Kept as a second fail-closed boundary. This version contains no live payment integration.
  return { mode: 'demo', requestedMode: 'production', productionReady: false, productionBlocked: true, notice: PRODUCTION_BLOCKED_NOTICE }
}

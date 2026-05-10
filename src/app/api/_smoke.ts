// Manual smoke check for Stage 5 routes.
//   npx tsx src/app/api/_smoke.ts
//
// Verifies checkpoint:
//  - mapErrorToStatus correctness for every error variant
//  - 400 validation error path through the cart route
//  - 401 webhook signature failure path through the webhook route
//
// Logs error.type and selected status code for each path.

// Set fake env BEFORE importing any route modules — env.ts validates at load.
process.env.DODO_PAYMENTS_API_KEY = 'sk_test_fake'
process.env.DODO_PAYMENTS_WEBHOOK_KEY = 'whk_test_fake'
process.env.DODO_PAYMENTS_RETURN_URL = 'http://localhost:3000'
process.env.DODO_PAYMENTS_ENVIRONMENT = 'test_mode'

const main = async () => {
  const { mapErrorToStatus } = await import('@/lib/http/errorMap')

  console.log('=== mapErrorToStatus contract ===')
  const cases: Array<{ label: string; error: Parameters<typeof mapErrorToStatus>[0] }> = [
    { label: 'CART_VALIDATION_ERROR', error: { type: 'CART_VALIDATION_ERROR', fields: [] } },
    { label: 'MERCHANT_VALIDATION_ERROR', error: { type: 'MERCHANT_VALIDATION_ERROR', fields: [] } },
    { label: 'DB_ERROR', error: { type: 'DB_ERROR', message: 'boom' } },
    { label: 'DODO_ERROR', error: { type: 'DODO_ERROR', message: 'boom' } },
    { label: 'EXPO_ERROR', error: { type: 'EXPO_ERROR', message: 'boom' } },
    { label: 'WEBHOOK_SIGNATURE_ERROR', error: { type: 'WEBHOOK_SIGNATURE_ERROR', message: 'boom' } },
  ]
  for (const c of cases) {
    console.log(`  ${c.label.padEnd(28)} → ${mapErrorToStatus(c.error)}`)
  }

  console.log('\n=== cart route: 400 validation error path ===')
  const { POST: cartPOST } = await import('@/app/api/cart/route')
  const cartReq = new Request('http://localhost/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}), // missing merchantId, missing lineItems
  })
  const cartRes = await cartPOST(cartReq)
  const cartBody = (await cartRes.json()) as { type: string; fields?: unknown[] }
  console.log(`  status: ${cartRes.status}`)
  console.log(`  error.type: ${cartBody.type}`)
  console.log(`  fields count: ${cartBody.fields?.length ?? 0}`)

  console.log('\n=== cart route: 400 invalid JSON path ===')
  const cartBadJSONReq = new Request('http://localhost/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not valid json{',
  })
  const cartBadJSONRes = await cartPOST(cartBadJSONReq)
  const cartBadJSONBody = (await cartBadJSONRes.json()) as { type: string }
  console.log(`  status: ${cartBadJSONRes.status}`)
  console.log(`  error.type: ${cartBadJSONBody.type}`)

  console.log('\n=== webhook route: 401 signature failure path ===')
  const { POST: webhookPOST } = await import('@/app/api/webhooks/dodo/route')
  const webhookReq = new Request('http://localhost/api/webhooks/dodo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': 'msg_fake',
      'webhook-signature': 'v1,bogus',
      'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
    },
    body: JSON.stringify({ type: 'payment.succeeded', data: {} }),
  })
  const webhookRes = await webhookPOST(webhookReq)
  const webhookBody = (await webhookRes.json()) as { type: string; message?: string }
  console.log(`  status: ${webhookRes.status}`)
  console.log(`  error.type: ${webhookBody.type}`)
  console.log(`  message: ${webhookBody.message}`)

  console.log('\n[done]')
}

main().catch(e => {
  console.error('smoke failed:', e)
  process.exit(1)
})

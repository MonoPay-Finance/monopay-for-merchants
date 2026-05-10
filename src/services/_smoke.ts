// Manual smoke check for services. Runs against in-memory fakes — no real DB.
//   npx tsx src/services/_smoke.ts
//
// Demonstrates Stage 2 checkpoint:
//   - happy path: parse | lookup | write through full cart-then-paid flow
//   - validation fail: short-circuits at parse step
//   - domain error: lookup returns DBError when entity is missing

import { makeFakeDB } from '@/db/adapters/in-memory'
import { makeCartService } from './cart.service'
import { makeMerchantService } from './merchant.service'
import { makeTransactionService } from './transaction.service'

const log = (label: string, ...rest: unknown[]) => console.log(`  ${label}`, ...rest)

const main = async () => {
  const db = makeFakeDB()
  const cartSvc = makeCartService(db)
  const merchantSvc = makeMerchantService(db)
  const txnSvc = makeTransactionService(db)

  // --- seed: upsert a merchant ---
  console.log('\n[seed] upsert merchant')
  const merchant = await merchantSvc.upsertMerchant({
    id: 'm_001',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    displayName: 'Acme Coffee',
    preferredCurrency: 'USD',
    createdAtIso: new Date().toISOString(),
  })
  log('  step: parse')
  log('  step: write →', merchant.isOk() ? 'OK' : `FAIL ${JSON.stringify(merchant.error)}`)

  // --- happy path: create cart ---
  console.log('\n[happy] create cart')
  log('  step: parse')
  const cartResult = await cartSvc.createCart({
    merchantId: 'm_001',
    lineItems: [
      { productId: 'pdt_001', quantity: 2, unitAmount: 1500 },
      { productId: 'pdt_002', quantity: 1, unitAmount: 19999 },
    ],
  })
  log('  step: write →', cartResult.isOk() ? `OK id=${cartResult.value.id} subtotal=${cartResult.value.subtotalAmount}` : 'FAIL')

  // --- validation fail: short-circuits at parse ---
  console.log('\n[validation fail] create cart with bad input')
  log('  step: parse')
  const badResult = await cartSvc.createCart({ lineItems: [] }) // missing merchantId, empty lineItems
  log(
    '  step: short-circuit →',
    badResult.isErr()
      ? `expected err type=${badResult.error.type} fields=${badResult.error.type === 'CART_VALIDATION_ERROR' ? badResult.error.fields.length : 'n/a'}`
      : 'unexpected ok'
  )

  // --- domain error: lookup missing cart ---
  console.log('\n[domain error] get cart that does not exist')
  log('  step: lookup')
  const missing = await cartSvc.getCart('cart_does_not_exist')
  log('  step: lookup →', missing.isErr() ? `expected DB_ERROR: ${missing.error.message}` : 'unexpected ok')

  // --- continue happy path: pay cart, record transaction ---
  if (cartResult.isOk()) {
    const cartId = cartResult.value.id

    console.log('\n[happy] mark cart paid')
    log('  step: lookup + write')
    const paid = await cartSvc.markCartPaid(cartId)
    log('  step: write →', paid.isOk() ? `OK status=${paid.value.status}` : 'FAIL')

    console.log('\n[happy] record transaction')
    log('  step: parse')
    const txn = await txnSvc.recordTransaction({
      id: 'txn_001',
      merchantId: 'm_001',
      buyerId: 'b_001',
      cartId,
      assetSymbol: 'USDC',
      currency: 'USD',
      amount: cartResult.value.subtotalAmount,
      status: 'CONFIRMED',
      createdAtIso: new Date().toISOString(),
    })
    log('  step: write →', txn.isOk() ? 'OK' : `FAIL ${JSON.stringify(txn.error)}`)

    console.log('\n[happy] list merchant transactions')
    log('  step: lookup')
    const list = await txnSvc.listForMerchant('m_001')
    log('  step: lookup →', list.isOk() ? `OK count=${list.value.length}` : 'FAIL')
  }

  console.log('\n[done]')
}

main().catch(e => {
  console.error('smoke failed:', e)
  process.exit(1)
})

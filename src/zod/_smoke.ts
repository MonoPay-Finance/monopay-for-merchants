// Manual smoke check for schemas. Not a test — run with:
//   npx tsx src/zod/_smoke.ts
// Confirms each parser returns isOk for valid input and isErr with
// fields[] populated for invalid input.

import { parseMerchant } from './schemas/merchant.schema'
import { parseBuyer } from './schemas/buyer.schema'
import { parseCart } from './schemas/cart.schema'
import { parseTransaction } from './schemas/transaction.schema'
import { parseNotification } from './schemas/notification.schema'

import { validMerchant, invalidMerchant } from './fixtures/merchant.fixtures'
import { validBuyer, invalidBuyer } from './fixtures/buyer.fixtures'
import { validCart, invalidCart } from './fixtures/cart.fixtures'
import { validTransaction, invalidTransaction } from './fixtures/transaction.fixtures'
import { validNotification, invalidNotification } from './fixtures/notification.fixtures'

const cases = [
  { name: 'merchant', parse: parseMerchant, valid: validMerchant, invalid: invalidMerchant },
  { name: 'buyer', parse: parseBuyer, valid: validBuyer, invalid: invalidBuyer },
  { name: 'cart', parse: parseCart, valid: validCart, invalid: invalidCart },
  { name: 'transaction', parse: parseTransaction, valid: validTransaction, invalid: invalidTransaction },
  { name: 'notification', parse: parseNotification, valid: validNotification, invalid: invalidNotification },
]

for (const c of cases) {
  const ok = c.parse(c.valid)
  const bad = c.parse(c.invalid)
  console.log(`[${c.name}] valid → ${ok.isOk() ? 'OK' : 'FAIL'}`)
  console.log(`[${c.name}] invalid → ${bad.isErr() ? `OK (${bad.error.fields.length} field errors)` : 'FAIL (should have erred)'}`)
}

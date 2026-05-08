import type { Buyer } from '@/db/ports/buyer.repository'
import type { Cart } from '@/db/ports/cart.repository'
import type { Merchant } from '@/db/ports/merchant.repository'
import type { Transaction } from '@/db/ports/transaction.repository'
import { makeFakeBuyerRepo } from './buyer'
import { makeFakeCartRepo } from './cart'
import { makeFakeMerchantRepo } from './merchant'
import { makeFakeTransactionRepo } from './transaction'

export type FakeDBSeed = {
  merchants?: Merchant[]
  buyers?: Buyer[]
  carts?: Cart[]
  transactions?: Transaction[]
}

export const makeFakeDB = (seed: FakeDBSeed = {}) => ({
  merchants: makeFakeMerchantRepo(seed.merchants ?? []),
  buyers: makeFakeBuyerRepo(seed.buyers ?? []),
  carts: makeFakeCartRepo(seed.carts ?? []),
  transactions: makeFakeTransactionRepo(seed.transactions ?? []),
})

import type { DBError } from '@/db/errors'
import type { AsyncResult } from '@/db/types'

export type Transaction = {
  id: string
  merchantId: string
  buyerId?: string
  cartId: string
  assetSymbol: string
  amount: number
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  createdAtIso: string
}

export type BuyerFrequency = {
  buyerId: string
  txCount: number
}

export interface TransactionRepository {
  listByMerchant(merchantId: string): AsyncResult<Transaction[], DBError>
  listByBuyer(merchantId: string, buyerId: string): AsyncResult<Transaction[], DBError>
  create(transaction: Transaction): AsyncResult<Transaction, DBError>
  topBuyersByFrequency(merchantId: string, limit: number): AsyncResult<BuyerFrequency[], DBError>
}

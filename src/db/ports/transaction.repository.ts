import type { DBError } from '@/db/errors'
import type { tryCatchAsync } from '@/lib/result'

// Async repository result inferred from the canonical result wrapper.
type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

// Persisted transaction shape for merchant history.
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

// Aggregate view for dashboard "top buyers" block.
export type BuyerFrequency = {
  buyerId: string
  txCount: number
}

// Contract only: adapters implement these operations.
export interface TransactionRepository {
  listByMerchant(merchantId: string): AsyncResult<Transaction[], DBError>
  listByBuyer(merchantId: string, buyerId: string): AsyncResult<Transaction[], DBError>
  create(transaction: Transaction): AsyncResult<Transaction, DBError>
  topBuyersByFrequency(merchantId: string, limit: number): AsyncResult<BuyerFrequency[], DBError>
}

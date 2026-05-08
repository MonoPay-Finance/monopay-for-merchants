import type { DBError } from '@/db/errors'
import type { tryCatchAsync } from '@/lib/resultPattern'

// Async repository result inferred from the canonical result wrapper.
type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

// Merchant record shape used across DB implementations.
export type Merchant = {
  id: string
  walletAddress: string
  displayName: string
  storefrontName?: string
  createdAtIso: string
}

// Contract only: adapters implement these operations.
export interface MerchantRepository {
  getById(id: string): AsyncResult<Merchant, DBError>
  getByWallet(walletAddress: string): AsyncResult<Merchant, DBError>
  upsert(merchant: Merchant): AsyncResult<Merchant, DBError>
}

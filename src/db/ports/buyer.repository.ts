import type { DBError } from '@/db/errors'
import type { tryCatchAsync } from '@/lib/result'

// Async repository result inferred from the canonical result wrapper.
type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

// Buyer record shape used for history and notification lookup.
export type Buyer = {
  id: string
  walletAddress: string
  nickname?: string
  expoPushTokenEncrypted?: string
}

// Contract only: adapters implement these operations.
export interface BuyerRepository {
  getById(buyerId: string): AsyncResult<Buyer, DBError>
  getByWallet(walletAddress: string): AsyncResult<Buyer, DBError>
  getPushTokenByBuyerId(buyerId: string): AsyncResult<string, DBError>
}

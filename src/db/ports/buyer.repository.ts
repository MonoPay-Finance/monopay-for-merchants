import type { DBError } from '@/db/errors'
import type { tryCatchAsync } from '@/lib/resultPattern'

type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

export type Buyer = {
  id: string
  walletAddress: string
  nickname?: string
  email?: string
  dodoCustomerId?: string
  expoPushTokenEncrypted?: string
}

export interface BuyerRepository {
  getById(buyerId: string): AsyncResult<Buyer, DBError>
  getByWallet(walletAddress: string): AsyncResult<Buyer, DBError>
  getPushTokenByBuyerId(buyerId: string): AsyncResult<string, DBError>
}

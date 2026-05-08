import type { DBError } from '@/db/errors'
import type { AsyncResult } from '@/db/types'

export type Buyer = {
  id: string
  walletAddress: string
  nickname?: string
  expoPushTokenEncrypted?: string
}

export interface BuyerRepository {
  getById(buyerId: string): AsyncResult<Buyer, DBError>
  getByWallet(walletAddress: string): AsyncResult<Buyer, DBError>
  getPushTokenByBuyerId(buyerId: string): AsyncResult<string, DBError>
}

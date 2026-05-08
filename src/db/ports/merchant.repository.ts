import type { DBError } from '@/db/errors'
import type { AsyncResult } from '@/db/types'

export type Merchant = {
  id: string
  walletAddress: string
  displayName: string
  storefrontName?: string
  createdAtIso: string
}

export interface MerchantRepository {
  getById(id: string): AsyncResult<Merchant, DBError>
  getByWallet(walletAddress: string): AsyncResult<Merchant, DBError>
  upsert(merchant: Merchant): AsyncResult<Merchant, DBError>
}

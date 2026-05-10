import type { DBError } from '@/db/errors'
import type { tryCatchAsync } from '@/lib/resultPattern'

type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

export type Merchant = {
  id: string
  walletAddress: string
  displayName: string
  storefrontName?: string
  storefrontDescription?: string
  storefrontLogoUrl?: string
  dodoBusinessId?: string
  preferredCurrency: string
  createdAtIso: string
  updatedAtIso?: string
}

export interface MerchantRepository {
  getById(id: string): AsyncResult<Merchant, DBError>
  getByWallet(walletAddress: string): AsyncResult<Merchant, DBError>
  // Creates or replaces the merchant record identified by merchant.id.
  upsert(merchant: Merchant): AsyncResult<Merchant, DBError>
}

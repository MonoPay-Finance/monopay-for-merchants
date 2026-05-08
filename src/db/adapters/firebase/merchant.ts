import { tryCatchAsync } from '@/lib/resultPattern'
import { toDBError } from '@/db/errors'
import type { Merchant, MerchantRepository } from '@/db/ports/merchant.repository'
import { fsGet, fsPatch, fsQuery } from './client'

export const merchantRepo: MerchantRepository = {
  getById: (id) =>
    tryCatchAsync(() => fsGet<Merchant>('merchants', id), toDBError),

  getByWallet: (walletAddress) =>
    tryCatchAsync(async () => {
      const results = await fsQuery<Merchant>('merchants', [
        { field: 'walletAddress', value: walletAddress },
      ])
      const [found] = results
      if (!found) throw new Error(`Merchant not found for wallet: ${walletAddress}`)
      return found
    }, toDBError),

  upsert: (merchant) =>
    tryCatchAsync(() => fsPatch<Merchant>('merchants', merchant.id, merchant), toDBError),
}

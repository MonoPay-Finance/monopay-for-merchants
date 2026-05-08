import { okAsync, errAsync } from 'neverthrow'
import type { Merchant, MerchantRepository } from '@/db/ports/merchant.repository'
import type { DBError } from '@/db/errors'

const dbErr = (message: string): DBError => ({ type: 'DB_ERROR', message })

export const makeFakeMerchantRepo = (initial: Merchant[] = []): MerchantRepository => {
  const store = new Map<string, Merchant>(initial.map(m => [m.id, m]))

  return {
    getById: (id) => {
      const m = store.get(id)
      if (!m) return errAsync(dbErr(`Merchant not found: ${id}`))
      return okAsync(m)
    },

    getByWallet: (walletAddress) => {
      for (const m of store.values()) {
        if (m.walletAddress === walletAddress) return okAsync(m)
      }
      return errAsync(dbErr(`Merchant not found for wallet: ${walletAddress}`))
    },

    upsert: (merchant) => {
      store.set(merchant.id, merchant)
      return okAsync(merchant)
    },
  }
}

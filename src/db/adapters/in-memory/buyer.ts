import { okAsync, errAsync } from 'neverthrow'
import type { Buyer, BuyerRepository } from '@/db/ports/buyer.repository'
import type { DBError } from '@/db/errors'

const dbErr = (message: string): DBError => ({ type: 'DB_ERROR', message })

export const makeFakeBuyerRepo = (initial: Buyer[] = []): BuyerRepository => {
  const store = new Map<string, Buyer>(initial.map(b => [b.id, b]))

  return {
    getById: (buyerId) => {
      const b = store.get(buyerId)
      if (!b) return errAsync(dbErr(`Buyer not found: ${buyerId}`))
      return okAsync(b)
    },

    getByWallet: (walletAddress) => {
      for (const b of store.values()) {
        if (b.walletAddress === walletAddress) return okAsync(b)
      }
      return errAsync(dbErr(`Buyer not found for wallet: ${walletAddress}`))
    },

    getPushTokenByBuyerId: (buyerId) => {
      const b = store.get(buyerId)
      if (!b) return errAsync(dbErr(`Buyer not found: ${buyerId}`))
      if (!b.expoPushTokenEncrypted) return errAsync(dbErr(`No push token for buyer: ${buyerId}`))
      return okAsync(b.expoPushTokenEncrypted)
    },
  }
}

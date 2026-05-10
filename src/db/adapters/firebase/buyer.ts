import { tryCatchAsync } from '@/lib/resultPattern'
import { toDBError } from '@/db/errors'
import type { Buyer, BuyerRepository } from '@/db/ports/buyer.repository'
import { fsGet, fsQuery } from './client'

export const buyerRepo: BuyerRepository = {
  getById: (buyerId) =>
    tryCatchAsync(() => fsGet<Buyer>('buyers', buyerId), toDBError),

  getByWallet: (walletAddress) =>
    tryCatchAsync(async () => {
      const results = await fsQuery<Buyer>('buyers', [
        { field: 'walletAddress', value: walletAddress },
      ])
      const [found] = results
      if (!found) throw new Error(`Buyer not found for wallet: ${walletAddress}`)
      return found
    }, toDBError),

  getPushTokenByBuyerId: (buyerId) =>
    tryCatchAsync(async () => {
      const buyer = await fsGet<Buyer>('buyers', buyerId)
      if (!buyer.expoPushTokenEncrypted) {
        throw new Error(`No push token found for buyer: ${buyerId}`)
      }
      return buyer.expoPushTokenEncrypted
    }, toDBError),
}

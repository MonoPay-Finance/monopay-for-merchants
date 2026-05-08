import type { ResultAsync } from 'neverthrow'
import type { Buyer, BuyerRepository } from '@/db/ports/buyer.repository'
import type { DBError } from '@/db/errors'

export type BuyerServiceDeps = { buyers: BuyerRepository }

export const makeBuyerService = (deps: BuyerServiceDeps) => ({
  getBuyer: (id: string): ResultAsync<Buyer, DBError> =>
    deps.buyers.getById(id),

  getBuyerByWallet: (walletAddress: string): ResultAsync<Buyer, DBError> =>
    deps.buyers.getByWallet(walletAddress),

  getBuyerPushToken: (buyerId: string): ResultAsync<string, DBError> =>
    deps.buyers.getPushTokenByBuyerId(buyerId),
})

export type BuyerService = ReturnType<typeof makeBuyerService>

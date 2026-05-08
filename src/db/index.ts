import { tryCatchSync } from '@/lib/result'
import type { DBError } from '@/db/errors'
import type { SyncResult } from '@/db/types'
import type { BuyerRepository } from '@/db/ports/buyer.repository'
import type { CartRepository } from '@/db/ports/cart.repository'
import type { MerchantRepository } from '@/db/ports/merchant.repository'
import type { TransactionRepository } from '@/db/ports/transaction.repository'

export type DatabaseAdapter = {
  merchantRepository: MerchantRepository
  cartRepository: CartRepository
  transactionRepository: TransactionRepository
  buyerRepository: BuyerRepository
}

let activeAdapter: DatabaseAdapter | null = null

export const setDatabaseAdapter = (adapter: DatabaseAdapter): void => {
  activeAdapter = adapter
}

export const getDatabaseAdapter = (): SyncResult<DatabaseAdapter, DBError> =>
  tryCatchSync(
    () => {
      if (!activeAdapter) {
        throw new Error('No database adapter configured.')
      }
      return activeAdapter
    },
    (e) => ({
      type: 'DB_ERROR',
      message: e instanceof Error ? e.message : 'Unable to resolve database adapter.',
      cause: e,
    })
  )

export { createFirebaseAdapter } from '@/db/adapters/firebase'

import { okAsync, errAsync } from 'neverthrow'
import type {
  BuyerFrequency,
  Transaction,
  TransactionRepository,
} from '@/db/ports/transaction.repository'
import type { DBError } from '@/db/errors'

const dbErr = (message: string): DBError => ({ type: 'DB_ERROR', message })

export const makeFakeTransactionRepo = (initial: Transaction[] = []): TransactionRepository => {
  const store = new Map<string, Transaction>(initial.map(t => [t.id, t]))

  return {
    create: (transaction) => {
      if (store.has(transaction.id)) {
        return errAsync(dbErr(`Transaction already exists: ${transaction.id}`))
      }
      store.set(transaction.id, transaction)
      return okAsync(transaction)
    },

    listByMerchant: (merchantId) => {
      const out: Transaction[] = []
      for (const t of store.values()) {
        if (t.merchantId === merchantId) out.push(t)
      }
      return okAsync(out)
    },

    listByBuyer: (merchantId, buyerId) => {
      const out: Transaction[] = []
      for (const t of store.values()) {
        if (t.merchantId === merchantId && t.buyerId === buyerId) out.push(t)
      }
      return okAsync(out)
    },

    topBuyersByFrequency: (merchantId, limit) => {
      const counts = new Map<string, number>()
      for (const t of store.values()) {
        if (t.merchantId !== merchantId || !t.buyerId) continue
        counts.set(t.buyerId, (counts.get(t.buyerId) ?? 0) + 1)
      }
      const ranked = [...counts.entries()]
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([buyerId, txCount]): BuyerFrequency => ({ buyerId, txCount }))
      return okAsync(ranked)
    },
  }
}

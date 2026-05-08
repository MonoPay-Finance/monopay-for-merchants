import { tryCatchAsync } from '@/lib/resultPattern'
import { toDBError } from '@/db/errors'
import type { BuyerFrequency, Transaction, TransactionRepository } from '@/db/ports/transaction.repository'
import { fsCreate, fsQuery } from './client'

export const transactionRepo: TransactionRepository = {
  listByMerchant: (merchantId) =>
    tryCatchAsync(
      () => fsQuery<Transaction>('transactions', [{ field: 'merchantId', value: merchantId }]),
      toDBError
    ),

  listByBuyer: (merchantId, buyerId) =>
    tryCatchAsync(
      () =>
        fsQuery<Transaction>('transactions', [
          { field: 'merchantId', value: merchantId },
          { field: 'buyerId', value: buyerId },
        ]),
      toDBError
    ),

  create: (transaction) =>
    tryCatchAsync(() => fsCreate<Transaction>('transactions', transaction.id, transaction), toDBError),

  topBuyersByFrequency: (merchantId, limit) =>
    tryCatchAsync(async () => {
      const txns = await fsQuery<Transaction>('transactions', [
        { field: 'merchantId', value: merchantId },
      ])

      const counts = new Map<string, number>()
      for (const t of txns) {
        if (t.buyerId) {
          counts.set(t.buyerId, (counts.get(t.buyerId) ?? 0) + 1)
        }
      }

      return [...counts.entries()]
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([buyerId, txCount]): BuyerFrequency => ({ buyerId, txCount }))
    }, toDBError),
}

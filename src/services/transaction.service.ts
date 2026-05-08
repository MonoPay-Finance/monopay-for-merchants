import { errAsync, ResultAsync } from 'neverthrow'
import type {
  BuyerFrequency,
  Transaction,
  TransactionRepository,
} from '@/db/ports/transaction.repository'
import type { DBError } from '@/db/errors'
import { parseTransaction, type TransactionValidationError } from '@/zod/schemas/transaction.schema'

export type TransactionServiceDeps = { transactions: TransactionRepository }

export const makeTransactionService = (deps: TransactionServiceDeps) => ({
  recordTransaction: (
    rawInput: unknown
  ): ResultAsync<Transaction, TransactionValidationError | DBError> => {
    const parsed = parseTransaction(rawInput)
    if (parsed.isErr()) return errAsync(parsed.error)
    return deps.transactions.create(parsed.value)
  },

  listForMerchant: (merchantId: string): ResultAsync<Transaction[], DBError> =>
    deps.transactions.listByMerchant(merchantId),

  listForBuyer: (merchantId: string, buyerId: string): ResultAsync<Transaction[], DBError> =>
    deps.transactions.listByBuyer(merchantId, buyerId),

  getTopBuyers: (merchantId: string, limit: number): ResultAsync<BuyerFrequency[], DBError> =>
    deps.transactions.topBuyersByFrequency(merchantId, limit),
})

export type TransactionService = ReturnType<typeof makeTransactionService>

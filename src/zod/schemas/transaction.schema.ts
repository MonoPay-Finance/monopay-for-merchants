import { z } from 'zod'
import { Result } from 'neverthrow'
import { parseWith, makeValidationError, ValidationError } from '@/lib/zodPattern'
import type { Transaction } from '@/db/ports/transaction.repository'
import { cleanOptional } from '@/zod/_helpers'

export const TransactionStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'FAILED'])

const TransactionInputSchema = z.object({
  id: z.string().min(1),
  merchantId: z.string().min(1),
  buyerId: z.string().min(1).optional(),
  cartId: z.string().min(1),
  dodoPaymentId: z.string().min(1).optional(),
  assetSymbol: z.string().min(1),
  currency: z.string().length(3),
  amount: z.number().int().nonnegative(),
  status: TransactionStatusSchema,
  createdAtIso: z.string().datetime(),
})

export const TransactionSchema = TransactionInputSchema.transform(cleanOptional<Transaction>())

export type TransactionValidationError = ValidationError<'TRANSACTION_VALIDATION_ERROR'>

const toTransactionError = makeValidationError('TRANSACTION_VALIDATION_ERROR')

export const parseTransaction = (raw: unknown): Result<Transaction, TransactionValidationError> =>
  parseWith(TransactionSchema, raw, toTransactionError)

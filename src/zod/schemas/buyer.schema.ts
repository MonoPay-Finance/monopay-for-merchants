import { z } from 'zod'
import { Result } from 'neverthrow'
import { parseWith, makeValidationError, ValidationError } from '@/lib/zodPattern'
import type { Buyer } from '@/db/ports/buyer.repository'
import { cleanOptional } from '@/zod/_helpers'

const BuyerInputSchema = z.object({
  id: z.string().min(1),
  walletAddress: z.string().min(1),
  nickname: z.string().min(1).optional(),
  email: z.string().email().optional(),
  dodoCustomerId: z.string().min(1).optional(),
  expoPushTokenEncrypted: z.string().min(1).optional(),
})

export const BuyerSchema = BuyerInputSchema.transform(cleanOptional<Buyer>())

export type BuyerValidationError = ValidationError<'BUYER_VALIDATION_ERROR'>

const toBuyerError = makeValidationError('BUYER_VALIDATION_ERROR')

export const parseBuyer = (raw: unknown): Result<Buyer, BuyerValidationError> =>
  parseWith(BuyerSchema, raw, toBuyerError)

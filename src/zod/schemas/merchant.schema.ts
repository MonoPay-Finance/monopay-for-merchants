import { z } from 'zod'
import { Result } from 'neverthrow'
import { parseWith, makeValidationError, ValidationError } from '@/lib/zodPattern'
import type { Merchant } from '@/db/ports/merchant.repository'
import { cleanOptional } from '@/zod/_helpers'

const MerchantInputSchema = z.object({
  id: z.string().min(1),
  walletAddress: z.string().min(1),
  displayName: z.string().min(1),
  storefrontName: z.string().min(1).optional(),
  storefrontDescription: z.string().optional(),
  storefrontLogoUrl: z.string().url().optional(),
  dodoBusinessId: z.string().min(1).optional(),
  preferredCurrency: z.string().length(3),
  createdAtIso: z.string().datetime(),
  updatedAtIso: z.string().datetime().optional(),
})

export const MerchantSchema = MerchantInputSchema.transform(cleanOptional<Merchant>())

export type MerchantValidationError = ValidationError<'MERCHANT_VALIDATION_ERROR'>

const toMerchantError = makeValidationError('MERCHANT_VALIDATION_ERROR')

export const parseMerchant = (raw: unknown): Result<Merchant, MerchantValidationError> =>
  parseWith(MerchantSchema, raw, toMerchantError)

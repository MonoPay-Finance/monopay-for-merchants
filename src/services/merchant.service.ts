import { errAsync, ResultAsync } from 'neverthrow'
import type { Merchant, MerchantRepository } from '@/db/ports/merchant.repository'
import type { DBError } from '@/db/errors'
import { parseMerchant, type MerchantValidationError } from '@/zod/schemas/merchant.schema'

export type MerchantServiceDeps = { merchants: MerchantRepository }

export const makeMerchantService = (deps: MerchantServiceDeps) => ({
  getMerchant: (id: string): ResultAsync<Merchant, DBError> =>
    deps.merchants.getById(id),

  getMerchantByWallet: (walletAddress: string): ResultAsync<Merchant, DBError> =>
    deps.merchants.getByWallet(walletAddress),

  upsertMerchant: (rawInput: unknown): ResultAsync<Merchant, MerchantValidationError | DBError> => {
    const parsed = parseMerchant(rawInput)
    if (parsed.isErr()) return errAsync(parsed.error)
    return deps.merchants.upsert(parsed.value)
  },
})

export type MerchantService = ReturnType<typeof makeMerchantService>

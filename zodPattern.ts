import { z, ZodError } from 'zod'
import { ok, err, Result } from 'neverthrow'

// Convention enforced — must end with _VALIDATION_ERROR
type ValidationErrorType = `${Uppercase<string>}_VALIDATION_ERROR`

// Generic error shape
type ValidationError<T extends ValidationErrorType> = {
  type: T
  fields: { path: string; message: string }[]
}

// Core wrapper — converts safeParse result to neverthrow Result
function parseWith<T, E>(
  schema: z.ZodSchema<T>,
  data: unknown,
  mapError: (e: ZodError) => E
): Result<T, E> {
  const result = schema.safeParse(data)
  return result.success ? ok(result.data) : err(mapError(result.error))
}

// Factory — binds error type string, returns a mapError function
const makeValidationError = <T extends ValidationErrorType>(type: T) =>
  (zodError: ZodError): ValidationError<T> => ({
    type,
    fields: zodError.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  })

// --- Per domain --- //

const AccountSchema = z.object({
  email: z.string().email(),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive(),
})

type Account = z.infer<typeof AccountSchema>

// Maps ZodError → AccountValidationError
const toAccountError = makeValidationError('ACCOUNT_VALIDATION_ERROR')

// Public API — caller only deals with data and Result
const parseAccount = (data: unknown) => parseWith(AccountSchema, data, toAccountError)

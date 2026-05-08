import { z, ZodError } from 'zod'
import { ok, err, Result } from 'neverthrow'

// Convention enforced — must end with _VALIDATION_ERROR
export type ValidationErrorType = `${Uppercase<string>}_VALIDATION_ERROR`

// Generic error shape
export type ValidationError<T extends ValidationErrorType> = {
  type: T
  fields: { path: string; message: string }[]
}

// Core wrapper — converts safeParse result to neverthrow Result
export function parseWith<T, E>(
  schema: z.ZodSchema<T>,
  data: unknown,
  mapError: (e: ZodError) => E
): Result<T, E> {
  const result = schema.safeParse(data)
  return result.success ? ok(result.data) : err(mapError(result.error))
}

// Factory — binds error type string, returns a mapError function
export const makeValidationError = <T extends ValidationErrorType>(type: T) =>
  (zodError: ZodError): ValidationError<T> => ({
    type,
    fields: zodError.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  })

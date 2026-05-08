import { z } from 'zod'
import { Result } from 'neverthrow'
import { parseWith, makeValidationError, ValidationError } from '@/lib/validation'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().optional(),
  DODO_PAYMENTS_API_KEY: z.string().min(1),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().min(1),
  DODO_PAYMENTS_RETURN_URL: z.string().url(),
  DODO_PAYMENTS_ENVIRONMENT: z.enum(['test_mode', 'live_mode']),
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
})

export type Env = z.infer<typeof EnvSchema>
export type EnvValidationError = ValidationError<'ENV_VALIDATION_ERROR'>

const toEnvError = makeValidationError('ENV_VALIDATION_ERROR')

export const parseEnv = (raw: unknown): Result<Env, EnvValidationError> =>
  parseWith(EnvSchema, raw, toEnvError)

const parsedEnv = parseEnv(process.env)
if (parsedEnv.isErr()) {
  console.error('Invalid environment configuration', parsedEnv.error.fields)
  process.exit(1)
}

export const env: Env = parsedEnv.value

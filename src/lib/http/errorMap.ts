import type { DBError } from '@/db/errors'
import type { DodoError, WebhookSignatureError } from '@/lib/dodo/errors'
import type { ExpoError } from '@/lib/expo/errors'
import type { ValidationError, ValidationErrorType } from '@/lib/zodPattern'

// Discriminated union of every error type that can surface at a route boundary.
export type RouteError =
  | ValidationError<ValidationErrorType>
  | DBError
  | DodoError
  | ExpoError
  | WebhookSignatureError

// Single source of truth for error → HTTP status mapping.
// Routes never recreate this — they import and apply.
export const mapErrorToStatus = (error: RouteError): number => {
  if (error.type === 'WEBHOOK_SIGNATURE_ERROR') return 401
  if (error.type === 'DB_ERROR') return 500
  if (error.type === 'DODO_ERROR') return 502
  if (error.type === 'EXPO_ERROR') return 502
  // Remaining variant is ValidationError<ValidationErrorType>
  return 400
}

// Convenience: build a Response from any route error.
export const errorResponse = (error: RouteError): Response =>
  Response.json(error, { status: mapErrorToStatus(error) })

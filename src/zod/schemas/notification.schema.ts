import { z } from 'zod'
import { Result } from 'neverthrow'
import { parseWith, makeValidationError, ValidationError } from '@/lib/zodPattern'
import { cleanOptional } from '@/zod/_helpers'

// Notification has no DB port — its shape is the validation contract itself.
export type Notification = {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

const NotificationInputSchema = z.object({
  token: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string(), z.string()).optional(),
})

export const NotificationSchema = NotificationInputSchema.transform(cleanOptional<Notification>())

export type NotificationValidationError = ValidationError<'NOTIFICATION_VALIDATION_ERROR'>

const toNotificationError = makeValidationError('NOTIFICATION_VALIDATION_ERROR')

export const parseNotification = (raw: unknown): Result<Notification, NotificationValidationError> =>
  parseWith(NotificationSchema, raw, toNotificationError)

import { ResultAsync } from 'neverthrow'
import { tryCatchAsync } from '@/lib/resultPattern'
import { env } from '@/lib/env'
import { toExpoError, type ExpoError } from './errors'

export type ExpoPushPayload = {
  token: string                       // Expo push token (ExponentPushToken[...])
  title: string
  body: string
  data?: Record<string, string>       // arbitrary key/value sent with the notification
}

// Sends a push notification by calling the Cloudflare Worker that fronts
// the Expo push service. The worker handles Expo's protocol (Authorization,
// batching, receipt fetching) — this side just posts the payload.
export const sendPush = (payload: ExpoPushPayload): ResultAsync<{ ok: true }, ExpoError> =>
  tryCatchAsync(async () => {
    const workerUrl = env.WORKER_URL
    const workerSecret = env.WORKER_SECRET
    if (!workerUrl || !workerSecret) {
      throw new Error('Push worker not configured: WORKER_URL and WORKER_SECRET must be set')
    }

    const res = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': workerSecret,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Push worker returned ${res.status}: ${await res.text()}`)
    }

    return { ok: true as const }
  }, toExpoError)

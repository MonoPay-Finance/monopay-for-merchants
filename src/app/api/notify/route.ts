import { tryCatchAsync } from '@/lib/resultPattern'
import { parseNotification } from '@/zod/schemas/notification.schema'
import { sendPush } from '@/lib/expo/push'
import { errorResponse } from '@/lib/http/errorMap'

export async function POST(req: Request): Promise<Response> {
  const body = await tryCatchAsync(
    () => req.json() as Promise<unknown>,
    () => ({
      type: 'NOTIFICATION_VALIDATION_ERROR' as const,
      fields: [{ path: '_body', message: 'Invalid JSON' }],
    })
  )
  if (body.isErr()) return errorResponse(body.error)

  const parsed = parseNotification(body.value)
  if (parsed.isErr()) return errorResponse(parsed.error)

  const sent = await sendPush({
    token: parsed.value.token,
    title: parsed.value.title,
    body: parsed.value.body,
    ...(parsed.value.data !== undefined && { data: parsed.value.data }),
  })
  if (sent.isErr()) return errorResponse(sent.error)

  return Response.json({ ok: true }, { status: 200 })
}

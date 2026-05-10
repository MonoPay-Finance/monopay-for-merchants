export type DodoError = {
  type: 'DODO_ERROR'
  message: string
  code?: number
}

export type WebhookSignatureError = {
  type: 'WEBHOOK_SIGNATURE_ERROR'
  message: string
}

export const toWebhookSignatureError = (cause: unknown): WebhookSignatureError => ({
  type: 'WEBHOOK_SIGNATURE_ERROR',
  message: cause instanceof Error ? cause.message : 'Webhook signature verification failed',
})

// Maps any thrown value from the Dodo SDK into our typed DodoError.
// Dodo SDK errors carry `.status` (HTTP status); preserve it as `code`.
export const toDodoError = (cause: unknown): DodoError => {
  const message = cause instanceof Error ? cause.message : 'Dodo API error'
  const rawStatus = (cause as { status?: unknown } | null)?.status
  const code = typeof rawStatus === 'number' ? rawStatus : undefined
  return code !== undefined
    ? { type: 'DODO_ERROR', message, code }
    : { type: 'DODO_ERROR', message }
}

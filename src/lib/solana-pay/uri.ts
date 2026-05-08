// Solana Pay URI builder per spec:
// solana:<recipient>?amount=...&spl-token=...&reference=...&label=...&message=...&memo=...
// https://docs.solanapay.com/spec

export type SolanaPayParams = {
  recipient: string                  // wallet address (base58)
  amount?: number | string           // payment amount (decimal string preserves precision)
  splToken?: string                  // SPL token mint address (omit for native SOL)
  reference?: string | string[]      // unique reference(s) for tracking on-chain
  label?: string                     // merchant name (URL-encoded for display)
  message?: string                   // human-readable description
  memo?: string                      // short memo string written into the transaction
}

// Pure function — encodes params into a Solana Pay URI string.
// Validation should happen before calling (via Zod schema at the route boundary).
export const buildSolanaPayURI = (params: SolanaPayParams): string => {
  const parts: string[] = []

  if (params.amount !== undefined) {
    parts.push(`amount=${encodeURIComponent(String(params.amount))}`)
  }
  if (params.splToken !== undefined) {
    parts.push(`spl-token=${encodeURIComponent(params.splToken)}`)
  }
  if (params.reference !== undefined) {
    const refs = Array.isArray(params.reference) ? params.reference : [params.reference]
    for (const ref of refs) {
      parts.push(`reference=${encodeURIComponent(ref)}`)
    }
  }
  if (params.label !== undefined) {
    parts.push(`label=${encodeURIComponent(params.label)}`)
  }
  if (params.message !== undefined) {
    parts.push(`message=${encodeURIComponent(params.message)}`)
  }
  if (params.memo !== undefined) {
    parts.push(`memo=${encodeURIComponent(params.memo)}`)
  }

  const qs = parts.length > 0 ? `?${parts.join('&')}` : ''
  return `solana:${params.recipient}${qs}`
}

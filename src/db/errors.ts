// Shared DB error contract used by repository ports.
export type DBError = {
  type: 'DB_ERROR'
  message: string
  cause?: unknown
}

export const toDBError = (cause: unknown): DBError => ({
  type: 'DB_ERROR',
  message: cause instanceof Error ? cause.message : 'Database operation failed',
  cause,
})

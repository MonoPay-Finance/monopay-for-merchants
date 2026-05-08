// Shared DB error contract used by repository ports.
export type DBError = {
  type: 'DB_ERROR'
  message: string
  cause?: unknown
}

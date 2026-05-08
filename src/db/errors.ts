export type DBError = {
  type: 'DB_ERROR'
  message: string
  cause?: unknown
}

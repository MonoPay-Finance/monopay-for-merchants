export type ExpoError = {
  type: 'EXPO_ERROR'
  message: string
}

export const toExpoError = (cause: unknown): ExpoError => ({
  type: 'EXPO_ERROR',
  message: cause instanceof Error ? cause.message : 'Push notification failed',
})

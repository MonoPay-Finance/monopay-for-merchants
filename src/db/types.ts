import { tryCatchAsync, tryCatchSync } from '@/lib/result'

export type SyncResult<T, E> = ReturnType<typeof tryCatchSync<T, E>>
export type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

import { tryCatchSync } from '@/lib/result'
import type { DBError } from '@/db/errors'
import type { DatabaseAdapter } from '@/db/index'
import type { SyncResult } from '@/db/types'

export type FirebaseAdapterConfig = {
  projectId: string
}

export const createFirebaseAdapter = (
  _config: FirebaseAdapterConfig
): SyncResult<DatabaseAdapter, DBError> =>
  tryCatchSync(
    () => {
      throw new Error('Firebase adapter not implemented yet.')
    },
    (e) => ({
      type: 'DB_ERROR',
      message: e instanceof Error ? e.message : 'Firebase adapter initialization failed.',
      cause: e,
    })
  )

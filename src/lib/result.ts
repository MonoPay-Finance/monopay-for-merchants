import { ok, err, Result, ResultAsync } from 'neverthrow'

export function tryCatchSync<T, E>(
  fn: () => T,
  mapError: (e: unknown) => E
): Result<T, E> {
  try {
    return ok(fn())
  } catch (e) {
    return err(mapError(e))
  }
}

export function tryCatchAsync<T, E>(
  fn: () => Promise<T>,
  mapError: (e: unknown) => E
): ResultAsync<T, E> {
  return ResultAsync.fromPromise(fn(), mapError)
}

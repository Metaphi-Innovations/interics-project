const inflight = new Map<string, Promise<unknown>>()

/**
 * Deduplicate concurrent identical requests (e.g. React StrictMode double mount).
 * The first caller runs `run`; overlapping callers await the same promise.
 */
export function withInflight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>

  const promise = run().finally(() => {
    if (inflight.get(key) === promise) {
      inflight.delete(key)
    }
  })

  inflight.set(key, promise)
  return promise
}

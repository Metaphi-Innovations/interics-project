/** Unwrap `{ success, data }` envelopes while accepting flat MSW/legacy payloads. */
export function unwrapApiData<T>(payload: unknown): T {
  if (payload != null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if ('success' in record && 'data' in record) {
      return record.data as T
    }
  }
  return payload as T
}

export function unwrapApiList<T>(payload: unknown): T[] {
  const data = unwrapApiData<unknown>(payload)
  if (Array.isArray(data)) return data as T[]
  if (data != null && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.items)) return record.items as T[]
    if (Array.isArray(record.data)) return record.data as T[]
  }
  return []
}

export type ListMeta = { total: number; page?: number; limit?: number; totalPages?: number }

export type ListResult<T> = { items: T[]; meta: ListMeta }

/** Parse `{ success, data: T[], meta }` list envelopes (sendSuccess shape). */
export function unwrapApiListWithMeta<T>(payload: unknown): ListResult<T> {
  const items = unwrapApiList<T>(payload)
  let meta: ListMeta = { total: items.length }

  if (payload != null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const rawMeta =
      'meta' in record && record.meta != null && typeof record.meta === 'object'
        ? (record.meta as Record<string, unknown>)
        : null

    if (rawMeta) {
      meta = {
        total: typeof rawMeta.total === 'number' ? rawMeta.total : items.length,
        ...(typeof rawMeta.page === 'number' ? { page: rawMeta.page } : {}),
        ...(typeof rawMeta.limit === 'number' ? { limit: rawMeta.limit } : {}),
        ...(typeof rawMeta.totalPages === 'number' ? { totalPages: rawMeta.totalPages } : {}),
      }
    }
  }

  return { items, meta }
}

export function compactQueryParams(
  params: Record<string, unknown>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => {
      if (value === undefined || value === null) return []
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed ? [[key, trimmed]] : []
      }
      return [[key, value as string | number | boolean]]
    }),
  )
}

export type UiStatus = 'active' | 'inactive'

export function toUiStatus(value: boolean | string | null | undefined): UiStatus {
  if (typeof value === 'boolean') return value ? 'active' : 'inactive'
  if (typeof value === 'string') {
    const normalized = value.toUpperCase()
    if (normalized === 'ACTIVE' || normalized === 'TRUE') return 'active'
  }
  return 'inactive'
}

export function toApiStatus(status: UiStatus): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

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

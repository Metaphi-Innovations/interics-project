/** Coerce various paginated list API shapes into `{ items, total }`. */
export function normalizeListResponse<T>(data: unknown): { items: T[]; total: number } {
  if (data == null || typeof data !== 'object') {
    return { items: [], total: 0 }
  }
  if (Array.isArray(data)) {
    const items = data as T[]
    return { items, total: items.length }
  }
  const d = data as Record<string, unknown>
  if (Array.isArray(d.items)) {
    const items = d.items as T[]
    const total =
      typeof d.total === 'number' && Number.isFinite(d.total) ? d.total : items.length
    return { items, total }
  }
  if (Array.isArray(d.data)) {
    const items = d.data as T[]
    const total =
      typeof d.total === 'number' && Number.isFinite(d.total) ? d.total : items.length
    return { items, total }
  }
  if (Array.isArray(d.results)) {
    const items = d.results as T[]
    const total =
      typeof d.total === 'number' && Number.isFinite(d.total)
        ? d.total
        : typeof d.count === 'number'
          ? d.count
          : items.length
    return { items, total }
  }
  return { items: [], total: 0 }
}

/** Coerce various list API shapes into a plain array (e.g. users, roles). */
export function normalizeArrayResponse<T>(data: unknown): T[] {
  if (data == null) return []
  if (Array.isArray(data)) return data as T[]
  if (typeof data !== 'object') return []
  const d = data as Record<string, unknown>
  if (Array.isArray(d.items)) return d.items as T[]
  if (Array.isArray(d.data)) return d.data as T[]
  if (Array.isArray(d.results)) return d.results as T[]
  return []
}

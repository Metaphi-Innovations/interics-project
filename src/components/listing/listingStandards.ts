/** Shared listing pagination defaults for Phase 2 (Expense-canonical). */
export const LISTING_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const LISTING_DEFAULT_PAGE_SIZE = 10

/** Return true when both dates are set and from > to (invalid range). */
export function isInvalidDateRange(dateFrom?: string | null, dateTo?: string | null): boolean {
  const from = dateFrom?.trim() ?? ''
  const to = dateTo?.trim() ?? ''
  if (!from || !to) return false
  return from > to
}

/**
 * Normalize a date-only API param. Prefer YYYY-MM-DD already;
 * avoid UTC day-shift by not using toISOString() on local midnights.
 */
export function toDateOnlyParam(value?: string | null): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return undefined
}

/** Clamp a 0-based page index so it never exceeds the last valid page. */
export function clampListingPage0Based(page: number, total: number, pageSize: number): number {
  const size = Math.max(1, pageSize || 1)
  if (total <= 0) return 0
  const maxPage = Math.max(0, Math.ceil(total / size) - 1)
  return Math.min(Math.max(0, page), maxPage)
}

/** Clamp a 1-based page index so it never exceeds the last valid page. */
export function clampListingPage1Based(page: number, total: number, pageSize: number): number {
  return clampListingPage0Based(page - 1, total, pageSize) + 1
}

/** Footer copy for ListingTemplate — never produces inverted ranges. */
export function formatListingShowingLabel(page0Based: number, pageSize: number, total: number): string {
  if (total <= 0) return 'Showing 0–0 of 0'
  const size = Math.max(1, pageSize || 1)
  const page = clampListingPage0Based(page0Based, total, size)
  const start = page * size + 1
  const end = Math.min((page + 1) * size, total)
  return `Showing ${start}–${end} of ${total}`
}

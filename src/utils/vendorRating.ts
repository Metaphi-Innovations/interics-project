/** Normalized vendor rating on a 0–5 scale (null when unrated). */
export function normalizeVendorRating(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value <= 0) return null
  return Math.min(5, Math.max(0, value))
}

export function formatVendorRating(value: number | null | undefined): string {
  const rating = normalizeVendorRating(value)
  if (rating == null) return '—'
  return rating.toFixed(1)
}

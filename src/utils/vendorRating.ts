/** Normalized vendor rating on a 0–5 scale (null when unrated). */
export function normalizeVendorRating(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  if (value < 0 || value > 5) return null
  return Math.round(value * 10) / 10
}

export const VENDOR_RATING_MIN = 0
export const VENDOR_RATING_MAX = 5

/** Clamp and round a vendor rating to one decimal between 0.0 and 5.0. */
export function clampVendorRating(value: number): number {
  const rounded = Math.round(value * 10) / 10
  return Math.min(VENDOR_RATING_MAX, Math.max(VENDOR_RATING_MIN, rounded))
}

const ONE_DECIMAL_PATTERN = /^\d+(\.\d)?$/

export function validateVendorRatingInput(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return 'Rating is required'
  if (!ONE_DECIMAL_PATTERN.test(trimmed)) {
    return 'Enter a valid number with at most one decimal place'
  }
  const [, decimals] = trimmed.split('.')
  if (decimals && decimals.length > 1) {
    return 'Allow only one decimal place'
  }
  const num = Number(trimmed)
  if (Number.isNaN(num)) return 'Enter a valid rating'
  if (num < VENDOR_RATING_MIN) return 'Minimum rating is 0.0'
  if (num > VENDOR_RATING_MAX) return 'Maximum rating is 5.0'
  return undefined
}

export function parseVendorRatingInput(raw: string): number | null {
  const error = validateVendorRatingInput(raw)
  if (error) return null
  return clampVendorRating(Number(raw.trim()))
}

export function formatVendorRating(value: number | null | undefined): string {
  const rating = normalizeVendorRating(value)
  if (rating == null) return '—'
  return rating.toFixed(1)
}

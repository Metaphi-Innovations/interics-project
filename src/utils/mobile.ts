/** Shared Indian mobile helpers — 10 digits only (6–9 start). Use for all mobile inputs. */

export const INDIAN_MOBILE_DIGITS_REGEX = /^[6-9]\d{9}$/
export const MOBILE_VALIDATION_MESSAGE =
  'Enter a valid 10-digit mobile number starting with 6–9'

/** Strip to local 10-digit mobile when value includes +91 / 0 / formatting. */
export function extractIndianMobileDigits(phone: string | null | undefined): string {
  const digits = (phone ?? '').trim().replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

/** Digits-only input clamp for mobile TextFields (max 10). */
export function sanitizeMobileInput(value: string): string {
  return extractIndianMobileDigits(value).slice(0, 10)
}

export function isValidIndianMobileDigits(value: string | null | undefined): boolean {
  return INDIAN_MOBILE_DIGITS_REGEX.test(extractIndianMobileDigits(value))
}

/**
 * Frontend validators aligned with backend Zod schemas under
 * src/modules/system-settings (*.validator.ts) and shared common.validator.
 * Do not invent stricter business rules here.
 */

import {
  MOBILE_VALIDATION_MESSAGE,
  extractIndianMobileDigits,
  isValidIndianMobileDigits,
} from '@/utils/mobile'

export type FieldErrorMap = Record<string, string>

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PINCODE_REGEX = /^[1-9][0-9]{5}$/
const SAC_CODE_REGEX = /^\d{6}$/
const ALLOWED_SERVICE_GST_RATES = [0, 5, 12, 18, 28] as const
const ALLOWED_PAGINATION = [10, 25, 50, 100] as const

function trim(value: string | null | undefined): string {
  return (value ?? '').trim()
}

export function normalizePhone(phone: string): string {
  const digits = extractIndianMobileDigits(phone)
  if (isValidIndianMobileDigits(digits)) return `+91${digits}`
  return phone.trim().replace(/[\s\-()]/g, '')
}

export function requiredText(
  value: string | null | undefined,
  label: string,
  max?: number,
): string | undefined {
  const v = trim(value)
  if (!v) return `${label} is required`
  if (max != null && v.length > max) return `${label} must be at most ${max} characters`
  return undefined
}

const ALPHABETIC_NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/

/** Letters and single spaces only (aligned with backend alphabeticNameSchema). */
export function requiredAlphabeticName(
  value: string | null | undefined,
  label: string,
  max?: number,
): string | undefined {
  const required = requiredText(value, label, max)
  if (required) return required
  if (!ALPHABETIC_NAME_REGEX.test(trim(value))) {
    return `${label} must contain only alphabetic characters.`
  }
  return undefined
}

export function optionalMaxLength(
  value: string | null | undefined,
  label: string,
  max: number,
): string | undefined {
  const v = trim(value)
  if (!v) return undefined
  if (v.length > max) return `${label} must be at most ${max} characters`
  return undefined
}

export function optionalGstin(value: string | null | undefined): string | undefined {
  const v = trim(value).toUpperCase().replace(/\s/g, '')
  if (!v) return undefined
  if (!GSTIN_REGEX.test(v)) return 'Invalid GSTIN format'
  return undefined
}

export function optionalPan(value: string | null | undefined): string | undefined {
  const v = trim(value).toUpperCase().replace(/\s/g, '')
  if (!v) return undefined
  if (!PAN_REGEX.test(v)) return 'Invalid PAN format'
  return undefined
}

export function optionalEmail(value: string | null | undefined): string | undefined {
  const v = trim(value).toLowerCase()
  if (!v) return undefined
  if (!EMAIL_REGEX.test(v)) return 'Invalid email format'
  return undefined
}

export function optionalPhone(value: string | null | undefined): string | undefined {
  const raw = trim(value)
  if (!raw) return undefined
  if (!isValidIndianMobileDigits(raw)) return MOBILE_VALIDATION_MESSAGE
  return undefined
}

export function requiredPhone(value: string | null | undefined): string | undefined {
  const raw = trim(value)
  if (!raw) return 'Mobile number is required'
  if (!isValidIndianMobileDigits(raw)) return MOBILE_VALIDATION_MESSAGE
  return undefined
}

export function optionalWebsite(value: string | null | undefined): string | undefined {
  const raw = trim(value)
  if (!raw) return undefined
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    // eslint-disable-next-line no-new
    new URL(withProtocol)
  } catch {
    return 'Invalid website URL'
  }
  return undefined
}

export function optionalPincode(value: string | null | undefined): string | undefined {
  const v = trim(value)
  if (!v) return undefined
  if (!PINCODE_REGEX.test(v)) return 'Invalid pincode format'
  return undefined
}

export function requiredPincode(value: string | null | undefined): string | undefined {
  const v = trim(value)
  if (!v) return 'Pincode is required'
  if (!PINCODE_REGEX.test(v)) return 'Invalid pincode format'
  return undefined
}

export function optionalCompanyName(value: string | null | undefined): string | undefined {
  const v = trim(value)
  if (!v) return undefined
  if (v.length > 255) return 'Company name must be at most 255 characters'
  return undefined
}

export function ratePercent(value: number | null | undefined, label = 'Rate'): string | undefined {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return `${label} is required`
  }
  const n = Number(value)
  if (n < 0 || n > 100) return `${label} must be between 0 and 100`
  return undefined
}

/** Validate a raw rate text input so empty fields fail required checks (unlike numeric 0). */
export function requiredRateInput(raw: string | null | undefined, label = 'Rate'): string | undefined {
  const v = trim(raw)
  if (!v) return `${label} is required`
  const n = Number(v)
  if (!Number.isFinite(n)) return `${label} must be a number`
  if (n < 0 || n > 100) return `${label} must be between 0 and 100`
  return undefined
}

export function requiredSelect(
  value: string | null | undefined,
  label: string,
): string | undefined {
  if (!trim(value)) return `${label} is required`
  return undefined
}

export function serviceGstRate(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'GST rate is required'
  }
  const n = Number(value)
  if (!(ALLOWED_SERVICE_GST_RATES as readonly number[]).includes(n)) {
    return 'GST rate must be one of: 0, 5, 12, 18, 28'
  }
  return undefined
}

export function sacCode(value: string | null | undefined): string | undefined {
  const v = trim(value)
  if (!v) return 'SAC code is required'
  if (!SAC_CODE_REGEX.test(v)) return 'SAC code must be a 6-digit number'
  return undefined
}

export function requiredEntityId(value: string | null | undefined, label: string): string | undefined {
  const v = trim(value)
  if (!v) return `${label} is required`
  return undefined
}

export function paginationSize(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Default pagination is required'
  }
  if (!(ALLOWED_PAGINATION as readonly number[]).includes(Number(value))) {
    return 'Default pagination must be 10, 25, 50, or 100'
  }
  return undefined
}

export function collectErrors(entries: Array<[string, string | undefined]>): FieldErrorMap {
  const errors: FieldErrorMap = {}
  for (const [key, message] of entries) {
    if (message) errors[key] = message
  }
  return errors
}

export function hasErrors(errors: FieldErrorMap): boolean {
  return Object.keys(errors).length > 0
}

/** First field error message, useful when toasting without flooding. */
export function firstErrorMessage(errors: FieldErrorMap, fallback: string): string {
  const first = Object.values(errors)[0]
  return first ?? fallback
}

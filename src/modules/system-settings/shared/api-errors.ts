/**
 * Parse backend Settings API errors into toast message + field-level helpers.
 * Backend shape (validate.middleware / error.middleware):
 * { success: false, message: string, errors?: { field: string, message: string }[] }
 */

export type SettingsFieldErrors = Record<string, string>

export type SettingsApiError = {
  message: string
  fieldErrors: SettingsFieldErrors
}

type ApiErrorItem = { field?: string; message?: string }

type AxiosLikeError = {
  response?: {
    data?: {
      message?: unknown
      errors?: ApiErrorItem[] | unknown
    }
  }
  message?: string
}

/** Map API / Zod field paths to frontend form field keys. */
const DEFAULT_FIELD_ALIASES: Record<string, string> = {
  ratePercent: 'rate',
  sectionCode: 'section',
  defaultRatePercent: 'defaultRate',
  sacCode: 'code',
  gstSlabId: 'gstRateId',
  defaultPagination: 'defaultPaginationSize',
  autoArchiveCompletedProjects: 'autoArchiveDays',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isAxiosStatusMessage(message: string): boolean {
  return /^Request failed with status code \d+$/i.test(message.trim())
}

function humanizeTechnicalMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return 'Something went wrong. Please try again.'
  // Avoid dumping JSON / stack-ish payloads
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('\n    at ')) {
    return 'Something went wrong. Please try again.'
  }
  // Axios default message — never surface this; prefer response body / fallback
  if (isAxiosStatusMessage(trimmed)) {
    return ''
  }
  if (trimmed === 'Already exists') return 'This value already exists'
  if (trimmed === 'This GST rate value already exists') {
    return 'This GST rate value already exists'
  }
  if (trimmed === 'Validation failed' || trimmed === 'Query validation failed') {
    return 'Please fix the highlighted fields and try again'
  }
  return trimmed
}

function mapFieldKey(field: string, aliases: Record<string, string>): string {
  const raw = field.trim()
  if (!raw) return ''
  // Zod path may be nested; take leaf segment
  const leaf = raw.includes('.') ? raw.split('.').pop()! : raw
  return aliases[leaf] ?? aliases[raw] ?? leaf
}

function promoteSingleFieldError(
  message: string,
  fieldErrors: SettingsFieldErrors,
  fallback: string,
): string {
  if (
    (message === 'Please fix the highlighted fields and try again' || message === fallback) &&
    Object.keys(fieldErrors).length === 1
  ) {
    return Object.values(fieldErrors)[0] ?? message
  }
  return message
}

function parseAxiosLikeError(
  err: AxiosLikeError,
  fallback: string,
  aliases: Record<string, string>,
): SettingsApiError {
  const data = err.response?.data
  const fieldErrors: SettingsFieldErrors = {}

  if (data && Array.isArray(data.errors)) {
    for (const item of data.errors) {
      if (!item || typeof item !== 'object') continue
      const field = mapFieldKey(String(item.field ?? ''), aliases)
      const message = typeof item.message === 'string' ? item.message.trim() : ''
      if (!field || !message) continue
      if (!fieldErrors[field]) fieldErrors[field] = message
    }
  }

  const rawMessage =
    (typeof data?.message === 'string' && data.message.trim()) ||
    (typeof err.message === 'string' && !isAxiosStatusMessage(err.message) ? err.message : '') ||
    fallback

  let message = humanizeTechnicalMessage(String(rawMessage)) || fallback
  message = promoteSingleFieldError(message, fieldErrors, fallback)

  return { message: message || fallback, fieldErrors }
}

export function parseSettingsApiError(
  err: unknown,
  fallback = 'Request failed',
  fieldAliases: Record<string, string> = {},
): SettingsApiError {
  const aliases = { ...DEFAULT_FIELD_ALIASES, ...fieldAliases }

  // 1) Axios errors: prefer server response body over axios.status-code message
  if (isPlainObject(err) && isPlainObject(err.response)) {
    return parseAxiosLikeError(err as AxiosLikeError, fallback, aliases)
  }

  // 2) RTK rejectWithValue already structured ({ message, fieldErrors })
  if (isPlainObject(err) && typeof err.message === 'string' && 'fieldErrors' in err) {
    const fieldErrors: SettingsFieldErrors = isPlainObject(err.fieldErrors)
      ? (err.fieldErrors as SettingsFieldErrors)
      : {}
    let message = humanizeTechnicalMessage(err.message) || fallback
    message = promoteSingleFieldError(message, fieldErrors, fallback)
    return { message: message || fallback, fieldErrors }
  }

  // 3) rejectWithValue was a plain string
  if (typeof err === 'string') {
    return {
      message: humanizeTechnicalMessage(err) || fallback,
      fieldErrors: {},
    }
  }

  // 4) Plain { message } (non-Axios)
  if (isPlainObject(err) && typeof err.message === 'string') {
    const message = humanizeTechnicalMessage(err.message) || fallback
    return { message: message || fallback, fieldErrors: {} }
  }

  return { message: fallback, fieldErrors: {} }
}

/** Build RTK `rejectWithValue` payload from an Axios/API error. */
export function toSettingsRejectPayload(
  err: unknown,
  fallback: string,
  fieldAliases?: Record<string, string>,
): SettingsApiError {
  return parseSettingsApiError(err, fallback, fieldAliases)
}

/**
 * Safe string for toasts / JSX. Never returns an object (avoids React child errors).
 */
export function extractErrorMessage(err: unknown, fallback = 'Request failed'): string {
  return parseSettingsApiError(err, fallback).message
}

export function mergeFieldErrors(
  current: SettingsFieldErrors,
  incoming: SettingsFieldErrors,
): SettingsFieldErrors {
  return { ...current, ...incoming }
}

export function clearFieldError(
  current: SettingsFieldErrors,
  field: string,
): SettingsFieldErrors {
  if (!current[field]) return current
  const next = { ...current }
  delete next[field]
  return next
}

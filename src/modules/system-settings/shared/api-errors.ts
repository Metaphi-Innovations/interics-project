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

function humanizeTechnicalMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return 'Something went wrong. Please try again.'
  // Avoid dumping JSON / stack-ish payloads
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('\n    at ')) {
    return 'Something went wrong. Please try again.'
  }
  if (trimmed === 'Already exists') return 'This value already exists'
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

export function parseSettingsApiError(
  err: unknown,
  fallback = 'Request failed',
  fieldAliases: Record<string, string> = {},
): SettingsApiError {
  const aliases = { ...DEFAULT_FIELD_ALIASES, ...fieldAliases }

  // RTK rejectWithValue already structured
  if (isPlainObject(err) && typeof err.message === 'string' && isPlainObject(err.fieldErrors)) {
    return {
      message: humanizeTechnicalMessage(err.message) || fallback,
      fieldErrors: err.fieldErrors as SettingsFieldErrors,
    }
  }

  // rejectWithValue was a plain string
  if (typeof err === 'string') {
    return { message: humanizeTechnicalMessage(err) || fallback, fieldErrors: {} }
  }

  const axiosErr = err as AxiosLikeError
  const data = axiosErr.response?.data
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
    (typeof data?.message === 'string' && data.message) ||
    axiosErr.message ||
    fallback

  let message = humanizeTechnicalMessage(String(rawMessage))
  if (
    (message === 'Please fix the highlighted fields and try again' || message === fallback) &&
    Object.keys(fieldErrors).length === 1
  ) {
    message = Object.values(fieldErrors)[0] ?? message
  }

  return { message: message || fallback, fieldErrors }
}

/** Build RTK `rejectWithValue` payload from an Axios/API error. */
export function toSettingsRejectPayload(
  err: unknown,
  fallback: string,
  fieldAliases?: Record<string, string>,
): SettingsApiError {
  return parseSettingsApiError(err, fallback, fieldAliases)
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

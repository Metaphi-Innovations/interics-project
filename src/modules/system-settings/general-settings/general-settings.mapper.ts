import type { CompanyProfile } from '@/slices/settings/reducer'
import type {
  ApiCompanyType,
  FormCompanyType,
  SystemSettingsApi,
  UpdateSystemSettingsPayload,
} from './general-settings.types'

const FORM_TO_API_COMPANY_TYPE: Record<FormCompanyType, ApiCompanyType> = {
  pvt_ltd: 'PRIVATE_LIMITED',
  llp: 'LLP',
  proprietorship: 'PROPRIETORSHIP',
  partnership: 'PARTNERSHIP',
}

const API_TO_FORM_COMPANY_TYPE: Partial<Record<ApiCompanyType, FormCompanyType>> = {
  PRIVATE_LIMITED: 'pvt_ltd',
  LLP: 'llp',
  PROPRIETORSHIP: 'proprietorship',
  PARTNERSHIP: 'partnership',
}

const DEFAULT_COMPANY_TYPE: FormCompanyType = 'pvt_ltd'

function nullToEmpty(value: string | null | undefined): string {
  return value ?? ''
}

/** Cleared strings become `null` so the API persists clears (not omit via undefined). */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toFormCompanyType(value: ApiCompanyType | null | undefined): FormCompanyType {
  if (!value) return DEFAULT_COMPANY_TYPE
  return API_TO_FORM_COMPANY_TYPE[value] ?? DEFAULT_COMPANY_TYPE
}

function websiteForApi(website: string): string | null {
  return emptyToNull(website)
}

/** Unwrap `{ success, data }` envelopes while accepting flat MSW payloads. */
export function unwrapSystemSettingsResponse(payload: unknown): SystemSettingsApi {
  if (payload == null || typeof payload !== 'object') {
    throw new Error('Invalid system settings response')
  }
  const record = payload as Record<string, unknown>
  if ('success' in record && 'data' in record && record.data != null && typeof record.data === 'object') {
    return record.data as SystemSettingsApi
  }
  return payload as SystemSettingsApi
}

export function toCompanyProfile(settings: SystemSettingsApi): CompanyProfile {
  return {
    companyName: nullToEmpty(settings.companyName),
    gstin: nullToEmpty(settings.gstin),
    pan: nullToEmpty(settings.pan),
    companyType: toFormCompanyType(settings.companyType),
    email: nullToEmpty(settings.email),
    phone: nullToEmpty(settings.phone),
    website: nullToEmpty(settings.website),
    addressLine1: nullToEmpty(settings.addressLine1),
    addressLine2: nullToEmpty(settings.addressLine2),
    city: nullToEmpty(settings.city),
    state: nullToEmpty(settings.state),
    pincode: nullToEmpty(settings.pincode),
    logoUrl: settings.companyLogo ? '/system-settings/logo' : null,
  }
}

export function toUpdateSystemSettingsPayload(
  profile: Partial<CompanyProfile>,
): UpdateSystemSettingsPayload {
  const payload: UpdateSystemSettingsPayload = {}

  if (profile.companyName !== undefined) {
    payload.companyName = emptyToNull(profile.companyName)
  }
  if (profile.gstin !== undefined) {
    payload.gstin = emptyToNull(profile.gstin)
  }
  if (profile.pan !== undefined) {
    payload.pan = emptyToNull(profile.pan)
  }
  if (profile.companyType !== undefined) {
    payload.companyType = FORM_TO_API_COMPANY_TYPE[profile.companyType]
  }
  if (profile.email !== undefined) {
    payload.email = emptyToNull(profile.email)
  }
  if (profile.phone !== undefined) {
    payload.phone = emptyToNull(profile.phone)
  }
  if (profile.website !== undefined) {
    payload.website = websiteForApi(profile.website)
  }
  if (profile.addressLine1 !== undefined) {
    payload.addressLine1 = emptyToNull(profile.addressLine1)
  }
  if (profile.addressLine2 !== undefined) {
    payload.addressLine2 = emptyToNull(profile.addressLine2)
  }
  if (profile.city !== undefined) {
    payload.city = emptyToNull(profile.city)
  }
  if (profile.state !== undefined) {
    payload.state = emptyToNull(profile.state)
  }
  if (profile.pincode !== undefined) {
    payload.pincode = emptyToNull(profile.pincode)
  }

  return payload
}

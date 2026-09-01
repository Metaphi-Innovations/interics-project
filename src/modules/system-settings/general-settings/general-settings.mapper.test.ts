import { describe, expect, it } from 'vitest'
import {
  toCompanyProfile,
  toUpdateSystemSettingsPayload,
} from './general-settings.mapper'
import type { SystemSettingsApi } from './general-settings.types'
import type { CompanyProfile } from '@/slices/settings/reducer'

function baseApi(overrides: Partial<SystemSettingsApi> = {}): SystemSettingsApi {
  return {
    id: 'settings-1',
    organizationId: 'org-1',
    companyName: 'Acme',
    gstin: '29AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    companyType: 'PRIVATE_LIMITED',
    email: 'ops@acme.test',
    phone: '9999999999',
    website: 'https://acme.test',
    addressLine1: 'Line 1',
    addressLine2: 'Line 2',
    city: 'Bengaluru',
    state: 'KA',
    pincode: '560001',
    companyLogo: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdById: null,
    updatedById: null,
    ...overrides,
  }
}

describe('general-settings blank clear mapping', () => {
  it('maps null API fields to blank UI strings', () => {
    const profile = toCompanyProfile(
      baseApi({
        website: null,
        addressLine2: null,
        phone: null,
      }),
    )
    expect(profile.website).toBe('')
    expect(profile.addressLine2).toBe('')
    expect(profile.phone).toBe('')
    expect(profile.companyName).toBe('Acme')
  })

  it('sends null when clearing an existing field', () => {
    const profile: CompanyProfile = {
      ...toCompanyProfile(baseApi()),
      website: '',
      phone: '9999999999',
    }
    const payload = toUpdateSystemSettingsPayload(profile)
    expect(payload.website).toBeNull()
    expect(payload.phone).toBe('9999999999')
    expect(payload.companyName).toBe('Acme')
  })

  it('round-trips blank → value and value → blank', () => {
    const blanked = toUpdateSystemSettingsPayload({
      ...toCompanyProfile(baseApi({ email: 'a@b.com' })),
      email: '',
    })
    expect(blanked.email).toBeNull()

    const filled = toUpdateSystemSettingsPayload({
      ...toCompanyProfile(baseApi({ email: null })),
      email: 'new@acme.test',
    })
    expect(filled.email).toBe('new@acme.test')
  })

  it('clears one field while leaving another unchanged', () => {
    const payload = toUpdateSystemSettingsPayload({
      ...toCompanyProfile(baseApi()),
      addressLine2: '   ',
      city: 'Mumbai',
    })
    expect(payload.addressLine2).toBeNull()
    expect(payload.city).toBe('Mumbai')
    expect(payload.addressLine1).toBe('Line 1')
  })
})

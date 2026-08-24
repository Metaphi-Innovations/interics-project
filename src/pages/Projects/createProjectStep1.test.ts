import { describe, expect, it } from 'vitest'
import {
  extractIndianMobileDigits,
  isValidIndianMobileDigits,
  sanitizeMobileInput,
} from '@/utils/mobile'
import { toCreatePayload } from '@/modules/projects/projects.mapper'
import type { ProjectCreateFormInput } from '@/modules/projects/projects.types'

describe('Create Project Step 1 phone validation helpers', () => {
  it('accepts exactly 10 numeric digits', () => {
    expect(isValidIndianMobileDigits('9876543210')).toBe(true)
    expect(sanitizeMobileInput('9876543210')).toBe('9876543210')
  })

  it('rejects fewer or more than 10 digits', () => {
    expect(isValidIndianMobileDigits('987654321')).toBe(false)
    expect(isValidIndianMobileDigits('98765432101')).toBe(false)
    expect(sanitizeMobileInput('98765432101')).toBe('9876543210')
  })

  it('rejects non-numeric phone input after sanitization', () => {
    expect(sanitizeMobileInput('98ab65cd10')).toBe('986510')
    expect(isValidIndianMobileDigits('98ab65cd10')).toBe(false)
    expect(extractIndianMobileDigits('98 765-43210')).toBe('9876543210')
  })
})

describe('Create Project vendor payload mapping', () => {
  const baseForm: ProjectCreateFormInput = {
    customerId: '11111111-1111-4111-8111-111111111111',
    name: 'Alpha Tower',
    contactIds: ['22222222-2222-4222-8222-222222222222'],
    projectTypes: ['Office'],
    sector: 'Office',
    projectManagerId: '33333333-3333-4333-8333-333333333333',
  }

  it('omits vendor fields for customer-only create', () => {
    const payload = toCreatePayload(baseForm)
    expect(payload.customerId).toBe(baseForm.customerId)
    expect(payload.contactIds).toEqual(baseForm.contactIds)
    expect(payload.vendorId).toBeUndefined()
    expect(payload.vendorContactIds).toBeUndefined()
  })

  it('persists selected vendor and vendor contacts', () => {
    const payload = toCreatePayload({
      ...baseForm,
      vendorId: '44444444-4444-4444-8444-444444444444',
      vendorContactIds: [
        '55555555-5555-4555-8555-555555555555',
        '55555555-5555-4555-8555-555555555555',
      ],
    })
    expect(payload.vendorId).toBe('44444444-4444-4444-8444-444444444444')
    expect(payload.vendorContactIds).toEqual(['55555555-5555-4555-8555-555555555555'])
  })

  it('strips legacy-primary placeholders from vendorContactIds', () => {
    const payload = toCreatePayload({
      ...baseForm,
      vendorId: '44444444-4444-4444-8444-444444444444',
      vendorContactIds: ['legacy-primary', '55555555-5555-4555-8555-555555555555'],
    })
    expect(payload.vendorContactIds).toEqual(['55555555-5555-4555-8555-555555555555'])
  })

  it('omits vendorContactIds when only legacy placeholders are present', () => {
    const payload = toCreatePayload({
      ...baseForm,
      vendorId: '44444444-4444-4444-8444-444444444444',
      vendorContactIds: ['legacy-primary'],
    })
    expect(payload.vendorId).toBe('44444444-4444-4444-8444-444444444444')
    expect(payload.vendorContactIds).toBeUndefined()
  })
})

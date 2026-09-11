import { describe, it, expect } from 'vitest'
import {
  extractErrorMessage,
  parseSettingsApiError,
} from './api-errors'

describe('extractErrorMessage', () => {
  it('returns message from SettingsApiError-shaped reject payload', () => {
    expect(
      extractErrorMessage(
        {
          message: 'Vendor is linked to one or more projects and cannot be deleted.',
          fieldErrors: {},
        },
        'Failed to delete vendor',
      ),
    ).toBe('Vendor is linked to one or more projects and cannot be deleted.')
  })

  it('prefers API response body over Axios status-code message', () => {
    expect(
      extractErrorMessage(
        {
          message: 'Request failed with status code 422',
          response: {
            data: {
              success: false,
              message:
                'Vendor is linked to one or more projects and cannot be deleted. Please deactivate or unlink the vendor first.',
              errors: [],
            },
          },
        },
        'Failed to delete vendor',
      ),
    ).toBe(
      'Vendor is linked to one or more projects and cannot be deleted. Please deactivate or unlink the vendor first.',
    )
  })

  it('prefers single fieldError when message is generic validation', () => {
    const parsed = parseSettingsApiError(
      {
        message: 'Validation failed',
        fieldErrors: { vendorId: 'Vendor is required' },
      },
      'Request failed',
    )
    expect(parsed.message).toBe('Vendor is required')
    expect(extractErrorMessage(parsed, 'Request failed')).toBe('Vendor is required')
  })

  it('returns string errors as-is', () => {
    expect(extractErrorMessage('Some error message', 'fallback')).toBe('Some error message')
  })

  it('never returns an object', () => {
    const result = extractErrorMessage(
      { message: 'Linked vendor', fieldErrors: { a: 'b' } },
      'fallback',
    )
    expect(typeof result).toBe('string')
  })
})

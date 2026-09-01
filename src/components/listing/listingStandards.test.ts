import { describe, expect, it } from 'vitest'
import {
  isInvalidDateRange,
  toDateOnlyParam,
  clampListingPage0Based,
  clampListingPage1Based,
  formatListingShowingLabel,
} from './listingStandards'

describe('listingStandards', () => {
  it('flags dateFrom > dateTo', () => {
    expect(isInvalidDateRange('2026-08-26', '2026-08-25')).toBe(true)
    expect(isInvalidDateRange('2026-08-25', '2026-08-25')).toBe(false)
    expect(isInvalidDateRange('2026-08-25', '2026-08-26')).toBe(false)
    expect(isInvalidDateRange('', '2026-08-26')).toBe(false)
    expect(isInvalidDateRange('2026-08-26', '')).toBe(false)
  })

  it('normalizes YYYY-MM-DD params', () => {
    expect(toDateOnlyParam('2026-08-25')).toBe('2026-08-25')
    expect(toDateOnlyParam('  ')).toBeUndefined()
    expect(toDateOnlyParam('08/25/2026')).toBeUndefined()
  })

  it('clamps 0-based page after delete empties the last page', () => {
    expect(clampListingPage0Based(2, 20, 10)).toBe(1)
    expect(clampListingPage0Based(2, 11, 10)).toBe(1)
    expect(clampListingPage0Based(1, 10, 10)).toBe(0)
    expect(clampListingPage0Based(5, 0, 10)).toBe(0)
  })

  it('clamps 1-based page and keeps page 1 when empty', () => {
    expect(clampListingPage1Based(3, 20, 10)).toBe(2)
    expect(clampListingPage1Based(3, 0, 10)).toBe(1)
    expect(clampListingPage1Based(1, 5, 10)).toBe(1)
  })

  it('formats showing label without inverted ranges', () => {
    expect(formatListingShowingLabel(0, 10, 0)).toBe('Showing 0–0 of 0')
    expect(formatListingShowingLabel(2, 10, 15)).toBe('Showing 11–15 of 15')
    expect(formatListingShowingLabel(5, 10, 15)).toBe('Showing 11–15 of 15')
  })
})

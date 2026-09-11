import { describe, expect, it } from 'vitest'
import {
  defaultFyStartYearFromAvailable,
  distinctIndianFyStartYears,
  financialYearSelectOptionsFromYears,
  indianFyStartYearFromIso,
  parseFyStartYear,
  selectedFyHeading,
} from './complianceListingUtils'

describe('financialYearSelectOptionsFromYears', () => {
  const now = new Date('2026-08-18T12:00:00')

  it('always includes All first and only supplied years with FY yy-yy labels', () => {
    expect(financialYearSelectOptionsFromYears([2023, 2026, 2026], now)).toEqual([
      { value: '', label: 'All' },
      { value: '2026', label: 'FY 26-27' },
      { value: '2023', label: 'FY 23-24' },
    ])
  })

  it('does not invent current FY when years list is empty', () => {
    expect(financialYearSelectOptionsFromYears([], now)).toEqual([{ value: '', label: 'All' }])
  })

  it('keeps FY label for current year (no This Financial Year rename)', () => {
    expect(financialYearSelectOptionsFromYears([2026], now)).toEqual([
      { value: '', label: 'All' },
      { value: '2026', label: 'FY 26-27' },
    ])
  })
})

describe('defaultFyStartYearFromAvailable', () => {
  it('selects current FY 26-27 when present (Aug 2026)', () => {
    const now = new Date('2026-08-18T12:00:00')
    expect(defaultFyStartYearFromAvailable([2026, 2025], now)).toBe(2026)
  })

  it('selects current FY for a future calendar date (FY 27-28 in May 2027)', () => {
    const now = new Date('2027-05-10T12:00:00')
    expect(defaultFyStartYearFromAvailable([2027, 2026], now)).toBe(2027)
  })

  it('falls back to All when current FY has no data', () => {
    const now = new Date('2026-08-18T12:00:00')
    expect(defaultFyStartYearFromAvailable([2024, 2025], now)).toBe('')
  })

  it('falls back to All when no years exist', () => {
    expect(defaultFyStartYearFromAvailable([], new Date('2026-08-18T12:00:00'))).toBe('')
  })
})

describe('indian FY helpers', () => {
  it('derives Indian FY start year from ISO dates', () => {
    expect(indianFyStartYearFromIso('2026-03-31')).toBe(2025)
    expect(indianFyStartYearFromIso('2026-04-01')).toBe(2026)
  })

  it('collects distinct FY years newest first', () => {
    expect(
      distinctIndianFyStartYears(['2026-08-01', '2025-11-01', '2026-02-01', 'invalid']),
    ).toEqual([2026, 2025])
  })

  it('labels selection with FY yy-yy, not This Financial Year', () => {
    expect(selectedFyHeading('')).toBe('All Financial Years')
    expect(selectedFyHeading(2026, new Date('2026-08-18T12:00:00'))).toBe('FY 26-27')
    expect(parseFyStartYear('')).toBe('')
    expect(parseFyStartYear('2026')).toBe(2026)
  })
})

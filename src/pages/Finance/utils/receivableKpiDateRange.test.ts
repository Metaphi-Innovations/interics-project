import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import {
  mergeReceivableListDateParams,
  resolveReceivableKpiDateRange,
} from './receivableKpiDateRange'

describe('resolveReceivableKpiDateRange', () => {
  const fixed = dayjs('2026-08-27') // Thursday

  it('resolves Today to a single calendar day', () => {
    expect(resolveReceivableKpiDateRange('Today', null, null, fixed)).toEqual({
      dateFrom: '2026-08-27',
      dateTo: '2026-08-27',
    })
  })

  it('resolves This Week using Dayjs local week (Sun–Sat)', () => {
    expect(resolveReceivableKpiDateRange('This Week', null, null, fixed)).toEqual({
      dateFrom: '2026-08-23',
      dateTo: '2026-08-29',
    })
  })

  it('resolves This Month to full calendar month', () => {
    expect(resolveReceivableKpiDateRange('This Month', null, null, fixed)).toEqual({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })
  })

  it('resolves This Year to full calendar year', () => {
    expect(resolveReceivableKpiDateRange('This Year', null, null, fixed)).toEqual({
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    })
  })

  it('Custom waits until both dates exist', () => {
    expect(
      resolveReceivableKpiDateRange('Custom Date Range', new Date(2026, 7, 1), null, fixed),
    ).toBeNull()
    expect(
      resolveReceivableKpiDateRange('Custom Date Range', null, new Date(2026, 7, 15), fixed),
    ).toBeNull()
  })

  it('Custom returns inclusive bounds when both dates are set', () => {
    expect(
      resolveReceivableKpiDateRange(
        'Custom Date Range',
        new Date(2026, 7, 1),
        new Date(2026, 7, 15),
        fixed,
      ),
    ).toEqual({ dateFrom: '2026-08-01', dateTo: '2026-08-15' })
  })

  it('Custom rejects invalid end < start', () => {
    expect(
      resolveReceivableKpiDateRange(
        'Custom Date Range',
        new Date(2026, 7, 20),
        new Date(2026, 7, 10),
        fixed,
      ),
    ).toBeNull()
  })

  it('Custom allows same-day range', () => {
    expect(
      resolveReceivableKpiDateRange(
        'Custom Date Range',
        new Date(2026, 7, 10),
        new Date(2026, 7, 10),
        fixed,
      ),
    ).toEqual({ dateFrom: '2026-08-10', dateTo: '2026-08-10' })
  })
})

describe('mergeReceivableListDateParams', () => {
  it('uses global range when toolbar has no From/To', () => {
    expect(
      mergeReceivableListDateParams(
        { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
        '',
        '',
      ),
    ).toEqual({ dateFrom: '2026-08-01', dateTo: '2026-08-31' })
  })

  it('uses toolbar range when global is null (custom incomplete / toolbar-only)', () => {
    expect(mergeReceivableListDateParams(null, '2026-07-01', '2026-07-15')).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-15',
    })
  })

  it('intersects global and toolbar ranges (max from, min to)', () => {
    expect(
      mergeReceivableListDateParams(
        { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
        '2026-08-10',
        '2026-08-20',
      ),
    ).toEqual({ dateFrom: '2026-08-10', dateTo: '2026-08-20' })
  })

  it('marks empty intersection when ranges do not overlap', () => {
    expect(
      mergeReceivableListDateParams(
        { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
        '2026-09-01',
        '2026-09-30',
      ),
    ).toEqual({ emptyIntersection: true })
  })

  it('merges one-sided toolbar bounds with global', () => {
    expect(
      mergeReceivableListDateParams(
        { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
        '2026-08-15',
        '',
      ),
    ).toEqual({ dateFrom: '2026-08-15', dateTo: '2026-08-31' })
  })
})

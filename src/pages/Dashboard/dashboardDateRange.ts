import { isoFromDate } from '@/design-system/components'

export type DashboardDateRange = [Date | null, Date | null]
export type DashboardDatePeriod = 'This Month' | 'Last Month' | 'This Financial Year' | 'Custom Range'

export function getCurrentFinancialYearRange(anchor = new Date()): DashboardDateRange {
  const startYear = anchor.getMonth() >= 3 ? anchor.getFullYear() : anchor.getFullYear() - 1
  return [new Date(startYear, 3, 1), new Date(startYear + 1, 2, 31)]
}

export function getDashboardPeriodRange(period: DashboardDatePeriod, anchor = new Date()): DashboardDateRange {
  if (period === 'This Month') {
    return [new Date(anchor.getFullYear(), anchor.getMonth(), 1), new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)]
  }

  if (period === 'Last Month') {
    return [new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1), new Date(anchor.getFullYear(), anchor.getMonth(), 0)]
  }

  if (period === 'This Financial Year') {
    return getCurrentFinancialYearRange(anchor)
  }

  return [null, null]
}

export function dashboardDateParams(range: DashboardDateRange): {
  from?: string
  to?: string
} {
  const [from, to] = range
  return {
    ...(from ? { from: isoFromDate(from) } : {}),
    ...(to ? { to: isoFromDate(to) } : {}),
  }
}

/**
 * Sample data for Dashboard 1 — Revenue section (UI only).
 */

export const DASHBOARD1_FILTER_OPTIONS = {
  financialYears: [
    { value: 'fy-2025-26', label: 'FY 2025–26' },
    { value: 'fy-2024-25', label: 'FY 2024–25' },
    { value: 'fy-2023-24', label: 'FY 2023–24' },
  ],
  projects: [
    { value: 'all', label: 'All Projects' },
    { value: 'prj-001', label: 'Acme Corp - Head Office Redesign' },
    { value: 'prj-002', label: 'Green Villa - Lobby Design' },
    { value: 'prj-003', label: 'NovaTech Workspace Fit-out' },
  ],
  clients: [
    { value: 'all', label: 'All Clients' },
    { value: 'c-001', label: 'Acme Corp' },
    { value: 'c-002', label: 'Green Villa Developers' },
    { value: 'c-003', label: 'NovaTech Pvt Ltd' },
  ],
  sectors: [
    { value: 'all', label: 'All Sectors' },
    { value: 'banking', label: 'Banking' },
    { value: 'it', label: 'IT Companies' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'hospitality', label: 'Hospitality' },
  ],
  projectManagers: [
    { value: 'all', label: 'All Project Managers' },
    { value: 'pm-001', label: 'Arjun Nair' },
    { value: 'pm-002', label: 'Meera Iyer' },
    { value: 'pm-003', label: 'Rohan Desai' },
  ],
} as const

export const REVENUE_TIME_PERIOD_OPTIONS = [
  'This Month',
  'Last Month',
  'This Quarter',
  'Last Quarter',
  'This Financial Year',
  'Last Financial Year',
  'Last 5 Years',
  'Lifetime',
  'Custom Range',
] as const

export type RevenueTimePeriod = (typeof REVENUE_TIME_PERIOD_OPTIONS)[number]

export type RevenueChartGranularity = 'daily' | 'monthly' | 'yearly'

export interface RevenueKpi {
  id: string
  title: string
  value: number
  subtitle: string
  icon: 'po' | 'live' | 'received' | 'pending' | 'paid' | 'payable' | 'cash'
}

export interface RevenueChartPoint {
  month: string
  revenue?: number
  received?: number
  pending?: number
  paid?: number
}

export interface RevenueAnalyticsBundle {
  kpis: RevenueKpi[]
  revenueTrend: RevenueChartPoint[]
  receivedVsPending: RevenueChartPoint[]
  vendorPayments: RevenueChartPoint[]
  granularity: RevenueChartGranularity
}

const BASE_REVENUE_KPIS: RevenueKpi[] = [
  {
    id: 'total-po',
    title: 'Total PO Value',
    value: 48_500_000,
    subtitle: 'Total business received.',
    icon: 'po',
  },
  {
    id: 'live-po',
    title: 'Live PO Value',
    value: 32_200_000,
    subtitle: 'Current active project value.',
    icon: 'live',
  },
  {
    id: 'received',
    title: 'Amount Received',
    value: 18_750_000,
    subtitle: 'Payments collected.',
    icon: 'received',
  },
  {
    id: 'pending-claim',
    title: 'Amount Pending to be Claimed',
    value: 6_400_000,
    subtitle: 'Awaiting client payment.',
    icon: 'pending',
  },
  {
    id: 'paid-vendors',
    title: 'Amount Paid to Vendors',
    value: 11_200_000,
    subtitle: 'Payments released.',
    icon: 'paid',
  },
  {
    id: 'payable',
    title: 'Amount Payable',
    value: 4_850_000,
    subtitle: 'Outstanding vendor dues.',
    icon: 'payable',
  },
  {
    id: 'in-hand',
    title: 'Amount in Hand',
    value: 7_550_000,
    subtitle: 'Current available balance.',
    icon: 'cash',
  },
]

/** Prefer getRevenueAnalytics — kept for existing imports. */
export const REVENUE_KPIS = BASE_REVENUE_KPIS

const FY_MONTHS = [
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
] as const

const BASE_REVENUE_TREND = [
  2_800_000, 3_100_000, 3_450_000, 3_200_000, 3_900_000, 4_150_000, 4_000_000, 4_600_000,
  5_100_000, 4_800_000, 5_250_000, 5_600_000,
]

const BASE_RECEIVED = [
  1_800_000, 2_100_000, 2_400_000, 2_050_000, 2_700_000, 2_900_000, 2_650_000, 3_200_000,
  3_500_000, 3_100_000, 3_600_000, 3_900_000,
]

const BASE_PENDING = [
  650_000, 720_000, 580_000, 900_000, 610_000, 750_000, 820_000, 540_000, 690_000, 780_000,
  520_000, 480_000,
]

const BASE_VENDOR_PAID = [
  980_000, 1_150_000, 1_320_000, 1_050_000, 1_480_000, 1_600_000, 1_420_000, 1_750_000,
  1_900_000, 1_650_000, 1_820_000, 2_050_000,
]

/** Prefer getRevenueAnalytics */
export const MONTHLY_REVENUE_TREND = FY_MONTHS.map((month, i) => ({
  month,
  revenue: BASE_REVENUE_TREND[i],
}))

/** Prefer getRevenueAnalytics */
export const RECEIVED_VS_PENDING = FY_MONTHS.map((month, i) => ({
  month,
  received: BASE_RECEIVED[i],
  pending: BASE_PENDING[i],
}))

/** Prefer getRevenueAnalytics */
export const VENDOR_PAYMENTS_MONTHLY = FY_MONTHS.map((month, i) => ({
  month,
  paid: BASE_VENDOR_PAID[i],
}))

export const CASH_POSITION_MONTHLY = [
  { month: 'Apr', inHand: 4_200_000 },
  { month: 'May', inHand: 4_650_000 },
  { month: 'Jun', inHand: 5_100_000 },
  { month: 'Jul', inHand: 4_800_000 },
  { month: 'Aug', inHand: 5_400_000 },
  { month: 'Sep', inHand: 5_900_000 },
  { month: 'Oct', inHand: 5_650_000 },
  { month: 'Nov', inHand: 6_300_000 },
  { month: 'Dec', inHand: 6_900_000 },
  { month: 'Jan', inHand: 6_550_000 },
  { month: 'Feb', inHand: 7_100_000 },
  { month: 'Mar', inHand: 7_550_000 },
]

function periodFactor(period: RevenueTimePeriod): number {
  switch (period) {
    case 'This Month':
      return 0.12
    case 'Last Month':
      return 0.11
    case 'This Quarter':
      return 0.28
    case 'Last Quarter':
      return 0.26
    case 'This Financial Year':
      return 1
    case 'Last Financial Year':
      return 0.88
    case 'Last 5 Years':
      return 3.2
    case 'Lifetime':
      return 4.5
    case 'Custom Range':
      return 0.4
    default:
      return 1
  }
}

function customRangeFactor(customRange?: [Date | null, Date | null]): number {
  const [start, end] = customRange ?? [null, null]
  if (!start || !end) return 0.4
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  if (days <= 31) return 0.1 + days / 310
  if (days <= 120) return 0.25 + days / 480
  if (days <= 400) return 0.55 + days / 1200
  return Math.min(2.2, 0.9 + days / 1800)
}

function scale(value: number, factor: number): number {
  return Math.round(value * factor)
}

function getGranularity(
  period: RevenueTimePeriod,
  customRange?: [Date | null, Date | null],
): RevenueChartGranularity {
  switch (period) {
    case 'This Month':
    case 'Last Month':
      return 'daily'
    case 'This Quarter':
    case 'Last Quarter':
    case 'This Financial Year':
    case 'Last Financial Year':
      return 'monthly'
    case 'Last 5 Years':
    case 'Lifetime':
      return 'yearly'
    case 'Custom Range': {
      const [start, end] = customRange ?? [null, null]
      if (!start || !end) return 'monthly'
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
      if (days <= 45) return 'daily'
      if (days <= 400) return 'monthly'
      return 'yearly'
    }
    default:
      return 'monthly'
  }
}

function wave(index: number, length: number, amplitude = 0.18): number {
  return 1 + Math.sin((index / Math.max(1, length - 1)) * Math.PI * 2) * amplitude
}

function buildDailySeries(factor: number, dayCount: number): {
  revenueTrend: RevenueChartPoint[]
  receivedVsPending: RevenueChartPoint[]
  vendorPayments: RevenueChartPoint[]
} {
  const revenueTrend: RevenueChartPoint[] = []
  const receivedVsPending: RevenueChartPoint[] = []
  const vendorPayments: RevenueChartPoint[] = []

  const dailyRevenueBase = (BASE_REVENUE_TREND[BASE_REVENUE_TREND.length - 1] / 30) * factor
  const dailyReceivedBase = (BASE_RECEIVED[BASE_RECEIVED.length - 1] / 30) * factor
  const dailyPendingBase = (BASE_PENDING[BASE_PENDING.length - 1] / 30) * factor
  const dailyPaidBase = (BASE_VENDOR_PAID[BASE_VENDOR_PAID.length - 1] / 30) * factor

  for (let i = 0; i < dayCount; i++) {
    const label = `${i + 1}`
    const w = wave(i, dayCount, 0.22)
    revenueTrend.push({ month: label, revenue: scale(dailyRevenueBase * w, 1) })
    receivedVsPending.push({
      month: label,
      received: scale(dailyReceivedBase * w, 1),
      pending: scale(dailyPendingBase * (2 - w), 1),
    })
    vendorPayments.push({ month: label, paid: scale(dailyPaidBase * w, 1) })
  }

  return { revenueTrend, receivedVsPending, vendorPayments }
}

function buildMonthlySeries(
  factor: number,
  months: readonly string[],
  offset = 0,
): {
  revenueTrend: RevenueChartPoint[]
  receivedVsPending: RevenueChartPoint[]
  vendorPayments: RevenueChartPoint[]
} {
  return {
    revenueTrend: months.map((month, i) => ({
      month,
      revenue: scale(BASE_REVENUE_TREND[(i + offset) % 12], factor),
    })),
    receivedVsPending: months.map((month, i) => ({
      month,
      received: scale(BASE_RECEIVED[(i + offset) % 12], factor),
      pending: scale(BASE_PENDING[(i + offset) % 12], factor),
    })),
    vendorPayments: months.map((month, i) => ({
      month,
      paid: scale(BASE_VENDOR_PAID[(i + offset) % 12], factor),
    })),
  }
}

function buildYearlySeries(
  factor: number,
  years: string[],
): {
  revenueTrend: RevenueChartPoint[]
  receivedVsPending: RevenueChartPoint[]
  vendorPayments: RevenueChartPoint[]
} {
  const yearBaseRevenue = BASE_REVENUE_TREND.reduce((a, b) => a + b, 0)
  const yearBaseReceived = BASE_RECEIVED.reduce((a, b) => a + b, 0)
  const yearBasePending = BASE_PENDING.reduce((a, b) => a + b, 0)
  const yearBasePaid = BASE_VENDOR_PAID.reduce((a, b) => a + b, 0)

  return {
    revenueTrend: years.map((year, i) => ({
      month: year,
      revenue: scale(yearBaseRevenue * wave(i, years.length, 0.12), factor / years.length),
    })),
    receivedVsPending: years.map((year, i) => ({
      month: year,
      received: scale(yearBaseReceived * wave(i, years.length, 0.12), factor / years.length),
      pending: scale(yearBasePending * wave(i, years.length, 0.1), factor / years.length),
    })),
    vendorPayments: years.map((year, i) => ({
      month: year,
      paid: scale(yearBasePaid * wave(i, years.length, 0.12), factor / years.length),
    })),
  }
}

function customDayCount(customRange?: [Date | null, Date | null]): number {
  const [start, end] = customRange ?? [null, null]
  if (!start || !end) return 14
  return Math.min(
    60,
    Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1),
  )
}

function buildSeriesForPeriod(
  period: RevenueTimePeriod,
  factor: number,
  granularity: RevenueChartGranularity,
  customRange?: [Date | null, Date | null],
): {
  revenueTrend: RevenueChartPoint[]
  receivedVsPending: RevenueChartPoint[]
  vendorPayments: RevenueChartPoint[]
} {
  if (granularity === 'daily') {
    const days =
      period === 'This Month' || period === 'Last Month'
        ? period === 'This Month'
          ? 30
          : 28
        : customDayCount(customRange)
    return buildDailySeries(factor, days)
  }

  if (granularity === 'yearly') {
    if (period === 'Last 5 Years') {
      return buildYearlySeries(factor, ['FY21', 'FY22', 'FY23', 'FY24', 'FY25'])
    }
    if (period === 'Lifetime') {
      return buildYearlySeries(factor, ['FY19', 'FY20', 'FY21', 'FY22', 'FY23', 'FY24', 'FY25'])
    }
    return buildYearlySeries(factor, ['FY23', 'FY24', 'FY25'])
  }

  if (period === 'This Quarter') {
    return buildMonthlySeries(factor, ['Jan', 'Feb', 'Mar'], 9)
  }
  if (period === 'Last Quarter') {
    return buildMonthlySeries(factor, ['Oct', 'Nov', 'Dec'], 6)
  }
  if (period === 'Last Financial Year') {
    return buildMonthlySeries(factor, FY_MONTHS, 1)
  }
  if (period === 'Custom Range') {
    return buildMonthlySeries(factor, ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], 0)
  }

  return buildMonthlySeries(factor, FY_MONTHS, 0)
}

export function getRevenueAnalytics(
  period: RevenueTimePeriod,
  customRange?: [Date | null, Date | null],
): RevenueAnalyticsBundle {
  const factor =
    period === 'Custom Range' ? customRangeFactor(customRange) : periodFactor(period)
  const granularity = getGranularity(period, customRange)
  const series = buildSeriesForPeriod(period, factor, granularity, customRange)

  const kpis = BASE_REVENUE_KPIS.map((kpi) => ({
    ...kpi,
    value: scale(kpi.value, factor),
  }))

  return {
    kpis,
    revenueTrend: series.revenueTrend,
    receivedVsPending: series.receivedVsPending,
    vendorPayments: series.vendorPayments,
    granularity,
  }
}

/**
 * Sample data for Dashboard — Revenue section (UI only).
 */

export const DASHBOARD_FILTER_OPTIONS = {
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
  'This Financial Year',
  'Custom Range',
] as const

export type RevenueTimePeriod = (typeof REVENUE_TIME_PERIOD_OPTIONS)[number]

export const REVENUE_DATE_TYPE_OPTIONS = [
  'PO Date',
  'Invoice Date',
  'Payment Received Date',
] as const

export type RevenueDateType = (typeof REVENUE_DATE_TYPE_OPTIONS)[number]

export type RevenueChartGranularity = 'daily' | 'monthly' | 'yearly'

export interface RevenueKpi {
  id: string
  title: string
  value: number
  subtitle: string
  icon: 'po' | 'live' | 'received' | 'pending' | 'paid' | 'payable' | 'cash' | 'profit'
}

export interface RevenueChartPoint {
  month: string
  revenue?: number
  /** Actual client payments received (cash collections). */
  clientReceived?: number
  /** Actual payments released to vendors. */
  vendorPaid?: number
}

export interface RevenueAnalyticsBundle {
  kpis: RevenueKpi[]
  revenueTrend: RevenueChartPoint[]
  /** Combined month-wise Client Revenue Received vs Vendor Payments. */
  clientReceivedVsVendorPayments: RevenueChartPoint[]
  granularity: RevenueChartGranularity
}

/**
 * Agreed Revenue Profit formula:
 *   Profit = Amount Received − Amount Paid to Vendors − non-vendor Expenses
 *
 * Vendor payments already reflected in "Amount Paid to Vendors" must not be
 * subtracted again when the same amounts also appear under Expenses
 * (e.g. vendor_linked / included_in_payment). Only the residual non-vendor
 * expense portion is deducted.
 */
export function computeRevenueProfit(params: {
  amountReceived: number
  amountPaidToVendors: number
  /** Total expenses in scope (may include vendor-linked amounts). */
  expensesTotal?: number
  /** Portion of expensesTotal that is already counted as vendor payments. */
  vendorPaymentsIncludedInExpenses?: number
}): number {
  const expensesTotal = params.expensesTotal ?? 0
  const vendorInExpenses = Math.max(0, params.vendorPaymentsIncludedInExpenses ?? 0)
  const nonVendorExpenses = Math.max(0, expensesTotal - vendorInExpenses)
  return Math.round(
    params.amountReceived - params.amountPaidToVendors - nonVendorExpenses,
  )
}

const BASE_REVENUE_KPI_VALUES = {
  totalPo: 48_500_000,
  livePo: 32_200_000,
  received: 18_750_000,
  pendingClaim: 6_400_000,
  paidVendors: 11_200_000,
  payable: 4_850_000,
  inHand: 7_550_000,
} as const

function buildBaseRevenueKpis(factor: number): RevenueKpi[] {
  const received = scale(BASE_REVENUE_KPI_VALUES.received, factor)
  const paidVendors = scale(BASE_REVENUE_KPI_VALUES.paidVendors, factor)
  // Vendor payments already sit in Amount Paid to Vendors. Treat that same
  // amount as the vendor portion of Expenses so it is not double-counted.
  const profit = computeRevenueProfit({
    amountReceived: received,
    amountPaidToVendors: paidVendors,
    expensesTotal: paidVendors,
    vendorPaymentsIncludedInExpenses: paidVendors,
  })

  return [
    {
      id: 'total-po',
      title: 'Total PO Value',
      value: scale(BASE_REVENUE_KPI_VALUES.totalPo, factor),
      subtitle: 'Total business received.',
      icon: 'po',
    },
    {
      id: 'live-po',
      title: 'Live PO Value',
      value: scale(BASE_REVENUE_KPI_VALUES.livePo, factor),
      subtitle: 'Current active project value.',
      icon: 'live',
    },
    {
      id: 'received',
      title: 'Amount Received',
      value: received,
      subtitle: 'Payments collected.',
      icon: 'received',
    },
    {
      id: 'pending-claim',
      title: 'Amount Pending to be Claimed',
      value: scale(BASE_REVENUE_KPI_VALUES.pendingClaim, factor),
      subtitle: 'Awaiting client payment.',
      icon: 'pending',
    },
    {
      id: 'paid-vendors',
      title: 'Amount Paid to Vendors',
      value: paidVendors,
      subtitle: 'Payments released.',
      icon: 'paid',
    },
    {
      id: 'payable',
      title: 'Amount Payable',
      value: scale(BASE_REVENUE_KPI_VALUES.payable, factor),
      subtitle: 'Outstanding vendor dues.',
      icon: 'payable',
    },
    {
      id: 'in-hand',
      title: 'Amount in Hand',
      value: scale(BASE_REVENUE_KPI_VALUES.inHand, factor),
      subtitle: 'Current available balance.',
      icon: 'cash',
    },
    {
      id: 'profit',
      title: 'Profit',
      value: profit,
      subtitle: 'Net profit after vendor payments and expenses.',
      icon: 'profit',
    },
  ]
}

/** Prefer getRevenueAnalytics — kept for existing imports. */
export const REVENUE_KPIS = buildBaseRevenueKpis(1)

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

/** Revenue grouped by client PO date. */
const BASE_REVENUE_BY_PO_DATE = [
  2_800_000, 3_100_000, 3_450_000, 3_200_000, 3_900_000, 4_150_000, 4_000_000, 4_600_000,
  5_100_000, 4_800_000, 5_250_000, 5_600_000,
]

/**
 * Revenue grouped by client invoice date — lags PO bookings (invoices follow POs).
 * Same annual total as PO Date, different monthly distribution.
 */
const BASE_REVENUE_BY_INVOICE_DATE = [
  2_200_000, 2_750_000, 3_150_000, 3_500_000, 3_450_000, 3_950_000, 4_400_000, 4_250_000,
  4_900_000, 5_200_000, 5_400_000, 6_800_000,
]

/**
 * Revenue grouped by payment received date — further lags invoicing (cash collections).
 * Same annual total as PO Date, different monthly distribution.
 */
const BASE_REVENUE_BY_PAYMENT_DATE = [
  1_750_000, 2_300_000, 2_700_000, 3_050_000, 3_400_000, 3_700_000, 4_050_000, 4_450_000,
  4_800_000, 5_200_000, 5_700_000, 8_850_000,
]

const BASE_REVENUE_BY_DATE_TYPE: Record<RevenueDateType, number[]> = {
  'PO Date': BASE_REVENUE_BY_PO_DATE,
  'Invoice Date': BASE_REVENUE_BY_INVOICE_DATE,
  'Payment Received Date': BASE_REVENUE_BY_PAYMENT_DATE,
}

/** Actual client revenue received (cash collected), month-wise. */
const BASE_CLIENT_RECEIVED = [
  1_800_000, 2_100_000, 2_400_000, 2_050_000, 2_700_000, 2_900_000, 2_650_000, 3_200_000,
  3_500_000, 3_100_000, 3_600_000, 3_900_000,
]

/** Actual vendor payments released, month-wise (same timeline as client received). */
const BASE_VENDOR_PAID = [
  980_000, 1_150_000, 1_320_000, 1_050_000, 1_480_000, 1_600_000, 1_420_000, 1_750_000,
  1_900_000, 1_650_000, 1_820_000, 2_050_000,
]

/** Prefer getRevenueAnalytics */
export const MONTHLY_REVENUE_TREND = FY_MONTHS.map((month, i) => ({
  month,
  revenue: BASE_REVENUE_BY_PO_DATE[i],
}))

/** Prefer getRevenueAnalytics */
export const CLIENT_RECEIVED_VS_VENDOR_PAYMENTS = FY_MONTHS.map((month, i) => ({
  month,
  clientReceived: BASE_CLIENT_RECEIVED[i],
  vendorPaid: BASE_VENDOR_PAID[i],
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
    case 'This Financial Year':
      return 1
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
    case 'This Financial Year':
      return 'monthly'
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

function revenueBaseForDateType(dateType: RevenueDateType): number[] {
  return BASE_REVENUE_BY_DATE_TYPE[dateType]
}

function buildDailySeries(
  factor: number,
  dayCount: number,
  dateType: RevenueDateType,
): {
  revenueTrend: RevenueChartPoint[]
  clientReceivedVsVendorPayments: RevenueChartPoint[]
} {
  const revenueTrend: RevenueChartPoint[] = []
  const clientReceivedVsVendorPayments: RevenueChartPoint[] = []

  const revenueSeries = revenueBaseForDateType(dateType)
  const dailyRevenueBase = (revenueSeries[revenueSeries.length - 1] / 30) * factor
  const dailyClientReceivedBase =
    (BASE_CLIENT_RECEIVED[BASE_CLIENT_RECEIVED.length - 1] / 30) * factor
  const dailyPaidBase = (BASE_VENDOR_PAID[BASE_VENDOR_PAID.length - 1] / 30) * factor

  // Slight phase shift per date type so daily curves differ when switching.
  const phase =
    dateType === 'PO Date' ? 0 : dateType === 'Invoice Date' ? 0.35 : 0.7

  for (let i = 0; i < dayCount; i++) {
    const label = `${i + 1}`
    const w = wave(i + phase * dayCount, dayCount, 0.22)
    revenueTrend.push({ month: label, revenue: scale(dailyRevenueBase * w, 1) })
    clientReceivedVsVendorPayments.push({
      month: label,
      clientReceived: scale(dailyClientReceivedBase * w, 1),
      vendorPaid: scale(dailyPaidBase * w, 1),
    })
  }

  return { revenueTrend, clientReceivedVsVendorPayments }
}

function buildMonthlySeries(
  factor: number,
  months: readonly string[],
  dateType: RevenueDateType,
  offset = 0,
): {
  revenueTrend: RevenueChartPoint[]
  clientReceivedVsVendorPayments: RevenueChartPoint[]
} {
  const revenueSeries = revenueBaseForDateType(dateType)
  return {
    revenueTrend: months.map((month, i) => ({
      month,
      revenue: scale(revenueSeries[(i + offset) % 12], factor),
    })),
    clientReceivedVsVendorPayments: months.map((month, i) => ({
      month,
      clientReceived: scale(BASE_CLIENT_RECEIVED[(i + offset) % 12], factor),
      vendorPaid: scale(BASE_VENDOR_PAID[(i + offset) % 12], factor),
    })),
  }
}

function buildYearlySeries(
  factor: number,
  years: string[],
  dateType: RevenueDateType,
): {
  revenueTrend: RevenueChartPoint[]
  clientReceivedVsVendorPayments: RevenueChartPoint[]
} {
  const revenueSeries = revenueBaseForDateType(dateType)
  const yearBaseRevenue = revenueSeries.reduce((a, b) => a + b, 0)
  const yearBaseClientReceived = BASE_CLIENT_RECEIVED.reduce((a, b) => a + b, 0)
  const yearBasePaid = BASE_VENDOR_PAID.reduce((a, b) => a + b, 0)
  const dateTypeAmp =
    dateType === 'PO Date' ? 0.12 : dateType === 'Invoice Date' ? 0.1 : 0.14

  return {
    revenueTrend: years.map((year, i) => ({
      month: year,
      revenue: scale(yearBaseRevenue * wave(i, years.length, dateTypeAmp), factor / years.length),
    })),
    clientReceivedVsVendorPayments: years.map((year, i) => ({
      month: year,
      clientReceived: scale(
        yearBaseClientReceived * wave(i, years.length, 0.12),
        factor / years.length,
      ),
      vendorPaid: scale(yearBasePaid * wave(i, years.length, 0.12), factor / years.length),
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
  dateType: RevenueDateType,
  customRange?: [Date | null, Date | null],
): {
  revenueTrend: RevenueChartPoint[]
  clientReceivedVsVendorPayments: RevenueChartPoint[]
} {
  if (granularity === 'daily') {
    const days =
      period === 'This Month' || period === 'Last Month'
        ? period === 'This Month'
          ? 30
          : 28
        : customDayCount(customRange)
    return buildDailySeries(factor, days, dateType)
  }

  if (granularity === 'yearly') {
    return buildYearlySeries(factor, ['FY23', 'FY24', 'FY25'], dateType)
  }

  if (period === 'Custom Range') {
    return buildMonthlySeries(factor, ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], dateType, 0)
  }

  return buildMonthlySeries(factor, FY_MONTHS, dateType, 0)
}

export function getRevenueAnalytics(
  period: RevenueTimePeriod,
  customRange?: [Date | null, Date | null],
  dateType: RevenueDateType = 'PO Date',
): RevenueAnalyticsBundle {
  const factor =
    period === 'Custom Range' ? customRangeFactor(customRange) : periodFactor(period)
  const granularity = getGranularity(period, customRange)
  const series = buildSeriesForPeriod(period, factor, granularity, dateType, customRange)

  return {
    kpis: buildBaseRevenueKpis(factor),
    revenueTrend: series.revenueTrend,
    clientReceivedVsVendorPayments: series.clientReceivedVsVendorPayments,
    granularity,
  }
}

export interface FinancialRevenueYearPoint {
  month: string
  poValue: number
  invoiceValue: number
  amountReceived: number
}

export interface FinancialRevenueYearAnalytics {
  chartData: FinancialRevenueYearPoint[]
  totals: {
    poValue: number
    invoiceValue: number
    amountReceived: number
  }
  infoText: string
}

export const FINANCIAL_REVENUE_YEAR_INFO_TEXT =
  'PO Value is grouped by PO date. Invoice Value follows invoice dates and typically lags PO bookings. Amount Received reflects cash collections and may lag invoicing.'

/** Month-wise PO, invoice, and received amounts for the Financial Revenue Year chart. */
export function getFinancialRevenueYearAnalytics(
  period: RevenueTimePeriod,
  customRange?: [Date | null, Date | null],
): FinancialRevenueYearAnalytics {
  const factor =
    period === 'Custom Range' ? customRangeFactor(customRange) : periodFactor(period)

  const chartData = FY_MONTHS.map((month, i) => ({
    month,
    poValue: scale(BASE_REVENUE_BY_PO_DATE[i], factor),
    invoiceValue: scale(BASE_REVENUE_BY_INVOICE_DATE[i], factor),
    amountReceived: scale(BASE_REVENUE_BY_PAYMENT_DATE[i], factor),
  }))

  return {
    chartData,
    totals: {
      poValue: chartData.reduce((sum, row) => sum + row.poValue, 0),
      invoiceValue: chartData.reduce((sum, row) => sum + row.invoiceValue, 0),
      amountReceived: chartData.reduce((sum, row) => sum + row.amountReceived, 0),
    },
    infoText: FINANCIAL_REVENUE_YEAR_INFO_TEXT,
  }
}

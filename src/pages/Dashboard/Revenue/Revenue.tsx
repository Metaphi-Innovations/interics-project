/**
 * Dashboard Revenue tab.
 * KPI cards, detail drawer, filters, and revenue charts are kept together.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select as MuiSelect,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Banknote,
  CircleDollarSign,
  HandCoins,
  IndianRupee,
  PlayCircle,
  Timer,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import {
  BarChart,
  ChartCard,
  DateRangePicker,
  SearchInput,
  Select,
  StatusBadge,
} from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'

interface ChartSeriesLegendItem {
  label: string
  color: string
}

function ChartSeriesLegend({ items }: { items: ChartSeriesLegendItem[] }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      {items.map((item) => (
        <Box key={item.label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '2px',
              bgcolor: item.color,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 12, whiteSpace: 'nowrap', lineHeight: 1.2 }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

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


function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function chartSubtitle(granularity: 'daily' | 'monthly' | 'yearly', base: string): string {
  if (granularity === 'daily') {
    return base.replace('month-wise', 'day-wise').replace('Monthly', 'Daily')
  }
  if (granularity === 'yearly') {
    return base.replace('month-wise', 'year-wise').replace('Monthly', 'Yearly')
  }
  return base
}

const ICON_MAP: Record<RevenueKpi['icon'], { node: ReactNode; color: string }> = {
  po: {
    node: <IndianRupee size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  live: {
    node: <PlayCircle size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
  received: {
    node: <CircleDollarSign size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
  pending: {
    node: <Timer size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.amber,
  },
  paid: {
    node: <HandCoins size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.purple,
  },
  payable: {
    node: <Banknote size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.red,
  },
  cash: {
    node: <Wallet size={18} strokeWidth={1.75} />,
    color: tokens.color.primary[600],
  },
  profit: {
    node: <TrendingUp size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
}

interface RevenueKpiCardProps {
  kpi: RevenueKpi
  onClick?: () => void
}

export function RevenueKpiCard({ kpi, onClick }: RevenueKpiCardProps) {
  const theme = useTheme()
  const iconMeta = ICON_MAP[kpi.icon]

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        p: 2,
        borderRadius: '10px',
        border: `1px solid ${tokens.color.neutral[200]}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        bgcolor: 'background.paper',
        ...(onClick && {
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          '&:hover': {
            borderColor: tokens.color.primary[300],
            boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
          },
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{
            fontSize: 11,
            letterSpacing: 0.3,
            lineHeight: 1.35,
            pr: 0.5,
          }}
        >
          {kpi.title}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(iconMeta.color, theme.palette.mode === 'dark' ? 0.2 : 0.1),
            color: iconMeta.color,
          }}
        >
          {iconMeta.node}
        </Box>
      </Box>

      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ fontSize: { xs: 20, md: 22 }, lineHeight: 1.2, letterSpacing: -0.3 }}
      >
        ₹{formatCurrency(kpi.value)}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mt: 'auto' }}>
        {kpi.subtitle}
      </Typography>
    </Paper>
  )
}


export type ClickableKpiId =
  | 'total-po'
  | 'live-po'
  | 'received'
  | 'pending-claim'
  | 'paid-vendors'
  | 'payable'

export const CLICKABLE_KPI_IDS: Set<string> = new Set<string>([
  'total-po',
  'live-po',
  'received',
  'pending-claim',
  'paid-vendors',
  'payable',
])

interface DrawerColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  format?: 'currency' | 'date' | 'status'
  width?: string
  /** Extra left padding (theme spacing); defaults to shared table `px`. */
  pl?: number
  /** Extra right padding (theme spacing); defaults to shared table `px`. */
  pr?: number
}

interface DrawerConfig {
  columns: DrawerColumn[]
  rows: Record<string, string | number>[]
  totalKey: string
}

const TOTAL_PO_ROWS = [
  { project: 'Acme Corp - Head Office', status: 'Live', poNumber: 'PO-2025-001', poDate: '12 Apr 2025', poValue: 12_500_000 },
  { project: 'Green Villa Lobby', status: 'Live', poNumber: 'PO-2025-002', poDate: '18 May 2025', poValue: 8_200_000 },
  { project: 'NovaTech Workspace', status: 'Live', poNumber: 'PO-2025-003', poDate: '03 Jun 2025', poValue: 11_500_000 },
  { project: 'Horizon Campus Phase 1', status: 'Completed', poNumber: 'PO-2024-018', poDate: '10 Jan 2024', poValue: 9_800_000 },
  { project: 'Pulse Clinic Fit-out', status: 'Completed', poNumber: 'PO-2024-022', poDate: '22 Mar 2024', poValue: 4_200_000 },
  { project: 'Grand Oak Hospitality', status: 'Archived', poNumber: 'PO-2023-009', poDate: '05 Sep 2023', poValue: 2_300_000 },
]

const LIVE_PO_ROWS = [
  { project: 'Acme Corp - Head Office', poNumber: 'PO-2025-001', poDate: '12 Apr 2025', poValue: 12_500_000 },
  { project: 'Green Villa Lobby', poNumber: 'PO-2025-002', poDate: '18 May 2025', poValue: 8_200_000 },
  { project: 'NovaTech Workspace', poNumber: 'PO-2025-003', poDate: '03 Jun 2025', poValue: 11_500_000 },
]

/** Paid client invoices — amounts sum to Amount Received KPI base (₹1.875 Cr). */
const RECEIVED_ROWS = [
  { client: 'Acme Corp', project: 'Acme Corp - Head Office', amount: 4_500_000, status: 'Paid' },
  { client: 'Green Villa Developers', project: 'Green Villa Lobby', amount: 3_200_000, status: 'Paid' },
  { client: 'NovaTech Pvt Ltd', project: 'NovaTech Workspace', amount: 4_800_000, status: 'Paid' },
  { client: 'Horizon Group', project: 'Horizon Campus Phase 1', amount: 2_850_000, status: 'Paid' },
  { client: 'Pulse Health', project: 'Pulse Clinic Fit-out', amount: 1_900_000, status: 'Paid' },
  { client: 'Grand Oak Hotels', project: 'Grand Oak Hospitality', amount: 1_500_000, status: 'Paid' },
]

const PENDING_CLAIM_ROWS = [
  { project: 'Acme Corp - Head Office', invoiceNo: 'INV-2025-014', invoiceAmount: 2_500_000, amountReceived: 1_800_000, pending: 700_000, dueDate: '15 Sep 2025', status: 'Overdue' },
  { project: 'Green Villa Lobby', invoiceNo: 'INV-2025-018', invoiceAmount: 1_600_000, amountReceived: 0, pending: 1_600_000, dueDate: '30 Sep 2025', status: 'Pending' },
  { project: 'NovaTech Workspace', invoiceNo: 'INV-2025-025', invoiceAmount: 1_900_000, amountReceived: 200_000, pending: 1_700_000, dueDate: '25 Oct 2025', status: 'Pending' },
]

const PAID_VENDORS_ROWS = [
  { vendor: 'BuildWell Constructions', project: 'Acme Corp - Head Office', invoiceNo: 'VINV-2025-032', payable: 3_200_000, paid: 3_200_000, paymentDate: '20 Jul 2025' },
  { vendor: 'ElectroTech Solutions', project: 'Green Villa Lobby', invoiceNo: 'VINV-2025-041', payable: 1_800_000, paid: 1_800_000, paymentDate: '05 Aug 2025' },
  { vendor: 'Craft Studio Design', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-048', payable: 2_900_000, paid: 2_900_000, paymentDate: '12 Aug 2025' },
  { vendor: 'AquaFlow Systems', project: 'Acme Corp - Head Office', invoiceNo: 'VINV-2025-055', payable: 1_650_000, paid: 1_650_000, paymentDate: '18 Aug 2025' },
  { vendor: 'Nova Acoustics', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-060', payable: 1_650_000, paid: 1_650_000, paymentDate: '25 Aug 2025' },
]

const PAYABLE_ROWS = [
  { vendor: 'BuildWell Constructions', project: 'Green Villa Lobby', invoiceNo: 'VINV-2025-062', payable: 1_400_000, dueDate: '30 Sep 2025', status: 'Due' },
  { vendor: 'ElectroTech Solutions', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-065', payable: 950_000, dueDate: '05 Oct 2025', status: 'Due' },
  { vendor: 'Craft Studio Design', project: 'Acme Corp - Head Office', invoiceNo: 'VINV-2025-068', payable: 1_200_000, dueDate: '15 Oct 2025', status: 'Upcoming' },
  { vendor: 'AquaFlow Systems', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-071', payable: 1_300_000, dueDate: '20 Oct 2025', status: 'Upcoming' },
]

function getDrawerConfig(kpiId: ClickableKpiId): DrawerConfig {
  switch (kpiId) {
    case 'total-po':
      return {
        columns: [
          { key: 'project', label: 'Project Name', width: '34%' },
          { key: 'status', label: 'Project Status', format: 'status', width: '16%' },
          { key: 'poNumber', label: 'PO Number', width: '16%' },
          { key: 'poDate', label: 'PO Date', format: 'date', width: '16%' },
          { key: 'poValue', label: 'PO Value', align: 'right', format: 'currency', width: '18%' },
        ],
        rows: TOTAL_PO_ROWS,
        totalKey: 'poValue',
      }
    case 'live-po':
      return {
        columns: [
          { key: 'project', label: 'Project Name', width: '42%' },
          { key: 'poNumber', label: 'PO Number', width: '18%' },
          { key: 'poDate', label: 'PO Date', format: 'date', width: '18%' },
          { key: 'poValue', label: 'PO Value', align: 'right', format: 'currency', width: '22%' },
        ],
        rows: LIVE_PO_ROWS,
        totalKey: 'poValue',
      }
    case 'received':
      return {
        columns: [
          { key: 'client', label: 'Client', width: '28%' },
          { key: 'project', label: 'Project', width: '30%' },
          // Extra pr/pl so Amount↔Status has the same breathing room as Client↔Project
          { key: 'amount', label: 'Amount', align: 'right', format: 'currency', width: '22%', pr: 4 },
          { key: 'status', label: 'Status', format: 'status', width: '20%', pl: 4 },
        ],
        rows: RECEIVED_ROWS,
        totalKey: 'amount',
      }
    case 'pending-claim':
      return {
        columns: [
          { key: 'project', label: 'Project', width: '25%' },
          { key: 'pending', label: 'Pending Amount', align: 'right', format: 'currency', width: '25%' },
          { key: 'dueDate', label: 'Due Date', format: 'date', width: '25%' },
          { key: 'status', label: 'Status', format: 'status', width: '25%' },
        ],
        rows: PENDING_CLAIM_ROWS,
        totalKey: 'pending',
      }
    case 'paid-vendors':
      return {
        columns: [
          { key: 'vendor', label: 'Vendor', width: '38%' },
          { key: 'project', label: 'Project', width: '38%' },
          { key: 'payable', label: 'Payable Amount', format: 'currency', width: '24%' },
        ],
        rows: PAID_VENDORS_ROWS,
        totalKey: 'paid',
      }
    case 'payable':
      return {
        columns: [
          { key: 'vendor', label: 'Vendor', width: '28%' },
          { key: 'project', label: 'Project', width: '28%' },
          { key: 'payable', label: 'Payable Amount', align: 'right', format: 'currency', width: '18%' },
          { key: 'dueDate', label: 'Due Date', format: 'date', width: '13%' },
          { key: 'status', label: 'Status', format: 'status', width: '13%' },
        ],
        rows: PAYABLE_ROWS,
        totalKey: 'payable',
      }
  }
}

const STATUS_TYPE_BY_LABEL: Record<string, StatusType> = {
  Live: 'live',
  Completed: 'completed',
  Archived: 'archived',
  Overdue: 'overdue',
  Pending: 'pending',
  Paid: 'paid',
  Due: 'payment_pending',
  Upcoming: 'issued',
}

function scaleCurrencyRows(
  rows: Record<string, string | number>[],
  amountKey: string,
  targetTotal: number,
): Record<string, string | number>[] {
  if (rows.length === 0) return rows
  const baseTotal = rows.reduce((sum, row) => sum + Number(row[amountKey] ?? 0), 0)
  if (baseTotal <= 0 || targetTotal === baseTotal) return rows
  const factor = targetTotal / baseTotal
  const scaled = rows.map((row) => ({
    ...row,
    [amountKey]: Math.round(Number(row[amountKey] ?? 0) * factor),
  }))
  const drift =
    targetTotal - scaled.reduce((sum, row) => sum + Number(row[amountKey] ?? 0), 0)
  if (drift !== 0) {
    const last = scaled[scaled.length - 1]
    scaled[scaled.length - 1] = {
      ...last,
      [amountKey]: Math.max(0, Number(last[amountKey] ?? 0) + drift),
    }
  }
  return scaled
}

function formatCell(value: string | number, format?: DrawerColumn['format']): string {
  if (format === 'currency' && typeof value === 'number') return `₹${formatCurrency(value)}`
  return String(value)
}

function renderCell(value: string | number, format?: DrawerColumn['format']) {
  if (format === 'status') {
    const label = String(value)
    const status = STATUS_TYPE_BY_LABEL[label] ?? 'draft'
    return <StatusBadge status={status} label={label} size="small" />
  }
  return formatCell(value, format)
}

function getColumnAlign(col: DrawerColumn): 'left' | 'right' {
  return col.align ?? (col.format === 'currency' ? 'right' : 'left')
}

function getColumnCellSx(col: DrawerColumn) {
  return {
    width: col.width,
    minWidth: col.width,
    pl: col.pl ?? 2,
    pr: col.pr ?? 2,
  }
}

const FILTER_CONTROL_SX = { minWidth: 148, flex: '0 0 auto' } as const

export interface RevenueKpiDrawerProps {
  open: boolean
  onClose: () => void
  kpi: RevenueKpi | null
}

export function RevenueKpiDrawer({ open, onClose, kpi }: RevenueKpiDrawerProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | number>('all')

  useEffect(() => {
    setSearch('')
    setStatusFilter('all')
  }, [kpi?.id])

  const config = useMemo(() => {
    if (!kpi || !CLICKABLE_KPI_IDS.has(kpi.id)) return null
    const base = getDrawerConfig(kpi.id as ClickableKpiId)
    if (kpi.id !== 'received') return base
    return {
      ...base,
      rows: scaleCurrencyRows(base.rows, base.totalKey, kpi.value),
    }
  }, [kpi])

  const statusColumn = config?.columns.find((col) => col.format === 'status')
  const showStatusFilter = Boolean(statusColumn) && kpi?.id !== 'received'
  const statusOptions = useMemo(() => {
    if (!config || !statusColumn) return []
    const values = Array.from(
      new Set(config.rows.map((row) => String(row[statusColumn.key] ?? '')).filter(Boolean)),
    )
    return [
      { label: 'All Status', value: 'all' },
      ...values.map((value) => ({ label: value, value })),
    ]
  }, [config, statusColumn])

  const visibleRows = useMemo(() => {
    if (!config) return []
    const query = search.trim().toLowerCase()

    return config.rows.filter((row) => {
      if (statusColumn && statusFilter !== 'all' && String(row[statusColumn.key]) !== String(statusFilter)) {
        return false
      }

      if (query) {
        const matchesSearch = config.columns.some((col) => {
          if (col.format === 'currency') return false
          return String(row[col.key] ?? '').toLowerCase().includes(query)
        })
        if (!matchesSearch) return false
      }

      return true
    })
  }, [config, search, statusColumn, statusFilter])

  if (!kpi || !config) return null

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.18)' } },
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '78%', md: 880 },
          maxWidth: 960,
          minWidth: { sm: 640 },
          boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: 3,
          pt: 2.5,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ pr: 2 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}>
            {kpi.title}
          </Typography>
          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.4,
              lineHeight: 1.2,
              mt: 0.5,
            }}
          >
            ₹{formatCurrency(kpi.value)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
            {kpi.subtitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ mt: -0.5 }}>
          <X size={18} />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          px: 3,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <SearchInput
          size="sm"
          placeholder="Search..."
          value={search}
          onChange={setSearch}
          debounce={200}
          sx={{ flex: '1 1 180px', minWidth: 160, maxWidth: 280 }}
        />
        {showStatusFilter ? (
          <Select
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            sx={FILTER_CONTROL_SX}
          />
        ) : null}
      </Box>

      <Box sx={{ px: 3, pb: 3, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <TableContainer
          sx={{
            overflowX: 'auto',
            overflowY: 'auto',
            minHeight: 0,
            border: `1px solid ${tokens.color.neutral[200]}`,
            borderRadius: 1,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              width: '100%',
              tableLayout: 'fixed',
              '& .MuiTableCell-head': {
                fontSize: 12,
                fontWeight: 600,
                color: 'text.secondary',
                bgcolor: tokens.color.neutral[50],
                borderBottom: `1px solid ${tokens.color.neutral[200]}`,
                py: 1,
                whiteSpace: 'nowrap',
                lineHeight: 1.35,
              },
              '& .MuiTableCell-body': {
                fontSize: 13,
                py: 1,
                borderBottom: `1px solid ${tokens.color.neutral[100]}`,
                whiteSpace: 'nowrap',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
          >
            <TableHead>
              <TableRow>
                {config.columns.map((col) => (
                  <TableCell
                    key={col.key}
                    align={getColumnAlign(col)}
                    sx={getColumnCellSx(col)}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row, idx) => (
                <TableRow key={idx} hover={false}>
                  {config.columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={getColumnAlign(col)}
                      sx={getColumnCellSx(col)}
                    >
                      {renderCell(row[col.key], col.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={config.columns.length} sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No records match the current filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Drawer>
  )
}


function SummaryStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: '10px',
        border: `1px solid ${tokens.color.neutral[200]}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 11, letterSpacing: 0.3, display: 'block', mb: 0.75 }}
      >
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 18, md: 20 } }}>
        ₹{formatCurrency(value)}
      </Typography>
    </Paper>
  )
}

export interface FinancialRevenueYearSectionProps {
  period?: RevenueTimePeriod
  customRange?: [Date | null, Date | null]
}

export function FinancialRevenueYearSection({
  period = 'This Financial Year',
  customRange = [null, null],
}: FinancialRevenueYearSectionProps) {
  const analytics = useMemo(
    () => getFinancialRevenueYearAnalytics(period, customRange),
    [period, customRange],
  )

  return (
    <ChartCard
      title="Financial Revenue Year"
      subtitle="Monthly comparison of PO Value, Invoice Value & Amount Received"
      action={
        <ChartSeriesLegend
          items={[
            { label: 'PO Value', color: CHART_COLORS.teal },
            { label: 'Invoice Value', color: CHART_COLORS.blue },
            { label: 'Amount Received', color: CHART_COLORS.green },
          ]}
        />
      }
    >
      <BarChart
        data={[...analytics.chartData]}
        xKey="month"
        height={280}
        showLegend={false}
        bars={[
          { key: 'poValue', label: 'PO Value', color: CHART_COLORS.teal },
          { key: 'invoiceValue', label: 'Invoice Value', color: CHART_COLORS.blue },
          { key: 'amountReceived', label: 'Amount Received', color: CHART_COLORS.green },
        ]}
        formatY={formatAxisAmount}
      />

      <Grid container spacing={2} sx={{ mt: 2.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryStat label="Total PO Value" value={analytics.totals.poValue} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryStat label="Total Invoice Value" value={analytics.totals.invoiceValue} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryStat label="Total Amount Received" value={analytics.totals.amountReceived} />
        </Grid>
      </Grid>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, lineHeight: 1.5, display: 'block', mt: 2 }}
      >
        {analytics.infoText}
      </Typography>
    </ChartCard>
  )
}


const MENU_ITEM_SX = { fontSize: 12 } as const
const REVENUE_PERIOD_SELECT_SX = { minWidth: 180, fontSize: 12, height: 32 } as const

export function RevenueTab() {
  const [revenuePeriod, setRevenuePeriod] = useState<RevenueTimePeriod>('This Financial Year')
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([null, null])
  const [drawerKpi, setDrawerKpi] = useState<RevenueKpi | null>(null)

  const revenueAnalytics = useMemo(
    () => getRevenueAnalytics(revenuePeriod, customRange),
    [revenuePeriod, customRange],
  )

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
            Revenue
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: 12, mt: 0.25 }}
          >
            Key commercial metrics for the selected period.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'flex-end',
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{
                display: 'block',
                fontSize: 10,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              Time Period
            </Typography>
            <MuiSelect
              size="small"
              value={revenuePeriod}
              onChange={(e) =>
                setRevenuePeriod(e.target.value as RevenueTimePeriod)
              }
              sx={REVENUE_PERIOD_SELECT_SX}
            >
              {REVENUE_TIME_PERIOD_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                  {opt}
                </MenuItem>
              ))}
            </MuiSelect>
          </Box>

          {revenuePeriod === 'Custom Range' ? (
            <DateRangePicker
              size="sm"
              value={customRange}
              onChange={setCustomRange}
              startLabel="From"
              endLabel="To"
            />
          ) : null}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {revenueAnalytics.kpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <RevenueKpiCard
              kpi={kpi}
              onClick={
                CLICKABLE_KPI_IDS.has(kpi.id)
                  ? () => setDrawerKpi(kpi)
                  : undefined
              }
            />
          </Grid>
        ))}
      </Grid>

      <RevenueKpiDrawer
        open={!!drawerKpi}
        onClose={() => setDrawerKpi(null)}
        kpi={drawerKpi}
      />

      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1.5 }}
      >
        Revenue Analytics
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Client Revenue Received vs Vendor Payments"
            subtitle={chartSubtitle(
              revenueAnalytics.granularity,
              'Client collections vs vendor payments month-wise',
            )}
            action={
              <ChartSeriesLegend
                items={[
                  {
                    label: 'Client Revenue Received',
                    color: CHART_COLORS.green,
                  },
                  {
                    label: 'Vendor Payments',
                    color: CHART_COLORS.blue,
                  },
                ]}
              />
            }
          >
            <BarChart
              data={[...revenueAnalytics.clientReceivedVsVendorPayments]}
              xKey="month"
              height={280}
              showLegend={false}
              bars={[
                {
                  key: 'clientReceived',
                  label: 'Client Revenue Received',
                  color: CHART_COLORS.green,
                },
                {
                  key: 'vendorPaid',
                  label: 'Vendor Payments',
                  color: CHART_COLORS.blue,
                },
              ]}
              formatY={formatAxisAmount}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FinancialRevenueYearSection
            period={revenuePeriod}
            customRange={customRange}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

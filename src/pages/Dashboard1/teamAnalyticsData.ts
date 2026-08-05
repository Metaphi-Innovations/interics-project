/**
 * Sample data for Dashboard 1 — Team section (employee-centric, filter by time).
 */

export const TEAM_EMPLOYEE_OPTIONS = [
  { value: 'all', label: 'All Employees' },
  { value: 'emp-001', label: 'Jignesh' },
  { value: 'emp-002', label: 'Arjun Nair' },
  { value: 'emp-003', label: 'Meera Iyer' },
  { value: 'emp-004', label: 'Rohan Desai' },
  { value: 'emp-005', label: 'Priya Shah' },
  { value: 'emp-006', label: 'Kabir Malhotra' },
] as const

export const TEAM_TIME_PERIOD_OPTIONS = [
  'This Year',
  'Last Year',
  'Last 5 Years',
  'Lifetime',
  'Custom Range',
] as const

export type TeamTimePeriod = (typeof TEAM_TIME_PERIOD_OPTIONS)[number]

export interface TeamKpiComparison {
  direction: 'up' | 'down'
  percent: number
  label: string
  previousValue?: string
}

export interface TeamKpiBreakdownItem {
  label: string
  value: number
}

export interface TeamKpi {
  id: string
  title: string
  value: string
  /** Secondary line under the main value (e.g. "Projects"). */
  valueLabel?: string
  subtitle: string
  icon: 'revenue' | 'profit' | 'sqft' | 'projects' | 'size' | 'duration'
  comparison?: TeamKpiComparison
  breakdown?: TeamKpiBreakdownItem[]
}

export interface TeamSqftSummary {
  averageLabel: string
  averageValue: number
  totalLabel: string
  totalValue: number
}

export interface TeamAnalyticsBundle {
  kpis: TeamKpi[]
  revenueTrend: Array<Record<string, string | number>>
  revenueTrendXKey: string
  projectsByStage: Array<{ label: string; pitch: number; live: number; completed: number }>
  sqftTrend: Array<{ period: string; sqft: number }>
  sqftSummary: TeamSqftSummary
  revenueVsProfit: Array<{ period: string; revenue: number; profit: number }>
}

function periodFactor(period: TeamTimePeriod): number {
  switch (period) {
    case 'This Year':
      return 1
    case 'Last Year':
      return 0.88
    case 'Last 5 Years':
      return 1.35
    case 'Lifetime':
      return 1.7
    case 'Custom Range':
      return 0.95
    default:
      return 1
  }
}

function employeeFactor(employeeId: string): number {
  if (employeeId === 'all') return 1
  const weights: Record<string, number> = {
    'emp-001': 0.42,
    'emp-002': 0.38,
    'emp-003': 0.32,
    'emp-004': 0.28,
    'emp-005': 0.24,
    'emp-006': 0.22,
  }
  return weights[employeeId] ?? 0.3
}

function formatCr(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`
  return `₹${(value / 100_000).toFixed(1)} L`
}

function formatSqftValue(value: number): string {
  return Math.round(value).toLocaleString('en-IN')
}

function sqftKpiForPeriod(period: TeamTimePeriod, e: number): { value: number; subtitle: string } {
  switch (period) {
    case 'This Year':
      return { value: Math.round(18_420 * e), subtitle: 'This Year' }
    case 'Last Year':
      return { value: Math.round(47_652 * e), subtitle: 'Last Year' }
    case 'Last 5 Years':
      return { value: Math.round(1_18_400 * e), subtitle: 'Last 5 Years' }
    case 'Lifetime':
      return { value: Math.round(1_42_500 * e), subtitle: 'Lifetime Total' }
    case 'Custom Range':
      return { value: Math.round(22_150 * e), subtitle: 'Custom Range' }
    default:
      return { value: Math.round(18_420 * e), subtitle: 'This Year' }
  }
}

function buildMonthlySqft(e: number, yearFactor: number): Array<{ period: string; sqft: number }> {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  const base = [2800, 3100, 2950, 3400, 3600, 3200, 3800, 4100, 3500, 3300, 3000, 3450]
  return months.map((period, i) => ({
    period,
    sqft: Math.round(base[i] * e * yearFactor),
  }))
}

function buildSqftTrend(
  period: TeamTimePeriod,
  e: number,
): { trend: Array<{ period: string; sqft: number }>; summary: TeamSqftSummary } {
  if (period === 'This Year' || period === 'Custom Range') {
    const trend = buildMonthlySqft(e, period === 'Custom Range' ? 0.95 : 1)
    const total = trend.reduce((sum, row) => sum + row.sqft, 0)
    return {
      trend,
      summary: {
        averageLabel: 'Average / Month',
        averageValue: Math.round(total / trend.length),
        totalLabel: period === 'Custom Range' ? 'Period Total' : 'This Year Total',
        totalValue: total,
      },
    }
  }

  if (period === 'Last Year') {
    const trend = buildMonthlySqft(e, 0.88)
    const total = trend.reduce((sum, row) => sum + row.sqft, 0)
    return {
      trend,
      summary: {
        averageLabel: 'Average / Month',
        averageValue: Math.round(total / trend.length),
        totalLabel: 'Last Year Total',
        totalValue: total,
      },
    }
  }

  if (period === 'Last 5 Years') {
    const trend = [
      { period: '2021', sqft: Math.round(18_200 * e) },
      { period: '2022', sqft: Math.round(22_000 * e) },
      { period: '2023', sqft: Math.round(28_500 * e) },
      { period: '2024', sqft: Math.round(34_200 * e) },
      { period: '2025', sqft: Math.round(38_800 * e) },
    ]
    const total = trend.reduce((sum, row) => sum + row.sqft, 0)
    return {
      trend,
      summary: {
        averageLabel: 'Average / Year',
        averageValue: Math.round(total / trend.length),
        totalLabel: 'Period Total',
        totalValue: total,
      },
    }
  }

  // Lifetime — from first completed project year through latest
  const trend = [
    { period: '2019', sqft: Math.round(9_800 * e) },
    { period: '2020', sqft: Math.round(12_400 * e) },
    { period: '2021', sqft: Math.round(18_200 * e) },
    { period: '2022', sqft: Math.round(22_000 * e) },
    { period: '2023', sqft: Math.round(28_500 * e) },
    { period: '2024', sqft: Math.round(34_200 * e) },
    { period: '2025', sqft: Math.round(38_800 * e) },
    { period: '2026', sqft: Math.round(42_500 * e) },
  ]
  const total = trend.reduce((sum, row) => sum + row.sqft, 0)
  return {
    trend,
    summary: {
      averageLabel: 'Average / Year',
      averageValue: Math.round(total / trend.length),
      totalLabel: 'Lifetime Total',
      totalValue: total,
    },
  }
}

/** Filter-driven sample analytics for the Team section. */
export function getTeamAnalytics(
  employeeId: string,
  period: TeamTimePeriod,
): TeamAnalyticsBundle {
  const e = employeeFactor(employeeId)
  const p = periodFactor(period)
  const f = e * p

  const revenue = Math.round(24_500_000 * f)
  const profit = Math.round(6_800_000 * f)
  const projectsTotal = Math.max(3, Math.round(36 * f))
  const pitch = Math.max(1, Math.round(projectsTotal * 0.17))
  const live = Math.max(1, Math.round(projectsTotal * 0.58))
  const completed = Math.max(1, projectsTotal - pitch - live)
  const avgSize = Math.round(3958 * (0.92 + e * 0.2))
  const avgDuration = Math.round(112 * (0.95 + (1 - e) * 0.15))

  const revenueYoY = employeeId === 'all' ? 12 : employeeId === 'emp-001' ? 15 : 8
  const profitYoY = employeeId === 'all' ? 9 : employeeId === 'emp-001' ? 11 : 6
  const previousRevenue = Math.round(revenue / (1 + revenueYoY / 100))
  const previousProfit = Math.round(profit / (1 + profitYoY / 100))

  const sqftKpi = sqftKpiForPeriod(period, e)
  const { trend: sqftTrend, summary: sqftSummary } = buildSqftTrend(period, e)

  const useMonths = period === 'This Year' || period === 'Last Year' || period === 'Custom Range'

  const revenueTrend = useMonths
    ? [
        { period: 'Apr', current: Math.round(1_800_000 * f), previous: Math.round(1_550_000 * f) },
        { period: 'May', current: Math.round(2_050_000 * f), previous: Math.round(1_720_000 * f) },
        { period: 'Jun', current: Math.round(1_950_000 * f), previous: Math.round(1_880_000 * f) },
        { period: 'Jul', current: Math.round(2_200_000 * f), previous: Math.round(1_900_000 * f) },
        { period: 'Aug', current: Math.round(2_350_000 * f), previous: Math.round(2_050_000 * f) },
        { period: 'Sep', current: Math.round(2_100_000 * f), previous: Math.round(1_980_000 * f) },
        { period: 'Oct', current: Math.round(2_450_000 * f), previous: Math.round(2_100_000 * f) },
        { period: 'Nov', current: Math.round(2_600_000 * f), previous: Math.round(2_250_000 * f) },
        { period: 'Dec', current: Math.round(2_300_000 * f), previous: Math.round(2_150_000 * f) },
        { period: 'Jan', current: Math.round(2_150_000 * f), previous: Math.round(1_900_000 * f) },
        { period: 'Feb', current: Math.round(2_000_000 * f), previous: Math.round(1_850_000 * f) },
        { period: 'Mar', current: Math.round(2_250_000 * f), previous: Math.round(2_000_000 * f) },
      ]
    : [
        { period: '2022', current: Math.round(14_200_000 * e), previous: Math.round(12_100_000 * e) },
        { period: '2023', current: Math.round(17_800_000 * e), previous: Math.round(14_200_000 * e) },
        { period: '2024', current: Math.round(20_500_000 * e), previous: Math.round(17_800_000 * e) },
        { period: '2025', current: Math.round(22_800_000 * e), previous: Math.round(20_500_000 * e) },
        {
          period: '2026',
          current: Math.round(24_500_000 * e * (period === 'Lifetime' ? 1 : p)),
          previous: Math.round(22_800_000 * e),
        },
      ]

  return {
    kpis: [
      {
        id: 'revenue',
        title: 'Revenue Generated',
        value: formatCr(revenue),
        subtitle: 'Compared to Last Year',
        icon: 'revenue',
        comparison: {
          direction: 'up',
          percent: revenueYoY,
          label: 'Compared to Last Year',
          previousValue: formatCr(previousRevenue),
        },
      },
      {
        id: 'profit',
        title: 'Profit Generated',
        value: formatCr(profit),
        subtitle: 'Compared to Last Year',
        icon: 'profit',
        comparison: {
          direction: 'up',
          percent: profitYoY,
          label: 'Compared to Last Year',
          previousValue: formatCr(previousProfit),
        },
      },
      {
        id: 'sqft',
        title: 'Total Sq.ft Designed',
        value: `${formatSqftValue(sqftKpi.value)} Sq.ft`,
        subtitle: sqftKpi.subtitle,
        icon: 'sqft',
      },
      {
        id: 'projects',
        title: 'Number of Projects',
        value: String(projectsTotal),
        valueLabel: 'Projects',
        subtitle: 'Projects owned or co-delivered.',
        icon: 'projects',
        breakdown: [
          { label: 'Pitch', value: pitch },
          { label: 'Live', value: live },
          { label: 'Completed', value: completed },
        ],
      },
      {
        id: 'size',
        title: 'Average Project Size',
        value: `${formatSqftValue(avgSize)} sqft`,
        subtitle: 'Mean carpet area per project.',
        icon: 'size',
      },
      {
        id: 'duration',
        title: 'Average Project Duration',
        value: `${avgDuration} days`,
        subtitle: 'Mean planned-to-handover duration.',
        icon: 'duration',
      },
    ],
    revenueTrend,
    revenueTrendXKey: 'period',
    projectsByStage: [
      {
        label: 'Projects',
        pitch,
        live,
        completed,
      },
    ],
    sqftTrend,
    sqftSummary,
    revenueVsProfit: [
      {
        period: 'Previous Year',
        revenue: previousRevenue,
        profit: previousProfit,
      },
      {
        period: 'Current Year',
        revenue,
        profit,
      },
    ],
  }
}

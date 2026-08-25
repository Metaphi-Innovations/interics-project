/**
 * Dashboard — Team section
 * Team Performance master graph and existing charts
 */

/**
 * Sample data for Dashboard — Team section (employee-centric, filter by time).
 * Plus Team Performance master graph from real project assignments.
 */


import {
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import {
  Autocomplete,
  Box,
  Grid,
  MenuItem,
  Select as MuiSelect,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { TooltipContentProps } from 'recharts'
import {
  BarChart,
  ChartCard,
  Checkbox,
  useToast,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import type { Project } from '@/slices/projects/reducer'
import { getProjectAssignedMembers } from '@/utils/projectAssignedTeam'

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

function projectDurationDays(project: Project): number | null {
  if (!project.startDate) return null
  const start = new Date(project.startDate)
  const endIso = project.expectedEndDate
  if (!endIso) return null
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

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
  projectsByStage: Array<{
    label: string
    pitch: number
    live: number
    completed: number
    archived: number
  }>
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
  const live = Math.max(1, Math.round(projectsTotal * 0.52))
  const archived = Math.max(1, Math.round(projectsTotal * 0.08))
  const completed = Math.max(0, projectsTotal - pitch - live - archived)
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
          { label: 'Archived', value: archived },
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
        archived,
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

/* -------------------------------------------------------------------------- */
/* Team Performance master graph (real project assignments)                   */
/* -------------------------------------------------------------------------- */

export const TEAM_METRIC_OPTIONS = [
  'Revenue',
  'Project Duration',
  'Number of Projects',
  'Completed Projects – Year Comparison',
  'Pitch vs Live Projects',
] as const

export type TeamMetric = (typeof TEAM_METRIC_OPTIONS)[number]

export interface TeamMemberOption {
  value: string
  label: string
}

export interface TeamChartSeriesConfig {
  key: string
  label: string
  color: string
}

export interface TeamPerformanceChartConfig {
  /** Card subtitle — updates with the selected metric. */
  subtitle: string
  /** Numeric-axis label (X when horizontal). */
  yAxisLabel: string
  format: 'count' | 'sqft' | 'days' | 'currency'
  series: TeamChartSeriesConfig[]
  data: Array<Record<string, string | number>>
}

export interface TeamPerformanceBundle {
  memberOptions: TeamMemberOption[]
  performanceChart: TeamPerformanceChartConfig
}

interface DateBounds {
  start: Date
  end: Date
}

interface MemberAccumulator {
  userId: string
  name: string
  projectIds: Set<string>
  projects: Project[]
}

function startOfDay(d: Date): Date {
  const next = new Date(d)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(d: Date): Date {
  const next = new Date(d)
  next.setHours(23, 59, 59, 999)
  return next
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function projectAnchorDate(project: Project): Date | null {
  // Use createdAt as the primary anchor — it is always populated and reflects
  // when the project record was registered (startDate is the execution start,
  // which may be in prior years for ongoing projects).
  return parseDate(project.createdAt) ?? parseDate(project.startDate)
}

function getPerformancePeriodBounds(period: TeamTimePeriod, now = new Date()): {
  current: DateBounds
  previous: DateBounds
} {
  const year = now.getFullYear()
  if (period === 'Last Year') {
    return {
      current: {
        start: startOfDay(new Date(year - 1, 0, 1)),
        end: endOfDay(new Date(year - 1, 11, 31)),
      },
      previous: {
        start: startOfDay(new Date(year - 2, 0, 1)),
        end: endOfDay(new Date(year - 2, 11, 31)),
      },
    }
  }
  if (period === 'Last 5 Years') {
    return {
      current: {
        start: startOfDay(new Date(year - 4, 0, 1)),
        end: endOfDay(now),
      },
      previous: {
        start: startOfDay(new Date(year - 9, 0, 1)),
        end: endOfDay(new Date(year - 5, 11, 31)),
      },
    }
  }
  if (period === 'Lifetime') {
    return {
      current: {
        start: startOfDay(new Date(2000, 0, 1)),
        end: endOfDay(now),
      },
      previous: {
        start: startOfDay(new Date(2000, 0, 1)),
        end: endOfDay(new Date(year - 1, 11, 31)),
      },
    }
  }
  // This Year + Custom Range → YTD vs prior calendar year
  return {
    current: {
      start: startOfDay(new Date(year, 0, 1)),
      end: endOfDay(now),
    },
    previous: {
      start: startOfDay(new Date(year - 1, 0, 1)),
      end: endOfDay(new Date(year - 1, 11, 31)),
    },
  }
}

function projectInBounds(project: Project, bounds: DateBounds): boolean {
  const anchor = projectAnchorDate(project)
  if (!anchor) return false
  return anchor >= bounds.start && anchor <= bounds.end
}

/** Live segment for Number of Projects: status Live and Live/Start Date in period. */
function liveProjectStartInBounds(project: Project, bounds: DateBounds): boolean {
  if (project.status !== 'Live') return false
  const start = parseDate(project.startDate)
  if (!start) return false
  return start >= bounds.start && start <= bounds.end
}

function projectRevenue(project: Project): number {
  return project.totalClientPOValue || project.projectValue || 0
}

function projectSqft(project: Project): number | null {
  const area = project.carpetArea ?? project.chargeableArea ?? null
  if (area == null || area <= 0) return null
  return area
}



function uniqueAssignedMembers(project: Project): Array<{ userId: string; name: string }> {
  const seen = new Set<string>()
  const members: Array<{ userId: string; name: string }> = []
  for (const m of getProjectAssignedMembers(project)) {
    const id = m.userId.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    members.push({ userId: id, name: m.name.trim() || 'Unknown' })
  }
  return members
}

function accumulate(map: Map<string, MemberAccumulator>, projects: Project[]): void {
  for (const project of projects) {
    for (const member of uniqueAssignedMembers(project)) {
      let acc = map.get(member.userId)
      if (!acc) {
        acc = {
          userId: member.userId,
          name: member.name,
          projectIds: new Set(),
          projects: [],
        }
        map.set(member.userId, acc)
      } else if (member.name && (!acc.name || acc.name === 'Unknown')) {
        acc.name = member.name
      }
      if (acc.projectIds.has(project.id)) continue
      acc.projectIds.add(project.id)
      acc.projects.push(project)
    }
  }
}

interface MemberMetrics {
  userId: string
  name: string
  projectCount: number
  totalDurationDays: number
  avgDurationDays: number
  totalRevenue: number
  avgRevenue: number
  pitches: number
  liveProjects: number
  /** Live projects whose startDate falls in the selected period (Number of Projects chart). */
  liveProjectsInPeriod: number
  completedProjects: number
  cancelledProjects: number
  archivedProjects: number
  previousCompletedProjects: number
}

function metricsForMember(
  current: MemberAccumulator | undefined,
  previous: MemberAccumulator | undefined,
): MemberMetrics | null {
  if (!current && !previous) return null
  const userId = current?.userId ?? previous!.userId
  const name = current?.name ?? previous!.name
  const projects = current?.projects ?? []
  const prevProjects = previous?.projects ?? []

  // "Use actual project duration for completed projects."
  const completedProjectsList = projects.filter((p) => p.status === 'Completed')
  const durations = completedProjectsList
    .map(projectDurationDays)
    .filter((v): v is number => v != null)
  const totalDurationDays = durations.reduce((s, v) => s + v, 0)
  const avgDurationDays =
    durations.length > 0 ? Math.round(totalDurationDays / durations.length) : 0

  const totalRevenue = projects.reduce((s, p) => s + projectRevenue(p), 0)
  const avgRevenue = projects.length > 0 ? Math.round(totalRevenue / projects.length) : 0

  let pitches = 0
  let liveProjects = 0
  let completedProjects = 0
  let cancelledProjects = 0
  let archivedProjects = 0
  for (const p of projects) {
    if (p.status === 'Pitch') pitches += 1
    if (p.status === 'Live') liveProjects += 1
    if (p.status === 'Completed') completedProjects += 1
    if (p.status === 'Cancelled') cancelledProjects += 1
    if (p.status === 'Archived') archivedProjects += 1
  }

  const previousCompletedProjects = prevProjects.filter((p) => p.status === 'Completed').length

  return {
    userId,
    name,
    projectCount: projects.length,
    totalDurationDays,
    avgDurationDays,
    totalRevenue,
    avgRevenue,
    pitches,
    liveProjects,
    liveProjectsInPeriod: 0,
    completedProjects,
    cancelledProjects,
    archivedProjects,
    previousCompletedProjects,
  }
}

function buildPerformanceChart(
  members: MemberMetrics[],
  metric: TeamMetric,
): TeamPerformanceChartConfig {
  const dataBase = members.map((m) => ({ member: m.name, userId: m.userId }))

  switch (metric) {
    case 'Revenue':
      return {
        subtitle: 'Average & Total Revenue by team member',
        yAxisLabel: 'Revenue (₹)',
        format: 'currency',
        series: [
          { key: 'average', label: 'Average Revenue', color: CHART_COLORS.teal },
          { key: 'total', label: 'Total Revenue', color: CHART_COLORS.green },
        ],
        data: members.map((m, i) => ({
          ...dataBase[i],
          average: m.avgRevenue,
          total: m.totalRevenue,
        })),
      }
    case 'Project Duration':
      return {
        subtitle: 'Average & Total Project Duration by team member',
        yAxisLabel: 'Project Duration (days)',
        format: 'days',
        series: [
          { key: 'average', label: 'Average Project Duration', color: CHART_COLORS.blue },
          { key: 'total', label: 'Total Project Duration', color: CHART_COLORS.purple },
        ],
        data: members.map((m, i) => ({
          ...dataBase[i],
          average: m.avgDurationDays,
          total: m.totalDurationDays,
        })),
      }
    case 'Number of Projects':
      return {
        subtitle: 'Project status distribution by team member',
        yAxisLabel: 'Number of Projects',
        format: 'count',
        series: [
          { key: 'pitch', label: 'Pitch', color: CHART_COLORS.blue },
          { key: 'live', label: 'Live', color: CHART_COLORS.teal },
          { key: 'completed', label: 'Completed', color: CHART_COLORS.green },
          { key: 'cancelled', label: 'Cancelled', color: CHART_COLORS.red },
          { key: 'archived', label: 'Archived', color: CHART_COLORS.orange },
        ],
        data: members.map((m, i) => ({
          ...dataBase[i],
          pitch: m.pitches,
          live: m.liveProjectsInPeriod,
          completed: m.completedProjects,
          cancelled: m.cancelledProjects,
          archived: m.archivedProjects,
        })),
      }
    case 'Completed Projects – Year Comparison':
      return {
        subtitle: 'Completed projects: Current Financial Year vs Previous Financial Year',
        yAxisLabel: 'Completed Projects',
        format: 'count',
        series: [
          { key: 'current', label: 'Current Year', color: CHART_COLORS.teal },
          { key: 'previous', label: 'Previous Year', color: CHART_COLORS.grey },
        ],
        data: members.map((m, i) => ({
          ...dataBase[i],
          current: m.completedProjects,
          previous: m.previousCompletedProjects,
        })),
      }
    case 'Pitch vs Live Projects':
      return {
        subtitle: 'Pitch vs Live projects by team member',
        yAxisLabel: 'Pitch vs Live Projects',
        format: 'count',
        series: [
          { key: 'pitch', label: 'Pitch Projects', color: CHART_COLORS.blue },
          { key: 'live', label: 'Live Projects', color: CHART_COLORS.teal },
        ],
        data: members.map((m, i) => ({
          ...dataBase[i],
          pitch: m.pitches,
          live: m.liveProjects,
        })),
      }
    default:
      return {
        subtitle: 'Team performance by team member',
        yAxisLabel: 'Value',
        format: 'count',
        series: [{ key: 'value', label: 'Value', color: CHART_COLORS.teal }],
        data: members.map((m, i) => ({ ...dataBase[i], value: m.projectCount })),
      }
  }
}

function emptyMemberMetrics(userId: string, name: string): MemberMetrics {
  return {
    userId,
    name,
    projectCount: 0,
    totalDurationDays: 0,
    avgDurationDays: 0,
    totalRevenue: 0,
    avgRevenue: 0,
    pitches: 0,
    liveProjects: 0,
    liveProjectsInPeriod: 0,
    completedProjects: 0,
    cancelledProjects: 0,
    archivedProjects: 0,
    previousCompletedProjects: 0,
  }
}

function buildMemberOptions(projects: Project[]): TeamMemberOption[] {
  const byId = new Map<string, string>()
  for (const project of projects) {
    for (const member of uniqueAssignedMembers(project)) {
      if (!byId.has(member.userId)) byId.set(member.userId, member.name)
    }
  }
  const options = [...byId.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return [{ value: 'all', label: 'All Team Members' }, ...options]
}

/** Get sort value dynamically based on metric selection for ranking */
function getMetricSortValue(m: MemberMetrics, metric: TeamMetric): number {
  switch (metric) {
    case 'Revenue':
      return m.totalRevenue
    case 'Project Duration':
      return m.totalDurationDays
    case 'Number of Projects':
      return (
        m.pitches +
        m.liveProjectsInPeriod +
        m.completedProjects +
        m.cancelledProjects +
        m.archivedProjects
      )
    case 'Completed Projects – Year Comparison':
      return m.completedProjects
    case 'Pitch vs Live Projects':
      return m.pitches + m.liveProjects
    default:
      return m.projectCount
  }
}

/** Master Team Performance chart from real project assignments. */
export function getTeamPerformanceAnalytics(
  projects: Project[],
  timePeriod: TeamTimePeriod,
  teamMemberIds: string[],
  metric: TeamMetric,
): TeamPerformanceBundle {
  const memberOptions = buildMemberOptions(projects)
  const { current: currentBounds, previous: previousBounds } =
    getPerformancePeriodBounds(timePeriod)

  const currentProjects = projects.filter((p) => projectInBounds(p, currentBounds))
  const previousProjects = projects.filter((p) => projectInBounds(p, previousBounds))

  const currentMap = new Map<string, MemberAccumulator>()
  const previousMap = new Map<string, MemberAccumulator>()
  accumulate(currentMap, currentProjects)
  accumulate(previousMap, previousProjects)

  /** Live counts by Live/Start Date in the selected period (Number of Projects only). */
  const liveInPeriodByMember = new Map<string, { name: string; count: number }>()
  for (const project of projects) {
    if (!liveProjectStartInBounds(project, currentBounds)) continue
    for (const member of uniqueAssignedMembers(project)) {
      const prev = liveInPeriodByMember.get(member.userId)
      if (prev) {
        prev.count += 1
        if (member.name && (!prev.name || prev.name === 'Unknown')) prev.name = member.name
      } else {
        liveInPeriodByMember.set(member.userId, { name: member.name, count: 1 })
      }
    }
  }

  const memberIds = new Set([
    ...currentMap.keys(),
    ...previousMap.keys(),
    ...liveInPeriodByMember.keys(),
  ])
  let members = [...memberIds]
    .map((id) => {
      const base = metricsForMember(currentMap.get(id), previousMap.get(id))
      const liveInPeriod = liveInPeriodByMember.get(id)
      if (base) {
        return {
          ...base,
          liveProjectsInPeriod: liveInPeriod?.count ?? 0,
        }
      }
      if (liveInPeriod) {
        return {
          ...emptyMemberMetrics(id, liveInPeriod.name),
          liveProjectsInPeriod: liveInPeriod.count,
        }
      }
      return null
    })
    .filter((m): m is MemberMetrics => m != null)

  // Determine if specific members are filtered
  const hasSpecificSelection = teamMemberIds.length > 0 && !teamMemberIds.includes('all')

  if (hasSpecificSelection) {
    // Show only selected team members, sorted by metric descending
    members = members.filter((m) => teamMemberIds.includes(m.userId))
    // Add empty metrics for any selected member who has no projects in the period
    for (const id of teamMemberIds) {
      if (!members.some((m) => m.userId === id)) {
        const opt = memberOptions.find((o) => o.value === id)
        if (opt) {
          members.push(emptyMemberMetrics(opt.value, opt.label))
        }
      }
    }
    members.sort((a, b) => getMetricSortValue(b, metric) - getMetricSortValue(a, metric) || a.name.localeCompare(b.name))
  } else if (metric === 'Completed Projects – Year Comparison') {
    // Include every team member (even 0 / 0) so year comparison is visible without hover
    for (const opt of memberOptions) {
      if (opt.value === 'all') continue
      if (!members.some((m) => m.userId === opt.value)) {
        members.push(emptyMemberMetrics(opt.value, opt.label))
      }
    }
    members.sort((a, b) => getMetricSortValue(b, metric) - getMetricSortValue(a, metric) || a.name.localeCompare(b.name))
  } else {
    // All Team Members: show everyone with any projects, sorted by metric descending
    members.sort((a, b) => getMetricSortValue(b, metric) - getMetricSortValue(a, metric) || a.name.localeCompare(b.name))
  }

  return {
    memberOptions,
    performanceChart: buildPerformanceChart(members, metric),
  }
}

export const MAX_SQFT_TEAM_MEMBERS = 10

export interface TeamMemberSqftPoint {
  userId: string
  member: string
  sqft: number
}

export interface SqftByTeamMemberBundle {
  memberOptions: TeamMemberOption[]
  members: TeamMemberSqftPoint[]
}

/** Total sq.ft designed per team member from real project assignments. */
export function getSqftDesignedByTeamMember(
  projects: Project[],
  timePeriod: TeamTimePeriod,
): SqftByTeamMemberBundle {
  const { current: currentBounds } = getPerformancePeriodBounds(timePeriod)
  const currentProjects = projects.filter((p) => projectInBounds(p, currentBounds))
  const currentMap = new Map<string, MemberAccumulator>()
  accumulate(currentMap, currentProjects)

  // Use a map to accumulate sqft per member
  const memberSqftMap = new Map<string, { name: string; sqft: number }>()

  for (const project of currentProjects) {
    const sqft = projectSqft(project) || 0
    for (const member of uniqueAssignedMembers(project)) {
      const existing = memberSqftMap.get(member.userId)
      if (existing) {
        existing.sqft += sqft
      } else {
        memberSqftMap.set(member.userId, { name: member.name, sqft })
      }
    }
  }

  const members = [...memberSqftMap.entries()]
    .map(([userId, val]) => ({ userId, member: val.name, sqft: Math.round(val.sqft) }))
    .sort((a, b) => b.sqft - a.sqft || a.member.localeCompare(b.member))

  const memberOptions = members
    .map((m) => ({ value: m.userId, label: m.member }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return { memberOptions, members }
}

const METRIC_SELECT_SX = { minWidth: 200, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const

/** Match Metric Select theme fill (action.hover, no outline) — do not override bgcolor/border. */
const MEMBER_AUTOCOMPLETE_SX = {
  minWidth: { xs: '100%', sm: 200 },
  maxWidth: { xs: '100%', sm: 240 },
  '& .MuiOutlinedInput-root': {
    height: 32,
    fontSize: 12,
  },
  '& .MuiInputBase-input': {
    fontSize: 12,
    py: 0,
  },
} as const

const FILTER_LABEL_SX = {
  display: 'block',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  mb: 0.5,
} as const

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function formatSqft(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('en-IN')
}

function formatDays(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${Math.round(n)}d`
}

function formatCount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return String(Math.round(n))
}

function formatMetricValue(
  value: number | string | null | undefined,
  format: TeamPerformanceChartConfig['format'],
): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  if (format === 'currency') return `₹${formatCurrency(n)}`
  if (format === 'sqft') return `${Math.round(n).toLocaleString('en-IN')} sqft`
  if (format === 'days') return `${Math.round(n)} days`
  return String(Math.round(n))
}

function ChartTooltipShell({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${tokens.color.neutral[200]}`,
        borderRadius: 1,
        px: 1.5,
        py: 1,
        boxShadow: tokens.shadow.md,
        maxWidth: 280,
      }}
    >
      {children}
    </Box>
  )
}

function TeamPerformanceTooltip({
  active,
  payload,
  format,
}: TooltipContentProps & { format: TeamPerformanceChartConfig['format'] }) {
  if (!active || !payload?.length) return null
  const member = String(payload[0]?.payload?.member ?? '')

  // Calculate total projects if it's the Number of Projects status breakdown
  const isNumberProjects = payload.some((entry) =>
    ['pitch', 'live', 'completed', 'cancelled', 'archived'].includes(String(entry.dataKey)),
  )
  let totalProjectsSum = 0
  if (isNumberProjects) {
    payload.forEach(entry => {
      const val = Number(entry.value)
      if (!Number.isNaN(val)) {
        totalProjectsSum += val
      }
    })
  }

  return (
    <ChartTooltipShell>
      {member ? (
        <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block', mb: 0.5 }}>
          {member}
        </Typography>
      ) : null}
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? entry.name ?? '')
        const label = String(entry.name ?? key)
        return (
          <Typography
            key={key}
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
          >
            <Box component="span" sx={{ color: String(entry.color ?? 'inherit') }}>
              ●
            </Box>{' '}
            {label}:{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatMetricValue(entry.value as number | string | undefined, format)}
            </Box>
          </Typography>
        )
      })}
      {isNumberProjects && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: 11, display: 'block', mt: 0.75, pt: 0.5, borderTop: `1px solid ${tokens.color.neutral[200]}` }}
        >
          Total Projects:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {totalProjectsSum}
          </Box>
        </Typography>
      )}
    </ChartTooltipShell>
  )
}

export function TeamTab() {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const projectsLoading = useAppSelector((s) => s.projects.loading)

  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([])
  const [metric, setMetric] = useState<TeamMetric>('Number of Projects')
  const [sqftMemberIds, setSqftMemberIds] = useState<string[]>([])
  const employeeId = 'all'
  const timePeriod: TeamTimePeriod = 'This Year'

  useEffect(() => {
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
  }, [dispatch])

  const analytics = useMemo(
    () => getTeamAnalytics(employeeId, timePeriod),
    [employeeId, timePeriod],
  )

  const performance = useMemo(
    () => getTeamPerformanceAnalytics(projects, timePeriod, teamMemberIds, metric),
    [projects, timePeriod, teamMemberIds, metric],
  )

  // Filter out any selected member IDs that are not present in options
  useEffect(() => {
    const validIds = teamMemberIds.filter((id) =>
      performance.memberOptions.some((o) => o.value === id),
    )
    if (validIds.length !== teamMemberIds.length) {
      setTeamMemberIds(validIds)
    }
  }, [performance.memberOptions, teamMemberIds])

  const selectedTeamMemberOptions = useMemo((): TeamMemberOption[] => {
    return performance.memberOptions.filter((opt) => teamMemberIds.includes(opt.value))
  }, [performance.memberOptions, teamMemberIds])

  const handleTeamMemberChange = (
    _event: SyntheticEvent,
    value: TeamMemberOption[],
  ) => {
    // If selecting "All Team Members" (value contains 'all') or no members selected, clear to default top 10
    if (value.some((o) => o.value === 'all')) {
      setTeamMemberIds([])
    } else {
      setTeamMemberIds(value.map((o) => o.value))
    }
  }

  const scopeLabel = 'team'

  const sqftByMember = useMemo(
    () => getSqftDesignedByTeamMember(projects, timePeriod),
    [projects, timePeriod],
  )

  const selectedSqftMembers = useMemo(
    () =>
      sqftByMember.memberOptions.filter((opt) => sqftMemberIds.includes(opt.value)),
    [sqftByMember.memberOptions, sqftMemberIds],
  )

  const sqftChartData = useMemo(() => {
    const ranked =
      sqftMemberIds.length === 0
        ? sqftByMember.members.slice(0, MAX_SQFT_TEAM_MEMBERS)
        : sqftByMember.members
            .filter((row) => sqftMemberIds.includes(row.userId))
            .sort((a, b) => b.sqft - a.sqft || a.member.localeCompare(b.member))
            .slice(0, MAX_SQFT_TEAM_MEMBERS)
    return [...ranked].reverse()
  }, [sqftByMember.members, sqftMemberIds])

  const sqftChartHeight = Math.max(280, Math.min(420, sqftChartData.length * 36 + 72))

  const handleSqftMembersChange = (
    _event: SyntheticEvent,
    value: TeamMemberOption[],
  ) => {
    if (value.length > MAX_SQFT_TEAM_MEMBERS) {
      toast.warning(
        'Maximum 10 team members',
        'A maximum of 10 team members can be compared at a time.',
      )
      return
    }
    setSqftMemberIds(value.map((opt) => opt.value))
  }

  const chart = performance.performanceChart
  const formatPerfY =
    chart.format === 'currency'
      ? formatAxisAmount
      : chart.format === 'sqft'
        ? formatSqft
        : chart.format === 'days'
          ? formatDays
          : formatCount
  const isYearComparison = metric === 'Completed Projects – Year Comparison'
  // Grouped year-comparison needs taller rows so Current / Previous bars sit side-by-side
  const chartHeight = Math.max(
    300,
    chart.data.length * (isYearComparison ? 64 : 44) + 80,
  )
  const hasChartData = chart.data.length > 0

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Team
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Individual performance across revenue, delivery, and capacity.
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <ChartCard
          title="Team Performance"
          subtitle={chart.subtitle}
          action={
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
              }}
            >
              <Box sx={{ width: { xs: '100%', sm: 220 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Team Member
                </Typography>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  size="small"
                  options={performance.memberOptions}
                  value={selectedTeamMemberOptions}
                  onChange={handleTeamMemberChange}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props as {
                      key: string
                    } & HTMLAttributes<HTMLLIElement>
                    return (
                      <li key={key} {...rest}>
                        <Checkbox
                          checked={selected}
                          size="sm"
                          sx={{ mr: 1, pointerEvents: 'none' }}
                        />
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {option.label}
                        </Typography>
                      </li>
                    )
                  }}
                  renderTags={(selected) => (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 12, pl: 0.5, whiteSpace: 'nowrap' }}
                    >
                      {selected.length} selected
                    </Typography>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={
                        selectedTeamMemberOptions.length === 0
                          ? 'All Team Members'
                          : undefined
                      }
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select team members',
                      }}
                    />
                  )}
                  slotProps={{
                    listbox: {
                      sx: { maxHeight: 280, overflow: 'auto' },
                    },
                    paper: {
                      sx: {
                        fontSize: 12,
                        '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                      },
                    },
                  }}
                  sx={{
                    ...MEMBER_AUTOCOMPLETE_SX,
                    maxWidth: '100%',
                    '& .MuiOutlinedInput-root': {
                      ...MEMBER_AUTOCOMPLETE_SX['& .MuiOutlinedInput-root'],
                      height: 'auto',
                      minHeight: 32,
                      flexWrap: 'nowrap',
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Metric
                </Typography>
                <MuiSelect
                  size="small"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as TeamMetric)}
                  sx={METRIC_SELECT_SX}
                >
                  {TEAM_METRIC_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                      {opt}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>

            </Box>
          }
        >
          {projectsLoading && !hasChartData ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              Loading team performance…
            </Typography>
          ) : !hasChartData ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              No team member data for the selected filters.
            </Typography>
          ) : (
            <Box
              sx={{
                maxHeight: 520,
                overflowY: 'auto',
                overflowX: 'hidden',
                // Custom thin scrollbar styling
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'divider',
                  borderRadius: 3,
                },
              }}
            >
              <BarChart
                key={`${teamMemberIds.join(',')}-${metric}`}
                data={[...chart.data]}
                xKey="member"
                height={chartHeight}
                orientation="horizontal"
                stacked={metric === 'Number of Projects'}
                showLegend={false}
                barSize={
                  isYearComparison
                    ? 14
                    : chart.series.length > 1 && metric !== 'Number of Projects'
                      ? 12
                      : 18
                }
                bars={chart.series.map((s) => ({
                  key: s.key,
                  label: s.label,
                  color: s.color,
                }))}
                formatX={formatPerfY}
                tooltipContent={(props) => (
                  <TeamPerformanceTooltip {...props} format={chart.format} />
                )}
              />
              {chart.series.length > 1 ? (
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                  <ChartSeriesLegend
                    items={chart.series.map((s) => ({ label: s.label, color: s.color }))}
                  />
                </Box>
              ) : null}
            </Box>
          )}
        </ChartCard>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Sq.ft Designed by Team Member"
            subtitle="Total sq.ft designed by each team member"
            action={
              <Box sx={{ width: { xs: '100%', sm: 220 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Team Members
                </Typography>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  size="small"
                  options={sqftByMember.memberOptions}
                  value={selectedSqftMembers}
                  onChange={handleSqftMembersChange}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props as {
                      key: string
                    } & HTMLAttributes<HTMLLIElement>
                    return (
                      <li key={key} {...rest}>
                        <Checkbox
                          checked={selected}
                          size="sm"
                          sx={{ mr: 1, pointerEvents: 'none' }}
                        />
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {option.label}
                        </Typography>
                      </li>
                    )
                  }}
                  renderTags={(selected) => (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 12, pl: 0.5, whiteSpace: 'nowrap' }}
                    >
                      {selected.length} selected
                    </Typography>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={
                        selectedSqftMembers.length === 0
                          ? 'Top 10 team members'
                          : undefined
                      }
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select team members',
                      }}
                    />
                  )}
                  slotProps={{
                    listbox: {
                      sx: { maxHeight: 280, overflow: 'auto' },
                    },
                    paper: {
                      sx: {
                        fontSize: 12,
                        '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                      },
                    },
                  }}
                  sx={{
                    ...MEMBER_AUTOCOMPLETE_SX,
                    maxWidth: '100%',
                    '& .MuiOutlinedInput-root': {
                      ...MEMBER_AUTOCOMPLETE_SX['& .MuiOutlinedInput-root'],
                      height: 'auto',
                      minHeight: 32,
                      flexWrap: 'nowrap',
                    },
                  }}
                />
              </Box>
            }
          >
            {projectsLoading && sqftChartData.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
              >
                Loading team sq.ft data…
              </Typography>
            ) : sqftChartData.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
              >
                No sq.ft designed data for team members.
              </Typography>
            ) : (
              <BarChart
                data={sqftChartData}
                xKey="member"
                height={sqftChartHeight}
                orientation="horizontal"
                showLegend={false}
                barSize={22}
                bars={[{ key: 'sqft', label: 'Total Sq.ft Designed', color: CHART_COLORS.amber }]}
                formatX={formatSqft}
              />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Revenue vs Profit"
            subtitle={`Current vs previous year for ${scopeLabel}`}
            action={
              <ChartSeriesLegend
                items={[
                  { label: 'Revenue', color: CHART_COLORS.teal },
                  { label: 'Profit', color: CHART_COLORS.green },
                ]}
              />
            }
          >
            <BarChart
              data={[...analytics.revenueVsProfit]}
              xKey="period"
              height={300}
              showLegend={false}
              bars={[
                { key: 'revenue', label: 'Revenue', color: CHART_COLORS.teal },
                { key: 'profit', label: 'Profit', color: CHART_COLORS.green },
              ]}
              formatY={formatAxisAmount}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

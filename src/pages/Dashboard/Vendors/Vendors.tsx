/**
 * Dashboard — Vendors section
 * Vendor summary KPIs + billing charts + Vendor Project Performance
 */

/**
 * Sample data for Dashboard — Vendors section.
 * Plus Vendor Performance master graph from real vendors / invoices / projects.
 */


import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Autocomplete,
  Box,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Select as MuiSelect,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { CircleDollarSign, FolderKanban } from 'lucide-react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import {
  ChartCard,
  Modal,
} from '@/design-system/components'
import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchVendors } from '@/slices/vendors/thunk'
import type { VendorInvoice } from '@/slices/live/types'
import type { Project } from '@/slices/projects/reducer'
import type { Vendor } from '@/slices/vendors/reducer'

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
export interface VendorKpi {
  id: string
  title: string
  value: string
  subtitle: string
  icon: 'billing' | 'projects'
}

/** Current-year vendor billing — sorted highest → lowest. */
export interface VendorBillingCurrentYearPoint {
  vendor: string
  billing: number
  /** Projects completed together (sample). */
  projectsCompleted: number
  /** Average fee per sq.ft in ₹ (sample). */
  avgFeePerSqFt: number
}

/** Multi-year vendor billing trends (₹). */
export interface VendorBillingAcrossYearsPoint {
  year: string
  buildwell: number
  electrotech: number
  craft: number
  aquaflow: number
  nova: number
  [key: string]: string | number
}

/** Projects completed with each vendor — sorted highest → lowest. */
export interface ProjectsCompletedTogetherPoint {
  vendor: string
  projects: number
}

export const VENDOR_TIME_PERIOD_OPTIONS = [
  'This Financial Year',
  'Last 5 Years',
  'Custom Range',
] as const

export type VendorTimePeriod = (typeof VENDOR_TIME_PERIOD_OPTIONS)[number]

export const VENDOR_FILTER_OPTIONS = [
  { value: 'all', label: 'All Vendors' },
  { value: 'buildwell', label: 'BuildWell' },
  { value: 'electrotech', label: 'ElectroTech' },
  { value: 'craft', label: 'Craft Studio' },
  { value: 'aquaflow', label: 'AquaFlow' },
  { value: 'nova', label: 'Nova Acoustics' },
] as const

export type VendorFilterOption = (typeof VENDOR_FILTER_OPTIONS)[number]
export type VendorFilterId = VendorFilterOption['value']

export const VENDOR_BILLING_YEAR_LINES = [
  { key: 'buildwell', label: 'BuildWell Constructions' },
  { key: 'electrotech', label: 'ElectroTech Solutions' },
  { key: 'craft', label: 'Craft Studio Design' },
  { key: 'aquaflow', label: 'AquaFlow MEP' },
  { key: 'nova', label: 'Nova Acoustics' },
] as const

export type VendorLineKey = (typeof VENDOR_BILLING_YEAR_LINES)[number]['key']

const BASE_BILLING_CURRENT_YEAR: VendorBillingCurrentYearPoint[] = [
  { vendor: 'BuildWell Constructions', billing: 6_200_000, projectsCompleted: 8, avgFeePerSqFt: 185 },
  { vendor: 'ElectroTech Solutions', billing: 4_150_000, projectsCompleted: 6, avgFeePerSqFt: 142 },
  { vendor: 'Craft Studio Design', billing: 3_400_000, projectsCompleted: 5, avgFeePerSqFt: 168 },
  { vendor: 'AquaFlow MEP', billing: 2_850_000, projectsCompleted: 4, avgFeePerSqFt: 96 },
  { vendor: 'Nova Acoustics', billing: 2_000_000, projectsCompleted: 4, avgFeePerSqFt: 118 },
]

const BASE_BILLING_ACROSS_YEARS: VendorBillingAcrossYearsPoint[] = [
  {
    year: '2020',
    buildwell: 2_400_000,
    electrotech: 1_500_000,
    craft: 1_100_000,
    aquaflow: 900_000,
    nova: 700_000,
  },
  {
    year: '2021',
    buildwell: 3_100_000,
    electrotech: 1_900_000,
    craft: 1_450_000,
    aquaflow: 1_200_000,
    nova: 900_000,
  },
  {
    year: '2022',
    buildwell: 3_800_000,
    electrotech: 2_400_000,
    craft: 1_900_000,
    aquaflow: 1_500_000,
    nova: 1_100_000,
  },
  {
    year: '2023',
    buildwell: 4_600_000,
    electrotech: 3_100_000,
    craft: 2_500_000,
    aquaflow: 2_000_000,
    nova: 1_450_000,
  },
  {
    year: '2024',
    buildwell: 5_400_000,
    electrotech: 3_700_000,
    craft: 2_950_000,
    aquaflow: 2_400_000,
    nova: 1_750_000,
  },
  {
    year: '2025',
    buildwell: 6_200_000,
    electrotech: 4_150_000,
    craft: 3_400_000,
    aquaflow: 2_850_000,
    nova: 2_000_000,
  },
  {
    year: '2026',
    buildwell: 3_800_000,
    electrotech: 2_600_000,
    craft: 2_100_000,
    aquaflow: 1_700_000,
    nova: 1_250_000,
  },
]

const BASE_PROJECTS_COMPLETED: ProjectsCompletedTogetherPoint[] = [
  { vendor: 'BuildWell Constructions', projects: 8 },
  { vendor: 'ElectroTech Solutions', projects: 6 },
  { vendor: 'Craft Studio Design', projects: 5 },
  { vendor: 'AquaFlow MEP', projects: 4 },
  { vendor: 'Nova Acoustics', projects: 4 },
]

const VENDOR_FULL_NAME: Record<Exclude<VendorFilterId, 'all'>, string> = {
  buildwell: 'BuildWell Constructions',
  electrotech: 'ElectroTech Solutions',
  craft: 'Craft Studio Design',
  aquaflow: 'AquaFlow MEP',
  nova: 'Nova Acoustics',
}

/** Default snapshot — prefer getVendorAnalytics for filter-driven views. */
export const VENDOR_SUMMARY_KPIS: VendorKpi[] = [
  {
    id: 'billing',
    title: 'Total Vendor Billing (Current Year)',
    value: '₹1.86 Cr',
    subtitle: 'Total vendor billing for the selected financial year.',
    icon: 'billing',
  },
  {
    id: 'projects',
    title: 'Projects Completed Together',
    value: '27',
    subtitle: 'Projects completed in partnership with vendors.',
    icon: 'projects',
  },
]

export const VENDOR_BILLING_CURRENT_YEAR = BASE_BILLING_CURRENT_YEAR
export const VENDOR_BILLING_ACROSS_YEARS = BASE_BILLING_ACROSS_YEARS
export const PROJECTS_COMPLETED_TOGETHER = BASE_PROJECTS_COMPLETED

export interface VendorAnalyticsBundle {
  kpis: VendorKpi[]
  billingCurrentYear: VendorBillingCurrentYearPoint[]
  billingAcrossYears: VendorBillingAcrossYearsPoint[]
  /** Combined yearly totals (all vendors) with per-vendor breakdown for drill-down. */
  totalBillingOverYears: TotalVendorBillingYearPoint[]
  yearLines: Array<{ key: VendorLineKey; label: string }>
  projectsCompleted: ProjectsCompletedTogetherPoint[]
}

/** Per-vendor amount within a year (for the yearly billing drill-down modal). */
export interface VendorYearBillingBreakdownRow {
  vendor: string
  amount: number
}

export interface TotalVendorBillingYearPoint {
  year: string
  total: number
  vendors: VendorYearBillingBreakdownRow[]
}

function buildYearVendorBreakdown(
  row: VendorBillingAcrossYearsPoint,
  factor: number,
  vendorId: VendorFilterId,
): VendorYearBillingBreakdownRow[] {
  const lines =
    vendorId === 'all'
      ? VENDOR_BILLING_YEAR_LINES
      : VENDOR_BILLING_YEAR_LINES.filter((line) => line.key === vendorId)

  return lines
    .map((line) => ({
      vendor: line.label,
      amount: scale(Number(row[line.key] ?? 0), factor),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

function buildTotalBillingOverYears(
  factor: number,
  vendorId: VendorFilterId,
): TotalVendorBillingYearPoint[] {
  return BASE_BILLING_ACROSS_YEARS.map((row) => {
    const vendors = buildYearVendorBreakdown(row, factor, vendorId)
    const total = vendors.reduce((sum, r) => sum + r.amount, 0)
    return {
      year: row.year,
      total,
      vendors,
    }
  })
}

function periodFactor(period: VendorTimePeriod): number {
  switch (period) {
    case 'This Financial Year':
      return 1
    case 'Last 5 Years':
      return 3.4
    case 'Custom Range':
      return 0.55
    default:
      return 1
  }
}

function customRangeFactor(range?: [Date | null, Date | null]): number {
  const [start, end] = range ?? [null, null]
  if (!start || !end) return 0.55
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  return Math.min(1.2, Math.max(0.2, days / 365))
}

function vendorFactor(vendorId: VendorFilterId): number {
  switch (vendorId) {
    case 'all':
      return 1
    case 'buildwell':
      return 0.33
    case 'electrotech':
      return 0.22
    case 'craft':
      return 0.18
    case 'aquaflow':
      return 0.15
    case 'nova':
      return 0.11
    default:
      return 1
  }
}

function scale(n: number, factor: number): number {
  return Math.max(0, Math.round(n * factor))
}

export function formatBillingValue(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)} L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

function billingTitle(period: VendorTimePeriod): string {
  switch (period) {
    case 'This Financial Year':
      return 'Total Vendor Billing (Current Year)'
    case 'Last 5 Years':
      return 'Total Vendor Billing (Last 5 Years)'
    case 'Custom Range':
      return 'Total Vendor Billing (Custom Range)'
    default:
      return 'Total Vendor Billing'
  }
}

function billingSubtitle(period: VendorTimePeriod, vendorId: VendorFilterId): string {
  const scope =
    vendorId === 'all'
      ? 'vendors'
      : VENDOR_FULL_NAME[vendorId]
  switch (period) {
    case 'This Financial Year':
      return `Total vendor billing for ${scope} in the selected financial year.`
    case 'Last 5 Years':
      return `Cumulative vendor billing for ${scope} over the last 5 years.`
    case 'Custom Range':
      return `Vendor billing for ${scope} in the selected custom range.`
    default:
      return 'Total vendor billing for the selected period.'
  }
}

/** Filter-driven sample analytics for the Vendors section. */
export function getVendorAnalytics(
  period: VendorTimePeriod,
  vendorId: VendorFilterId,
  customRange?: [Date | null, Date | null],
): VendorAnalyticsBundle {
  const p =
    period === 'Custom Range' ? customRangeFactor(customRange) : periodFactor(period)
  const v = vendorFactor(vendorId)

  const billingRows = BASE_BILLING_CURRENT_YEAR
    .filter((row) =>
      vendorId === 'all' ? true : row.vendor === VENDOR_FULL_NAME[vendorId],
    )
    .map((row) => ({
      ...row,
      billing: scale(row.billing, p),
      projectsCompleted: Math.max(1, Math.round(row.projectsCompleted * p)),
    }))
    .sort((a, b) => b.billing - a.billing)

  // Always keep the full multi-year series so the Across Years chart can draw continuous lines.
  const billingAcrossYears = BASE_BILLING_ACROSS_YEARS.map((row) => ({
    year: row.year,
    buildwell: scale(row.buildwell, p),
    electrotech: scale(row.electrotech, p),
    craft: scale(row.craft, p),
    aquaflow: scale(row.aquaflow, p),
    nova: scale(row.nova, p),
  }))

  const yearLines =
    vendorId === 'all'
      ? VENDOR_BILLING_YEAR_LINES.map((line) => ({ key: line.key, label: line.label }))
      : VENDOR_BILLING_YEAR_LINES
          .filter((line) => line.key === vendorId)
          .map((line) => ({ key: line.key, label: line.label }))

  const projectsCompleted = BASE_PROJECTS_COMPLETED
    .filter((row) =>
      vendorId === 'all' ? true : row.vendor === VENDOR_FULL_NAME[vendorId],
    )
    .map((row) => ({
      ...row,
      projects: Math.max(1, Math.round(row.projects * p)),
    }))
    .sort((a, b) => b.projects - a.projects)

  const totalBilling =
    vendorId === 'all'
      ? billingRows.reduce((sum, row) => sum + row.billing, 0)
      : billingRows[0]?.billing ?? scale(BASE_BILLING_CURRENT_YEAR[0].billing, p * v)

  const totalProjects = projectsCompleted.reduce((sum, row) => sum + row.projects, 0)

  return {
    kpis: [
      {
        id: 'billing',
        title: billingTitle(period),
        value: formatBillingValue(totalBilling),
        subtitle: billingSubtitle(period, vendorId),
        icon: 'billing',
      },
      {
        id: 'projects',
        title: 'Projects Completed Together',
        value: String(totalProjects),
        subtitle:
          vendorId === 'all'
            ? 'Projects completed in partnership with vendors.'
            : `Projects completed with ${VENDOR_FULL_NAME[vendorId]}.`,
        icon: 'projects',
      },
    ],
    billingCurrentYear: billingRows,
    billingAcrossYears,
    totalBillingOverYears: buildTotalBillingOverYears(p, vendorId),
    yearLines,
    projectsCompleted,
  }
}

/* -------------------------------------------------------------------------- */
/* Vendor Performance master graph (real vendors / invoices / projects)       */
/* -------------------------------------------------------------------------- */

export const VENDOR_PERFORMANCE_METRIC_OPTIONS = [
  'No. of Projects',
] as const

export type VendorPerformanceMetric = (typeof VENDOR_PERFORMANCE_METRIC_OPTIONS)[number]

export const TOP5_VENDOR_OPTION_VALUE = 'top5'

export interface VendorPerformanceOption {
  value: string
  label: string
}

export interface VendorPerformanceSeriesConfig {
  key: string
  label: string
  color: string
}

export interface VendorPerformanceChartConfig {
  title: string
  subtitle: string
  kind: 'horizontal-bar' | 'years-line'
  /** Category key for bar charts (vendor | project). */
  xKey: string
  yAxisLabel: string
  xAxisLabel: string
  format: 'count' | 'currency' | 'days'
  series: VendorPerformanceSeriesConfig[]
  data: Array<Record<string, string | number>>
  /** Project names / extras for tooltips (keyed by row id). */
  tooltipDetails?: Record<string, { projects?: string[]; extra?: string }>
}

export interface VendorPerformanceBundle {
  vendorOptions: VendorPerformanceOption[]
  chart: VendorPerformanceChartConfig
}

interface DateBounds {
  start: Date
  end: Date
}

interface VendorProjectLink {
  projectId: string
  projectName: string
  billing: number
  durationDays: number | null
}

interface VendorAccumulator {
  vendorId: string
  vendorName: string
  projects: Map<string, VendorProjectLink>
  billingInPeriod: number
  billingByYear: Map<string, number>
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

/** Indian FY (Apr–Mar) for "This Financial Year"; calendar span for Last 5 Years. */
function getVendorPeriodBounds(
  period: VendorTimePeriod,
  customRange?: [Date | null, Date | null],
  now = new Date(),
): DateBounds {
  if (period === 'Custom Range') {
    const [start, end] = customRange ?? [null, null]
    if (start && end) {
      return { start: startOfDay(start), end: endOfDay(end) }
    }
  }
  if (period === 'Last 5 Years') {
    return {
      start: startOfDay(new Date(now.getFullYear() - 4, 0, 1)),
      end: endOfDay(now),
    }
  }
  // This Financial Year (Apr 1 → today)
  const year = now.getFullYear()
  const fyStartYear = now.getMonth() >= 3 ? year : year - 1
  return {
    start: startOfDay(new Date(fyStartYear, 3, 1)),
    end: endOfDay(now),
  }
}

function inBounds(iso: string | null | undefined, bounds: DateBounds): boolean {
  const d = parseDate(iso)
  if (!d) return false
  return d >= bounds.start && d <= bounds.end
}

function projectDurationForVendor(project: Project | undefined, now = new Date()): number | null {
  if (!project) return null
  const planned = projectDurationDays(project)
  if (planned != null) return planned
  if (!project.startDate) return null
  const start = parseDate(project.startDate)
  if (!start) return null
  const diff = Math.round((endOfDay(now).getTime() - startOfDay(start).getTime()) / 86_400_000)
  return diff >= 0 ? diff : null
}

function ensureVendorAcc(
  map: Map<string, VendorAccumulator>,
  vendorId: string,
  vendorName: string,
): VendorAccumulator {
  let acc = map.get(vendorId)
  if (!acc) {
    acc = {
      vendorId,
      vendorName,
      projects: new Map(),
      billingInPeriod: 0,
      billingByYear: new Map(),
    }
    map.set(vendorId, acc)
  } else if (vendorName && (!acc.vendorName || acc.vendorName === 'Unknown')) {
    acc.vendorName = vendorName
  }
  return acc
}

function linkProject(
  acc: VendorAccumulator,
  projectId: string,
  projectName: string,
  billingAdd: number,
  durationDays: number | null,
): void {
  const existing = acc.projects.get(projectId)
  if (existing) {
    existing.billing += billingAdd
    if (existing.durationDays == null && durationDays != null) {
      existing.durationDays = durationDays
    }
    if (projectName && existing.projectName === projectId) {
      existing.projectName = projectName
    }
    return
  }
  acc.projects.set(projectId, {
    projectId,
    projectName: projectName || projectId,
    billing: billingAdd,
    durationDays,
  })
}

function buildVendorAccumulators(
  vendors: Vendor[],
  projects: Project[],
  vendorInvoices: VendorInvoice[],
  periodBounds: DateBounds,
): Map<string, VendorAccumulator> {
  const projectById = new Map(projects.map((p) => [p.id, p]))
  const map = new Map<string, VendorAccumulator>()
  const idByNormalizedName = new Map<string, string>()

  for (const vendor of vendors) {
    if (vendor.profileStatus === 'pending') continue
    ensureVendorAcc(map, vendor.id, vendor.name)
    const key = normalizeVendorKey(vendor.name)
    if (key) idByNormalizedName.set(key, vendor.id)
  }

  for (const inv of vendorInvoices) {
    const rawVendorId = (inv.vendorId || '').trim()
    const vendorName = (inv.vendorName || '').trim() || 'Unknown'
    if (!rawVendorId && !vendorName) continue

    const nameKey = normalizeVendorKey(vendorName)
    const resolvedId =
      (rawVendorId && map.has(rawVendorId) ? rawVendorId : undefined) ??
      (nameKey ? idByNormalizedName.get(nameKey) : undefined) ??
      rawVendorId ??
      `name:${nameKey}`

    if (!resolvedId) continue

    const acc = ensureVendorAcc(map, resolvedId, vendorName)
    if (nameKey && !idByNormalizedName.has(nameKey)) {
      idByNormalizedName.set(nameKey, resolvedId)
    }

    const amount = inv.baseAmount ?? 0
    const project = projectById.get(inv.projectId)
    const projectName =
      inv.projectName?.trim() || project?.name?.trim() || inv.projectId
    const duration = projectDurationForVendor(project)

    linkProject(acc, inv.projectId, projectName, amount > 0 ? amount : 0, duration)

    const invoiceDate = inv.invoiceDate
    if (amount > 0 && invoiceDate) {
      const d = parseDate(invoiceDate)
      if (d) {
        const yearKey = String(d.getFullYear())
        acc.billingByYear.set(yearKey, (acc.billingByYear.get(yearKey) ?? 0) + amount)
      }
      if (inBounds(invoiceDate, periodBounds)) {
        acc.billingInPeriod += amount
      }
    }
  }

  // Seed project counts from vendor financial details when invoices have no project links
  for (const vendor of vendors) {
    if (vendor.profileStatus === 'pending') continue
    const acc = map.get(vendor.id)
    if (!acc) continue
    if (realProjects(acc).length > 0) continue
    if (acc.projects.size > 0) continue
    const fd = vendor.financialDetails
    const count =
      fd != null
        ? fd.activeProjects + fd.completedProjects
        : vendor.activeProjects
    if (count <= 0) continue
    // Placeholder project slots so "No. of Projects" reflects vendor record without inventing names
    for (let i = 0; i < count; i++) {
      const pid = `${vendor.id}__meta_${i}`
      linkProject(acc, pid, `Project ${i + 1}`, 0, null)
    }
    if (acc.billingInPeriod <= 0) {
      const paid = fd?.amountPaid ?? 0
      const contract = fd?.totalContractValue ?? 0
      const payables = vendor.totalPayables ?? 0
      acc.billingInPeriod = paid > 0 ? paid : contract > 0 ? contract : payables
    }
  }

  return map
}

function rankVendorsByBilling(accs: VendorAccumulator[]): VendorAccumulator[] {
  return [...accs].sort(
    (a, b) =>
      b.billingInPeriod - a.billingInPeriod ||
      b.projects.size - a.projects.size ||
      a.vendorName.localeCompare(b.vendorName),
  )
}

function normalizeVendorKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function realProjects(acc: VendorAccumulator): VendorProjectLink[] {
  return [...acc.projects.values()].filter((p) => !p.projectId.includes('__meta_'))
}

function vendorProjectCount(acc: VendorAccumulator): number {
  const named = realProjects(acc)
  return named.length > 0 ? named.length : acc.projects.size
}

function buildVendorOptions(ranked: VendorAccumulator[]): VendorPerformanceOption[] {
  const options = ranked.map((v) => ({ value: v.vendorId, label: v.vendorName }))
  return [{ value: TOP5_VENDOR_OPTION_VALUE, label: 'All Vendors' }, ...options]
}

function findVendorAcc(
  ranked: VendorAccumulator[],
  performanceVendorId: string,
): VendorAccumulator | undefined {
  const byId = ranked.find((v) => v.vendorId === performanceVendorId)
  if (byId) return byId
  const needle = normalizeVendorKey(performanceVendorId)
  return ranked.find(
    (v) =>
      normalizeVendorKey(v.vendorId) === needle ||
      normalizeVendorKey(v.vendorName) === needle,
  )
}

function scopeVendors(
  ranked: VendorAccumulator[],
  performanceVendorId: string,
): VendorAccumulator[] {
  if (performanceVendorId === TOP5_VENDOR_OPTION_VALUE) {
    return ranked.slice(0, 5)
  }
  const match = findVendorAcc(ranked, performanceVendorId)
  return match ? [match] : []
}

function projectNames(acc: VendorAccumulator): string[] {
  return realProjects(acc)
    .map((p) => p.projectName)
    .filter((name) => !/^Project \d+$/.test(name))
    .sort((a, b) => a.localeCompare(b))
}

function buildHorizontalChart(
  metric: VendorPerformanceMetric,
  scoped: VendorAccumulator[],
  performanceVendorId: string,
): VendorPerformanceChartConfig {
  const tooltipDetails: Record<string, { projects?: string[]; extra?: string }> = {}

  // No. of Projects — single vendor: project-wise bars when named projects exist
  if (metric === 'No. of Projects' && performanceVendorId !== TOP5_VENDOR_OPTION_VALUE && scoped[0]) {
    const vendor = scoped[0]
    const rows = realProjects(vendor)
      .sort((a, b) => b.billing - a.billing || a.projectName.localeCompare(b.projectName))
      .map((p) => {
        tooltipDetails[p.projectId] = {
          projects: [p.projectName],
          extra:
            p.durationDays != null
              ? `Duration: ${p.durationDays} days`
              : undefined,
        }
        return {
          project: p.projectName,
          projectId: p.projectId,
          value: p.billing > 0 ? p.billing : 1,
        }
      })

    if (rows.length > 0) {
      const hasBilling = rows.some((r) => typeof r.value === 'number' && r.value > 1)
      return {
        title: 'Vendor Performance',
        subtitle: `Projects associated with ${vendor.vendorName}`,
        kind: 'horizontal-bar',
        xKey: 'project',
        yAxisLabel: 'Projects',
        xAxisLabel: hasBilling ? 'Billing for Projects (₹)' : 'Projects',
        format: hasBilling ? 'currency' : 'count',
        series: [
          {
            key: 'value',
            label: hasBilling ? 'Billing' : 'Associated',
            color: CHART_COLORS.blue,
          },
        ],
        data: rows,
        tooltipDetails,
      }
    }
    // Fall through to vendor-level bar when only placeholder / count data exists
  }

  // Vendor-wise bars (Top 5 / All, or single vendor aggregate metrics)
  const data = scoped.map((v) => {
    const names = projectNames(v)
    let value = 0
    let extra: string | undefined

    switch (metric) {
      case 'No. of Projects':
        value = vendorProjectCount(v)
        extra = names.length > 0 ? undefined : 'No named projects linked'
        break
      default:
        value = vendorProjectCount(v)
    }

    tooltipDetails[v.vendorId] = { projects: names, extra }

    return {
      vendor: v.vendorName,
      vendorId: v.vendorId,
      value,
    }
  })

  const meta = (() => {
    switch (metric) {
      case 'No. of Projects':
        return {
          subtitle: 'Number of projects per vendor',
          xAxisLabel: 'Number of Projects',
          color: CHART_COLORS.blue,
        }
      default:
        return {
          subtitle: 'Number of projects per vendor',
          xAxisLabel: 'Number of Projects',
          color: CHART_COLORS.blue,
        }
    }
  })()

  const format: 'count' | 'currency' | 'days' = 'count'

  return {
    title: 'Vendor Performance',
    subtitle: meta.subtitle,
    kind: 'horizontal-bar',
    xKey: 'vendor',
    yAxisLabel: performanceVendorId === TOP5_VENDOR_OPTION_VALUE ? 'All Vendors' : 'Vendors',
    xAxisLabel: meta.xAxisLabel,
    format,
    series: [{ key: 'value', label: meta.xAxisLabel, color: meta.color }],
    data: data.sort((a, b) => Number(b.value) - Number(a.value)),
    tooltipDetails,
  }
}

/** Master Vendor Performance chart from real vendor / invoice / project data. */
export function getVendorPerformanceAnalytics(
  vendors: Vendor[],
  projects: Project[],
  vendorInvoices: VendorInvoice[],
  timePeriod: VendorTimePeriod,
  performanceVendorId: string,
  metric: VendorPerformanceMetric,
  customRange?: [Date | null, Date | null],
): VendorPerformanceBundle {
  const periodBounds = getVendorPeriodBounds(timePeriod, customRange)
  const accMap = buildVendorAccumulators(vendors, projects, vendorInvoices, periodBounds)
  const ranked = rankVendorsByBilling([...accMap.values()].filter((v) => Boolean(v.vendorName?.trim())))
  const vendorOptions = buildVendorOptions(ranked)

  const resolvedId = vendorOptions.some((o) => o.value === performanceVendorId)
    ? performanceVendorId
    : findVendorAcc(ranked, performanceVendorId)?.vendorId ?? TOP5_VENDOR_OPTION_VALUE

  const scoped = scopeVendors(ranked, resolvedId)

  return {
    vendorOptions,
    chart: buildHorizontalChart(metric, scoped, resolvedId),
  }
}

/* -------------------------------------------------------------------------- */
/* Vendor Project Performance (Live / Completed counts + project value)       */
/* -------------------------------------------------------------------------- */

export const VENDOR_PROJECT_PERFORMANCE_METRIC_OPTIONS = [
  'No. of Projects',
  'Projects Completed by Vendors',
  'Total Billing for the Year',
] as const

export type VendorProjectPerformanceMetric =
  (typeof VENDOR_PROJECT_PERFORMANCE_METRIC_OPTIONS)[number]

export interface VendorProjectPerformanceOption {
  value: string
  label: string
}

export interface VendorProjectPerformanceRow {
  vendorId: string
  vendor: string
  projectCount: number
  totalValue: number
  /** Vendor billing in the selected financial year (invoice base amounts). */
  totalBilling: number
}

export interface VendorProjectPerformanceBundle {
  vendorOptions: VendorProjectPerformanceOption[]
  rows: VendorProjectPerformanceRow[]
}

function projectValueOf(project: Project | undefined): number {
  if (!project) return 0
  const value = project.projectValue ?? project.totalClientPOValue ?? 0
  return value > 0 ? value : 0
}

/**
 * Live vs Completed project counts and total project value per vendor,
 * or total vendor billing for the current financial year.
 * Links vendors → projects via invoices; falls back to vendor financial meta.
 */
export function getVendorProjectPerformanceAnalytics(
  vendors: Vendor[],
  projects: Project[],
  vendorInvoices: VendorInvoice[],
  metric: VendorProjectPerformanceMetric,
  selectedVendorIds: string[],
): VendorProjectPerformanceBundle {
  const idByNormalizedName = new Map<string, string>()
  const vendorById = new Map<string, Vendor>()
  for (const vendor of vendors) {
    if (vendor.profileStatus === 'pending') continue
    vendorById.set(vendor.id, vendor)
    const key = normalizeVendorKey(vendor.name)
    if (key) idByNormalizedName.set(key, vendor.id)
  }

  const vendorOptions: VendorProjectPerformanceOption[] = [...vendorById.values()]
    .map((v) => ({ value: v.id, label: v.name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const selectedSet = new Set(selectedVendorIds)
  const scopedVendors =
    selectedSet.size === 0
      ? [...vendorById.values()]
      : [...vendorById.values()].filter((v) => selectedSet.has(v.id))

  if (metric === 'Total Billing for the Year') {
    const periodBounds = getVendorPeriodBounds('This Financial Year')
    const accMap = buildVendorAccumulators(vendors, projects, vendorInvoices, periodBounds)

    const rows: VendorProjectPerformanceRow[] = scopedVendors
      .map((vendor) => {
        const acc = accMap.get(vendor.id)
        const totalBilling = Math.round(acc?.billingInPeriod ?? 0)
        return {
          vendorId: vendor.id,
          vendor: vendor.name,
          projectCount: 0,
          totalValue: 0,
          totalBilling,
        }
      })
      .filter((row) => (selectedSet.size > 0 ? true : row.totalBilling > 0))
      .sort(
        (a, b) =>
          b.totalBilling - a.totalBilling || a.vendor.localeCompare(b.vendor),
      )

    return { vendorOptions, rows }
  }

  const projectById = new Map(projects.map((p) => [p.id, p]))
  const targetStatus = metric === 'No. of Projects' ? 'Live' : 'Completed'

  /** vendorId → projectId → project */
  const linked = new Map<string, Map<string, Project>>()

  const ensureLink = (vendorId: string, project: Project) => {
    let byProject = linked.get(vendorId)
    if (!byProject) {
      byProject = new Map()
      linked.set(vendorId, byProject)
    }
    byProject.set(project.id, project)
  }

  for (const inv of vendorInvoices) {
    const rawVendorId = (inv.vendorId || '').trim()
    const vendorName = (inv.vendorName || '').trim()
    const nameKey = normalizeVendorKey(vendorName)
    const resolvedId =
      (rawVendorId && vendorById.has(rawVendorId) ? rawVendorId : undefined) ??
      (nameKey ? idByNormalizedName.get(nameKey) : undefined) ??
      rawVendorId
    if (!resolvedId || !vendorById.has(resolvedId)) continue

    const project = projectById.get(inv.projectId)
    if (!project) continue
    ensureLink(resolvedId, project)
  }

  // Also link via buildVendors name fields when present
  for (const project of projects) {
    const bv = project.buildVendors
    if (!bv) continue
    const names = [
      bv.civilInterior,
      bv.electrical,
      bv.fireFighting,
      bv.av,
    ].filter((n): n is string => Boolean(n?.trim()))
    for (const name of names) {
      const id = idByNormalizedName.get(normalizeVendorKey(name))
      if (id) ensureLink(id, project)
    }
  }

  const rows: VendorProjectPerformanceRow[] = []

  for (const vendor of scopedVendors) {
    const projectsForVendor = linked.get(vendor.id)
    let projectCount = 0
    let totalValue = 0

    if (projectsForVendor && projectsForVendor.size > 0) {
      for (const project of projectsForVendor.values()) {
        if (project.status !== targetStatus) continue
        projectCount += 1
        totalValue += projectValueOf(project)
      }
    } else {
      // Fallback when no invoice / build-vendor links exist
      const fd = vendor.financialDetails
      if (metric === 'No. of Projects') {
        projectCount = fd?.activeProjects ?? vendor.activeProjects ?? 0
      } else {
        projectCount = fd?.completedProjects ?? 0
      }
      if (projectCount > 0) {
        const contract = fd?.totalContractValue ?? 0
        totalValue = contract > 0 ? contract : 0
      }
    }

    if (projectCount <= 0) continue

    rows.push({
      vendorId: vendor.id,
      vendor: vendor.name,
      projectCount,
      totalValue: Math.round(totalValue),
      totalBilling: 0,
    })
  }

  rows.sort(
    (a, b) =>
      b.projectCount - a.projectCount ||
      b.totalValue - a.totalValue ||
      a.vendor.localeCompare(b.vendor),
  )

  return { vendorOptions, rows }
}

const ICON_MAP: Record<VendorKpi['icon'], { node: ReactNode; color: string }> = {
  billing: {
    node: <CircleDollarSign size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  projects: {
    node: <FolderKanban size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
}

const METRIC_SELECT_SX = { minWidth: 240, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const

/** Match Metric Select theme fill (action.hover, no outline) — do not override bgcolor/border. */
const PERF_VENDOR_MULTI_SX = {
  minWidth: { xs: '100%', sm: 260 },
  maxWidth: { xs: '100%', sm: 360 },
  '& .MuiOutlinedInput-root': {
    minHeight: 32,
    height: 'auto',
    py: 0.25,
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

async function fetchJsonArray(url: string): Promise<unknown[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (Array.isArray(data)) return data
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as { items?: unknown[] }).items)
    ) {
      return (data as { items: unknown[] }).items
    }
    return []
  } catch {
    return []
  }
}

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function ChartTooltipShell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${tokens.color.neutral[200]}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        px: 1.5,
        py: 1,
        minWidth: 160,
        maxWidth: 260,
      }}
    >
      {children}
    </Box>
  )
}

function TooltipTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
      {children}
    </Typography>
  )
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
    >
      {label}: {value}
    </Typography>
  )
}

function formatExactBillingAmount(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

function VendorProjectPerformanceTooltip({
  active,
  payload,
  metric,
}: TooltipContentProps & { metric: VendorProjectPerformanceMetric }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as VendorProjectPerformanceRow | undefined
  if (!point) return null

  if (metric === 'Total Billing for the Year') {
    return (
      <ChartTooltipShell>
        <TooltipTitle>{point.vendor}</TooltipTitle>
        <TooltipRow
          label="Total Billing for the Year"
          value={formatExactBillingAmount(point.totalBilling)}
        />
      </ChartTooltipShell>
    )
  }

  const countLabel =
    point.projectCount === 1 ? '1 Project' : `${point.projectCount} Projects`
  return (
    <ChartTooltipShell>
      <TooltipTitle>{point.vendor}</TooltipTitle>
      <TooltipRow
        label={metric === 'No. of Projects' ? 'Live Projects' : 'Completed Projects'}
        value={countLabel}
      />
      <TooltipRow label="Total Project Value" value={formatBillingValue(point.totalValue)} />
    </ChartTooltipShell>
  )
}

function VendorProjectPerformanceChart({
  data,
  metric,
  height = 300,
}: {
  data: VendorProjectPerformanceRow[]
  metric: VendorProjectPerformanceMetric
  height?: number
}) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.85) : height
  const isBilling = metric === 'Total Billing for the Year'
  const barFill =
    metric === 'No. of Projects'
      ? CHART_COLORS.teal
      : metric === 'Projects Completed by Vendors'
        ? CHART_COLORS.blue
        : CHART_COLORS.amber

  return (
    <Box sx={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={h}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          barCategoryGap="28%"
          margin={{
            top: 8,
            right: ct.isMobile ? 16 : 24,
            left: 0,
            bottom: 8,
          }}
        >
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
            horizontal={false}
            vertical
          />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[0, 'dataMax']}
            padding={{ left: 0, right: 8 }}
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            tickFormatter={isBilling ? (v) => formatBillingValue(Number(v)) : undefined}
          />
          <YAxis
            type="category"
            dataKey="vendor"
            tick={{ ...ct.axisStyle, textAnchor: 'end' }}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            width={ct.isMobile ? 78 : 100}
            tickMargin={2}
            interval={0}
          />
          <Tooltip
            isAnimationActive={false}
            animationDuration={0}
            content={(props) => (
              <VendorProjectPerformanceTooltip {...props} metric={metric} />
            )}
            cursor={{
              fill: ct.theme.palette.action.hover,
              stroke: 'none',
              fillOpacity: 0.45,
            }}
          />
          <Bar
            dataKey={isBilling ? 'totalBilling' : 'projectCount'}
            name={isBilling ? 'Total Billing' : 'Projects'}
            fill={barFill}
            radius={[0, 6, 6, 0]}
            maxBarSize={22}
            isAnimationActive={false}
            activeBar={false}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  )
}

function TotalVendorBillingYearTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as TotalVendorBillingYearPoint | undefined
  if (!point) return null
  return (
    <ChartTooltipShell>
      <TooltipTitle>{point.year}</TooltipTitle>
      <TooltipRow label="Total Vendor Billing" value={formatBillingValue(point.total)} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 10, display: 'block', mt: 0.5, fontStyle: 'italic' }}
      >
        Click bar for vendor breakdown
      </Typography>
    </ChartTooltipShell>
  )
}

function TotalVendorBillingOverYearsChart({
  data,
  selectedYear,
  onYearClick,
  height = 320,
}: {
  data: TotalVendorBillingYearPoint[]
  selectedYear: string | null
  onYearClick: (year: string) => void
  height?: number
}) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.85) : height

  return (
    <Box sx={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={h}>
        <RechartsBarChart
          data={data}
          margin={{ top: 28, right: 12, left: 8, bottom: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
          />
          <YAxis
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            width={ct.isMobile ? 52 : 64}
            tickFormatter={(v) => formatAxisAmount(v)}
          />
          <Tooltip
            isAnimationActive={false}
            animationDuration={0}
            content={TotalVendorBillingYearTooltip}
            cursor={{ fill: ct.theme.palette.action.hover, fillOpacity: 0.35 }}
          />
          <Bar
            dataKey="total"
            name="Total Vendor Billing"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
            cursor="pointer"
            onClick={(entry) => {
              const payload = (entry as { payload?: TotalVendorBillingYearPoint }).payload
              const year = payload?.year
              if (year) onYearClick(year)
            }}
          >
            {data.map((row) => (
              <Cell
                key={row.year}
                fill={
                  selectedYear === row.year
                    ? CHART_COLORS.blue
                    : CHART_COLORS.teal
                }
                fillOpacity={selectedYear == null || selectedYear === row.year ? 1 : 0.45}
                stroke={selectedYear === row.year ? CHART_COLORS.blue : 'none'}
                strokeWidth={selectedYear === row.year ? 2 : 0}
              />
            ))}
            <LabelList
              dataKey="total"
              position="top"
              formatter={(value) => formatBillingValue(Number(value))}
              style={{
                fill: tokens.color.neutral[700],
                fontSize: 11,
                fontWeight: 600,
                fontFamily: ct.fontFamily,
              }}
            />
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  )
}

function VendorBillingYearModal({
  open,
  yearPoint,
  onClose,
}: {
  open: boolean
  yearPoint: TotalVendorBillingYearPoint | null
  onClose: () => void
}) {
  const rows = useMemo(
    () =>
      yearPoint
        ? [...yearPoint.vendors].sort((a, b) => b.amount - a.amount || a.vendor.localeCompare(b.vendor))
        : [],
    [yearPoint],
  )

  const vendorCount = rows.length
  const modalSize = vendorCount > 30 ? 'xl' : vendorCount > 18 ? 'lg' : vendorCount > 8 ? 'md' : 'sm'
  /** Only the vendor list scrolls; compact when few rows. */
  const listMaxHeight =
    vendorCount <= 8
      ? undefined
      : vendorCount <= 18
        ? 'min(36vh, 280px)'
        : vendorCount <= 30
          ? 'min(48vh, 400px)'
          : 'min(56vh, 520px)'

  if (!yearPoint) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Vendor Billing – ${yearPoint.year}`}
      size={modalSize}
      sx={{
        maxHeight: 'min(100vh - 64px, 90vh)',
        width: {
          xs: undefined,
          sm: modalSize === 'sm' ? 500 : modalSize === 'md' ? 600 : modalSize === 'lg' ? 800 : 1000,
        },
      }}
      footer={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
            Total Vendor Billing ({yearPoint.year})
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: 14 }}>
            {formatBillingValue(yearPoint.total)}
          </Typography>
        </Box>
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1.5 }}>
        Year: {yearPoint.year}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          columnGap: 3,
          pb: 1,
          mb: 0.5,
          borderBottom: `1px solid ${tokens.color.neutral[200]}`,
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' }}
        >
          Vendor
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            textAlign: 'right',
          }}
        >
          Amount Paid
        </Typography>
      </Box>

      <Box
        sx={{
          maxHeight: listMaxHeight,
          overflowY: listMaxHeight ? 'auto' : 'visible',
          pr: listMaxHeight ? 0.5 : 0,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            columnGap: 3,
            rowGap: 1,
            py: 1,
          }}
        >
          {rows.map((row) => (
            <Box key={row.vendor} sx={{ display: 'contents' }}>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>
                {row.vendor}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}
              >
                {formatBillingValue(row.amount)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Modal>
  )
}

function VendorKpiCard({ kpi }: { kpi: VendorKpi }) {
  const theme = useTheme()
  const iconMeta = ICON_MAP[kpi.icon]

  return (
    <Paper
      elevation={0}
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
          sx={{ fontSize: 11, letterSpacing: 0.3, lineHeight: 1.35, pr: 0.5 }}
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
        sx={{ fontSize: { xs: 18, md: 20 }, lineHeight: 1.2, letterSpacing: -0.3 }}
      >
        {kpi.value}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mt: 'auto' }}>
        {kpi.subtitle}
      </Typography>
    </Paper>
  )
}

export function VendorsTab() {
  const dispatch = useAppDispatch()
  const vendors = useAppSelector((s) => s.vendors.items ?? [])
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const vendorsLoading = useAppSelector((s) => s.vendors.loading)
  const projectsLoading = useAppSelector((s) => s.projects.loading)

  const [projectPerfMetric, setProjectPerfMetric] =
    useState<VendorProjectPerformanceMetric>('No. of Projects')
  const [projectPerfVendorIds, setProjectPerfVendorIds] = useState<string[]>([])
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedBillingYear, setSelectedBillingYear] = useState<string | null>(null)

  const analytics = useMemo(
    () => getVendorAnalytics('This Financial Year', 'all', [null, null]),
    [],
  )

  const projectPerformance = useMemo(
    () =>
      getVendorProjectPerformanceAnalytics(
        vendors,
        projects,
        vendorInvoices,
        projectPerfMetric,
        projectPerfVendorIds,
      ),
    [vendors, projects, vendorInvoices, projectPerfMetric, projectPerfVendorIds],
  )

  const selectedProjectPerfVendors = useMemo(() => {
    if (projectPerfVendorIds.length === 0) return []
    const byId = new Map(
      projectPerformance.vendorOptions.map((o) => [o.value, o] as const),
    )
    return projectPerfVendorIds
      .map((id) => byId.get(id))
      .filter((o): o is VendorProjectPerformanceOption => Boolean(o))
  }, [projectPerformance.vendorOptions, projectPerfVendorIds])

  const selectedYearPoint = useMemo(
    () =>
      analytics.totalBillingOverYears.find((row) => row.year === selectedBillingYear) ?? null,
    [analytics.totalBillingOverYears, selectedBillingYear],
  )

  const projectPerfLoading = vendorsLoading || projectsLoading || invoicesLoading
  const projectPerfRows = projectPerformance.rows
  const projectPerfHeight = Math.max(
    280,
    Math.min(520, Math.max(projectPerfRows.length, 1) * 44 + 80),
  )

  useEffect(() => {
    void dispatch(fetchVendors({ page: 1, pageSize: 500 }))
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
  }, [dispatch])

  useEffect(() => {
    const valid = new Set(projectPerformance.vendorOptions.map((o) => o.value))
    setProjectPerfVendorIds((prev) => {
      const next = prev.filter((id) => valid.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [projectPerformance.vendorOptions])

  useEffect(() => {
    if (projects.length === 0) {
      setVendorInvoices([])
      return
    }
    let cancelled = false
    setInvoicesLoading(true)
    void (async () => {
      const results = await Promise.all(
        projects.map(async (p) => {
          const rows = await fetchJsonArray(`/api/projects/${p.id}/vendor-invoices`)
          return rows as VendorInvoice[]
        }),
      )
      if (cancelled) return
      const merged: VendorInvoice[] = []
      for (const rows of results) {
        if (Array.isArray(rows)) merged.push(...rows)
      }
      setVendorInvoices(merged)
      setInvoicesLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projects])

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Vendors
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Vendor billing and completed-project partnership overview.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {analytics.kpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6 }}>
            <VendorKpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2 }}>
        <ChartCard
          title="Vendor Project Performance"
          subtitle="Compare live and completed projects and their total project value by vendor."
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
              <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Vendor
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  options={projectPerformance.vendorOptions}
                  value={selectedProjectPerfVendors}
                  onChange={(_, options) => {
                    setProjectPerfVendorIds(options.map((o) => o.value))
                  }}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterSelectedOptions
                  limitTags={2}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index })
                      return (
                        <Chip
                          key={key}
                          size="small"
                          label={option.label}
                          {...tagProps}
                          sx={{ height: 22, fontSize: 11 }}
                        />
                      )
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={
                        selectedProjectPerfVendors.length === 0
                          ? 'All Vendors'
                          : 'Search vendors...'
                      }
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select vendors',
                      }}
                    />
                  )}
                  slotProps={{
                    paper: {
                      sx: {
                        fontSize: 12,
                        '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                      },
                    },
                  }}
                  sx={PERF_VENDOR_MULTI_SX}
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
                  value={projectPerfMetric}
                  onChange={(e) =>
                    setProjectPerfMetric(e.target.value as VendorProjectPerformanceMetric)
                  }
                  sx={METRIC_SELECT_SX}
                >
                  {VENDOR_PROJECT_PERFORMANCE_METRIC_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                      {opt}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>
            </Box>
          }
        >
          {projectPerfLoading && projectPerfRows.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              Loading vendor project performance…
            </Typography>
          ) : projectPerfRows.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              {projectPerfMetric === 'Total Billing for the Year'
                ? 'No vendor billing for the selected financial year.'
                : 'No vendor project data for the selected filters.'}
            </Typography>
          ) : (
            <VendorProjectPerformanceChart
              data={projectPerfRows}
              metric={projectPerfMetric}
              height={projectPerfHeight}
            />
          )}
        </ChartCard>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Total Vendor Billing – Over the Years"
            subtitle="Total amount paid to all vendors each year. Click a bar for vendor breakdown."
          >
            <TotalVendorBillingOverYearsChart
              data={analytics.totalBillingOverYears}
              selectedYear={selectedBillingYear}
              onYearClick={(year) => setSelectedBillingYear(year)}
              height={320}
            />
          </ChartCard>
        </Grid>
      </Grid>

      <VendorBillingYearModal
        open={selectedBillingYear != null && selectedYearPoint != null}
        yearPoint={selectedYearPoint}
        onClose={() => setSelectedBillingYear(null)}
      />
    </Box>
  )
}

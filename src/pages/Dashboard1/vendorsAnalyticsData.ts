/**
 * Sample data for Dashboard 1 — Vendors section.
 * Plus Vendor Performance master graph from real vendors / invoices / projects.
 */

import type { Project } from '@/slices/projects/reducer'
import type { Vendor } from '@/slices/vendors/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import { projectDurationDays } from '@/pages/Dashboard/dashboardMappings'
import { CHART_COLORS } from '@/design-system/tokens'
import type { MetaKpi, ProjectHighlight } from './largerMetaData'
import { LARGER_META_KPIS, PROJECT_HIGHLIGHTS } from './largerMetaData'

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
  yearLines: Array<{ key: VendorLineKey; label: string }>
  projectsCompleted: ProjectsCompletedTogetherPoint[]
  largerMetaKpis: MetaKpi[]
  projectHighlights: ProjectHighlight[]
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

function formatBillingValue(amount: number): string {
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

function scaleLargerMeta(
  factor: number,
  vendorId: VendorFilterId,
): { kpis: MetaKpi[]; highlights: ProjectHighlight[] } {
  const kpis: MetaKpi[] = LARGER_META_KPIS.map((kpi) => {
    if (kpi.id === 'projects') {
      const n = Math.max(1, Math.round(142 * factor))
      return {
        ...kpi,
        value: String(n),
        subtitle:
          vendorId === 'all'
            ? 'Completed projects for the selected period.'
            : `Completed projects with ${VENDOR_FULL_NAME[vendorId]}.`,
      }
    }
    if (kpi.id === 'area') {
      const lakh = Math.max(0.1, Math.round(68 * factor) / 10)
      return {
        ...kpi,
        value: `${lakh.toFixed(1)} Lakh sqft`,
        subtitle: 'Carpet area for the selected period / vendor scope.',
      }
    }
    if (kpi.id === 'revenue') {
      const amount = scale(482_000_000, factor)
      return {
        ...kpi,
        value: formatBillingValue(amount),
        subtitle: 'Revenue for the selected period / vendor scope.',
      }
    }
    // fee
    const fee = Math.max(100, Math.round(710 * (0.85 + factor * 0.15)))
    return {
      ...kpi,
      value: `₹${fee}`,
      subtitle: 'Mean design fee realised per square foot.',
    }
  })

  const highlightNames: Record<Exclude<VendorFilterId, 'all'>, ProjectHighlight[]> = {
    buildwell: [
      {
        id: 'largest',
        title: 'Largest Project',
        projectName: 'BuildWell Tower Wing',
        detailLabel: 'Area / Size',
        detailValue: '32,400 sqft',
        icon: 'largest',
      },
      {
        id: 'smallest',
        title: 'Smallest Project',
        projectName: 'BuildWell Lobby Refresh',
        detailLabel: 'Area / Size',
        detailValue: '1,120 sqft',
        icon: 'smallest',
      },
      {
        id: 'fastest',
        title: 'Fastest Project Delivered',
        projectName: 'BuildWell Annex Fit-out',
        detailLabel: 'Delivery Duration',
        detailValue: '58 days',
        icon: 'fastest',
      },
      {
        id: 'slowest',
        title: 'Slowest Project Delivered',
        projectName: 'BuildWell Campus Phase 2',
        detailLabel: 'Delivery Duration',
        detailValue: '278 days',
        icon: 'slowest',
      },
    ],
    electrotech: [
      {
        id: 'largest',
        title: 'Largest Project',
        projectName: 'ElectroTech Data Hall',
        detailLabel: 'Area / Size',
        detailValue: '18,600 sqft',
        icon: 'largest',
      },
      {
        id: 'smallest',
        title: 'Smallest Project',
        projectName: 'ElectroTech Panel Room',
        detailLabel: 'Area / Size',
        detailValue: '640 sqft',
        icon: 'smallest',
      },
      {
        id: 'fastest',
        title: 'Fastest Project Delivered',
        projectName: 'ElectroTech UPS Bay',
        detailLabel: 'Delivery Duration',
        detailValue: '41 days',
        icon: 'fastest',
      },
      {
        id: 'slowest',
        title: 'Slowest Project Delivered',
        projectName: 'ElectroTech Campus Grid',
        detailLabel: 'Delivery Duration',
        detailValue: '265 days',
        icon: 'slowest',
      },
    ],
    craft: [
      {
        id: 'largest',
        title: 'Largest Project',
        projectName: 'Craft Studio Flagship',
        detailLabel: 'Area / Size',
        detailValue: '14,200 sqft',
        icon: 'largest',
      },
      {
        id: 'smallest',
        title: 'Smallest Project',
        projectName: 'Craft Studio Sample Room',
        detailLabel: 'Area / Size',
        detailValue: '510 sqft',
        icon: 'smallest',
      },
      {
        id: 'fastest',
        title: 'Fastest Project Delivered',
        projectName: 'Craft Studio Pop-up',
        detailLabel: 'Delivery Duration',
        detailValue: '37 days',
        icon: 'fastest',
      },
      {
        id: 'slowest',
        title: 'Slowest Project Delivered',
        projectName: 'Craft Studio Heritage Wing',
        detailLabel: 'Delivery Duration',
        detailValue: '241 days',
        icon: 'slowest',
      },
    ],
    aquaflow: [
      {
        id: 'largest',
        title: 'Largest Project',
        projectName: 'AquaFlow Central Plant',
        detailLabel: 'Area / Size',
        detailValue: '11,800 sqft',
        icon: 'largest',
      },
      {
        id: 'smallest',
        title: 'Smallest Project',
        projectName: 'AquaFlow Pump Room',
        detailLabel: 'Area / Size',
        detailValue: '480 sqft',
        icon: 'smallest',
      },
      {
        id: 'fastest',
        title: 'Fastest Project Delivered',
        projectName: 'AquaFlow Riser Upgrade',
        detailLabel: 'Delivery Duration',
        detailValue: '44 days',
        icon: 'fastest',
      },
      {
        id: 'slowest',
        title: 'Slowest Project Delivered',
        projectName: 'AquaFlow Campus Loop',
        detailLabel: 'Delivery Duration',
        detailValue: '229 days',
        icon: 'slowest',
      },
    ],
    nova: [
      {
        id: 'largest',
        title: 'Largest Project',
        projectName: 'Nova Acoustics Hall',
        detailLabel: 'Area / Size',
        detailValue: '9,600 sqft',
        icon: 'largest',
      },
      {
        id: 'smallest',
        title: 'Smallest Project',
        projectName: 'Nova Acoustics Booth',
        detailLabel: 'Area / Size',
        detailValue: '360 sqft',
        icon: 'smallest',
      },
      {
        id: 'fastest',
        title: 'Fastest Project Delivered',
        projectName: 'Nova Acoustics Studio A',
        detailLabel: 'Delivery Duration',
        detailValue: '39 days',
        icon: 'fastest',
      },
      {
        id: 'slowest',
        title: 'Slowest Project Delivered',
        projectName: 'Nova Acoustics Concert Wing',
        detailLabel: 'Delivery Duration',
        detailValue: '254 days',
        icon: 'slowest',
      },
    ],
  }

  return {
    kpis,
    highlights: vendorId === 'all' ? PROJECT_HIGHLIGHTS : highlightNames[vendorId],
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

  const meta = scaleLargerMeta(p * v, vendorId)

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
    yearLines,
    projectsCompleted,
    largerMetaKpis: meta.kpis,
    projectHighlights: meta.highlights,
  }
}

/* -------------------------------------------------------------------------- */
/* Vendor Performance master graph (real vendors / invoices / projects)       */
/* -------------------------------------------------------------------------- */

export const VENDOR_PERFORMANCE_METRIC_OPTIONS = [
  'Projects',
  'No. of Projects',
  'Billing for the Projects',
  'Duration',
  'Total Billing for the Year',
  'Billing Over the Years',
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

const PERFORMANCE_LINE_COLORS = [
  CHART_COLORS.teal,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.purple,
  CHART_COLORS.green,
  CHART_COLORS.red,
  CHART_COLORS.grey,
]

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

function vendorSeriesKey(vendorId: string): string {
  return `v_${vendorId.replace(/[^a-zA-Z0-9]/g, '_')}`
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

  for (const vendor of vendors) {
    if (vendor.profileStatus === 'pending') continue
    ensureVendorAcc(map, vendor.id, vendor.name)
  }

  for (const inv of vendorInvoices) {
    const vendorId = (inv.vendorId || '').trim()
    if (!vendorId) continue
    const vendorName = (inv.vendorName || '').trim() || 'Unknown'
    const acc = ensureVendorAcc(map, vendorId, vendorName)
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

function averageDuration(acc: VendorAccumulator): number {
  const durations = [...acc.projects.values()]
    .map((p) => p.durationDays)
    .filter((d): d is number => d != null)
  if (durations.length === 0) return 0
  return Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
}

function buildVendorOptions(ranked: VendorAccumulator[]): VendorPerformanceOption[] {
  const options = ranked.map((v) => ({ value: v.vendorId, label: v.vendorName }))
  return [{ value: TOP5_VENDOR_OPTION_VALUE, label: 'Top 5 Vendors' }, ...options]
}

function scopeVendors(
  ranked: VendorAccumulator[],
  performanceVendorId: string,
): VendorAccumulator[] {
  if (performanceVendorId === TOP5_VENDOR_OPTION_VALUE) {
    return ranked.slice(0, 5)
  }
  const match = ranked.find((v) => v.vendorId === performanceVendorId)
  return match ? [match] : []
}

function projectNames(acc: VendorAccumulator): string[] {
  return [...acc.projects.values()]
    .map((p) => p.projectName)
    .filter((name) => !name.includes('__meta_') && !/^Project \d+$/.test(name))
    .sort((a, b) => a.localeCompare(b))
}

function buildYearsLineChart(
  scoped: VendorAccumulator[],
  allYears: string[],
): VendorPerformanceChartConfig {
  const series = scoped.map((v, i) => ({
    key: vendorSeriesKey(v.vendorId),
    label: v.vendorName,
    color: PERFORMANCE_LINE_COLORS[i % PERFORMANCE_LINE_COLORS.length],
  }))

  const data = allYears.map((year) => {
    const row: Record<string, string | number> = { year }
    for (const v of scoped) {
      row[vendorSeriesKey(v.vendorId)] = v.billingByYear.get(year) ?? 0
    }
    return row
  })

  return {
    title: 'Vendor Performance',
    subtitle: 'Billing over the years',
    kind: 'years-line',
    xKey: 'year',
    yAxisLabel: 'Billing',
    xAxisLabel: 'Years',
    format: 'currency',
    series,
    data,
  }
}

function buildHorizontalChart(
  metric: VendorPerformanceMetric,
  scoped: VendorAccumulator[],
  performanceVendorId: string,
): VendorPerformanceChartConfig {
  const tooltipDetails: Record<string, { projects?: string[]; extra?: string }> = {}

  // Projects metric — single vendor: project-wise bars
  if (metric === 'Projects' && performanceVendorId !== TOP5_VENDOR_OPTION_VALUE && scoped[0]) {
    const vendor = scoped[0]
    const rows = [...vendor.projects.values()]
      .filter((p) => !p.projectId.includes('__meta_'))
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

  // Vendor-wise bars (Top 5 or single vendor non-project metrics / Projects for Top 5)
  const data = scoped.map((v) => {
    const names = projectNames(v)
    let value = 0
    let extra: string | undefined

    switch (metric) {
      case 'Projects':
        value = v.projects.size
        extra = names.length > 0 ? undefined : 'No named projects linked'
        break
      case 'No. of Projects':
        value = v.projects.size
        break
      case 'Billing for the Projects':
        value = Math.round(
          [...v.projects.values()].reduce((s, p) => s + p.billing, 0),
        )
        break
      case 'Duration':
        value = averageDuration(v)
        extra =
          value > 0
            ? `Avg across ${[...v.projects.values()].filter((p) => p.durationDays != null).length} project(s)`
            : 'No duration data'
        break
      case 'Total Billing for the Year':
        value = Math.round(v.billingInPeriod)
        break
      default:
        value = v.projects.size
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
      case 'Projects':
        return {
          subtitle: 'Projects associated with each vendor (see tooltip for names)',
          xAxisLabel: 'No. of Projects',
          color: CHART_COLORS.blue,
        }
      case 'No. of Projects':
        return {
          subtitle: 'Number of projects per vendor',
          xAxisLabel: 'Number of Projects',
          color: CHART_COLORS.blue,
        }
      case 'Billing for the Projects':
        return {
          subtitle: 'Billing associated with each vendor’s projects',
          xAxisLabel: 'Billing for Projects (₹)',
          color: CHART_COLORS.teal,
        }
      case 'Duration':
        return {
          subtitle: 'Average project duration per vendor',
          xAxisLabel: 'Average Project Duration (days)',
          color: CHART_COLORS.amber,
        }
      case 'Total Billing for the Year':
        return {
          subtitle: 'Total billing for the selected time period',
          xAxisLabel: 'Total Billing for the Year (₹)',
          color: CHART_COLORS.green,
        }
      default:
        return {
          subtitle: 'Vendor performance',
          xAxisLabel: 'Value',
          color: CHART_COLORS.teal,
        }
    }
  })()

  const format: 'count' | 'currency' | 'days' =
    metric === 'Duration'
      ? 'days'
      : metric === 'Billing for the Projects' || metric === 'Total Billing for the Year'
        ? 'currency'
        : 'count'

  return {
    title: 'Vendor Performance',
    subtitle: meta.subtitle,
    kind: 'horizontal-bar',
    xKey: 'vendor',
    yAxisLabel: performanceVendorId === TOP5_VENDOR_OPTION_VALUE ? 'Top 5 Vendors' : 'Vendors',
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
  const ranked = rankVendorsByBilling([...accMap.values()].filter((v) => v.vendorName))
  const vendorOptions = buildVendorOptions(ranked)

  const resolvedId = vendorOptions.some((o) => o.value === performanceVendorId)
    ? performanceVendorId
    : TOP5_VENDOR_OPTION_VALUE

  const scoped = scopeVendors(ranked, resolvedId)

  if (metric === 'Billing Over the Years') {
    const yearSet = new Set<string>()
    for (const v of ranked) {
      for (const y of v.billingByYear.keys()) yearSet.add(y)
    }
    // Ensure a sensible span even if sparse
    const nowYear = new Date().getFullYear()
    for (let y = nowYear - 4; y <= nowYear; y++) yearSet.add(String(y))
    const allYears = [...yearSet].sort()
    return {
      vendorOptions,
      chart: buildYearsLineChart(scoped, allYears),
    }
  }

  return {
    vendorOptions,
    chart: buildHorizontalChart(metric, scoped, resolvedId),
  }
}

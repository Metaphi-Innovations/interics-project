/**
 * Sample data for Dashboard 1 — Vendors section.
 */

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
}

/** Projects completed with each vendor — sorted highest → lowest. */
export interface ProjectsCompletedTogetherPoint {
  vendor: string
  projects: number
}

export const VENDOR_TIME_PERIOD_OPTIONS = [
  'This Financial Year',
  'Last Financial Year',
  'Last 5 Years',
  'Lifetime',
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
    case 'Last Financial Year':
      return 0.88
    case 'Last 5 Years':
      return 3.4
    case 'Lifetime':
      return 4.6
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
    case 'Last Financial Year':
      return 'Total Vendor Billing (Last Year)'
    case 'Last 5 Years':
      return 'Total Vendor Billing (Last 5 Years)'
    case 'Lifetime':
      return 'Total Vendor Billing (Lifetime)'
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
    case 'Last Financial Year':
      return `Total vendor billing for ${scope} in the previous financial year.`
    case 'Last 5 Years':
      return `Cumulative vendor billing for ${scope} over the last 5 years.`
    case 'Lifetime':
      return `Lifetime vendor billing for ${scope}.`
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

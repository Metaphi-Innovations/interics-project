/**
 * Sample data for Dashboard 1 — Project Design Analytics (per-project view).
 * Plus Live Project fee analytics for the interactive Fee master graph.
 */

import type { Project } from '@/slices/projects/reducer'
import { getProjectTypes } from '@/pages/Projects/projectTypes'
import { CHART_COLORS } from '@/design-system/tokens'

export type DesignProjectId =
  | 'abc-head-office'
  | 'xyz-corporate'
  | 'tcs-pune'
  | 'infosys-bangalore'
  | 'wipro-hyderabad'

export interface DesignProjectOption {
  id: DesignProjectId
  label: string
}

export const DESIGN_PROJECT_OPTIONS: DesignProjectOption[] = [
  { id: 'abc-head-office', label: 'ABC Head Office' },
  { id: 'xyz-corporate', label: 'XYZ Corporate Office' },
  { id: 'tcs-pune', label: 'TCS Pune Office' },
  { id: 'infosys-bangalore', label: 'Infosys Bangalore' },
  { id: 'wipro-hyderabad', label: 'Wipro Hyderabad' },
]

export const DEFAULT_DESIGN_PROJECT_ID: DesignProjectId = 'abc-head-office'

export type DesignFinancialIcon = 'value' | 'payable' | 'profit' | 'fee'

export interface DesignProjectDetails {
  projectName: string
  carpetArea: string
  headcount: string
  building: string
  clientSector: string
  projectManager: string
}

export interface DesignFinancialKpi {
  id: string
  title: string
  value: string
  subtitle: string
  icon: DesignFinancialIcon
}

export interface DesignFeePerSqftRow {
  service: string
  feePerSqft: number
}

export interface DesignDurationRow {
  label: string
  days: number
}

export interface DesignProjectAnalytics {
  details: DesignProjectDetails
  financialSummary: DesignFinancialKpi[]
  feePerSqft: DesignFeePerSqftRow[]
  duration: DesignDurationRow[]
}

function financialSummary(
  totalValue: string,
  vendorsPayable: string,
  profitPct: string,
  designFee: string,
): DesignFinancialKpi[] {
  return [
    {
      id: 'total-value',
      title: 'Total Project Value',
      value: totalValue,
      subtitle: 'Agreed contract value for this project.',
      icon: 'value',
    },
    {
      id: 'vendors-payable',
      title: 'Vendors Payable',
      value: vendorsPayable,
      subtitle: 'Outstanding amount due to vendors.',
      icon: 'payable',
    },
    {
      id: 'profit-pct',
      title: 'Profit Percentage',
      value: profitPct,
      subtitle: 'Estimated profit margin on design scope.',
      icon: 'profit',
    },
    {
      id: 'total-design-fee',
      title: 'Total Design Fee',
      value: designFee,
      subtitle: 'Sum of design-related fees for this project.',
      icon: 'fee',
    },
  ]
}

/** Existing design-service fee categories (retained for underlying fee data). */
export const FEE_SERVICE_CATEGORIES = [
  'Design',
  'Approvals',
  'Acoustic',
  'Lighting Consultancy',
  'PMC',
  'Interior Consultancy',
] as const

export type FeeServiceCategory = (typeof FEE_SERVICE_CATEGORIES)[number]

/** Consultancy-oriented categories within the existing fee breakdown. */
const CONSULTANCY_FEE_CATEGORIES: readonly FeeServiceCategory[] = [
  'Approvals',
  'Acoustic',
  'Lighting Consultancy',
  'PMC',
  'Interior Consultancy',
]

function feePerSqft(
  design: number,
  approvals: number,
  acoustic: number,
  lighting: number,
  pmc: number,
  interior: number,
): DesignFeePerSqftRow[] {
  return [
    { service: 'Design', feePerSqft: design },
    { service: 'Approvals', feePerSqft: approvals },
    { service: 'Acoustic', feePerSqft: acoustic },
    { service: 'Lighting Consultancy', feePerSqft: lighting },
    { service: 'PMC', feePerSqft: pmc },
    { service: 'Interior Consultancy', feePerSqft: interior },
  ]
}

/**
 * Baseline ₹/sqft rates by existing fee category — used to allocate consultancy
 * share from a project's design fee rate (same category set as feePerSqft charts).
 */
const FEE_CATEGORY_BASELINE = feePerSqft(185, 42, 28, 35, 55, 95)

const DESIGN_BASELINE_RATE =
  FEE_CATEGORY_BASELINE.find((r) => r.service === 'Design')?.feePerSqft ?? 185

const CONSULTANCY_BASELINE_RATE = FEE_CATEGORY_BASELINE.filter((r) =>
  (CONSULTANCY_FEE_CATEGORIES as readonly string[]).includes(r.service),
).reduce((sum, r) => sum + r.feePerSqft, 0)

function duration(planned: number, actual: number): DesignDurationRow[] {
  return [
    { label: 'Planned Duration', days: planned },
    { label: 'Actual Duration', days: actual },
  ]
}

export const DESIGN_PROJECT_ANALYTICS: Record<DesignProjectId, DesignProjectAnalytics> = {
  'abc-head-office': {
    details: {
      projectName: 'ABC Head Office',
      carpetArea: '4,850 sqft',
      headcount: '120',
      building: 'Connaught Place Tower, Delhi',
      clientSector: 'Corporate',
      projectManager: 'Arjun Nair',
    },
    financialSummary: financialSummary('₹2.85 Cr', '₹48.2 L', '18.4%', '₹21.4 L'),
    feePerSqft: feePerSqft(185, 42, 28, 35, 55, 95),
    duration: duration(120, 138),
  },
  'xyz-corporate': {
    details: {
      projectName: 'XYZ Corporate Office',
      carpetArea: '7,200 sqft',
      headcount: '210',
      building: 'BKC Platinum, Mumbai',
      clientSector: 'BFSI',
      projectManager: 'Meera Shah',
    },
    financialSummary: financialSummary('₹4.10 Cr', '₹72.5 L', '21.2%', '₹34.8 L'),
    feePerSqft: feePerSqft(210, 48, 32, 40, 62, 110),
    duration: duration(150, 162),
  },
  'tcs-pune': {
    details: {
      projectName: 'TCS Pune Office',
      carpetArea: '12,400 sqft',
      headcount: '480',
      building: 'Hinjewadi Phase 2, Pune',
      clientSector: 'IT / Technology',
      projectManager: 'Rohan Deshmukh',
    },
    financialSummary: financialSummary('₹6.75 Cr', '₹1.15 Cr', '16.8%', '₹52.0 L'),
    feePerSqft: feePerSqft(160, 38, 22, 30, 48, 82),
    duration: duration(180, 195),
  },
  'infosys-bangalore': {
    details: {
      projectName: 'Infosys Bangalore',
      carpetArea: '9,600 sqft',
      headcount: '350',
      building: 'Electronic City Campus, Bengaluru',
      clientSector: 'IT / Technology',
      projectManager: 'Priya Menon',
    },
    financialSummary: financialSummary('₹5.40 Cr', '₹89.0 L', '19.6%', '₹41.2 L'),
    feePerSqft: feePerSqft(195, 45, 30, 38, 58, 102),
    duration: duration(165, 158),
  },
  'wipro-hyderabad': {
    details: {
      projectName: 'Wipro Hyderabad',
      carpetArea: '8,150 sqft',
      headcount: '275',
      building: 'Gachibowli Tech Park, Hyderabad',
      clientSector: 'IT / Technology',
      projectManager: 'Karthik Reddy',
    },
    financialSummary: financialSummary('₹3.95 Cr', '₹61.4 L', '17.1%', '₹29.6 L'),
    feePerSqft: feePerSqft(172, 40, 25, 33, 50, 88),
    duration: duration(140, 149),
  },
}

/* -------------------------------------------------------------------------- */
/* Live Project Fee master graph (real Live projects)                         */
/* -------------------------------------------------------------------------- */

export const FEE_METRIC_OPTIONS = [
  'Fee per Sq.ft',
  'Total Design Fee',
  'Consultancy Fee',
  'Build Fee',
  'Total Fee',
] as const

export type FeeMetric = (typeof FEE_METRIC_OPTIONS)[number]

export interface LiveProjectFeeOption {
  value: string
  label: string
}

export interface LiveProjectFeeChartConfig {
  /** Fixed Y-axis label (Live Projects). */
  yAxisLabel: string
  /** Dynamic X-axis label from Fee Metric. */
  xAxisLabel: string
  format: 'perSqft' | 'currency'
  seriesKey: string
  seriesLabel: string
  color: string
  data: Array<{ project: string; projectId: string; value: number }>
}

export interface LiveProjectFeeAnalytics {
  projectOptions: LiveProjectFeeOption[]
  chart: LiveProjectFeeChartConfig
}

const CONSULTANCY_PROJECT_TYPES = new Set([
  'Acoustic',
  'Lighting',
  'Kitchen',
  'LEED',
  'Branding & Styling',
  'Local Approvals',
  'MEP',
  'Structural',
  'AV',
  'IT',
  'Security',
  'Other',
])

function projectArea(project: Project): number {
  const area = project.carpetArea ?? project.chargeableArea ?? 0
  return area > 0 ? area : 0
}

function designFeePerSqft(project: Project): number {
  const rate = project.designFeePerSqft ?? 0
  return rate > 0 ? rate : 0
}

function totalDesignFee(project: Project): number {
  const area = projectArea(project)
  const rate = designFeePerSqft(project)
  if (area <= 0 || rate <= 0) return 0
  return Math.round(area * rate)
}

function buildFee(project: Project): number {
  const area = projectArea(project)
  const rate = project.buildValuePerSqft ?? 0
  if (area <= 0 || rate <= 0) return 0
  return Math.round(area * rate)
}

/**
 * Consultancy fee from existing fee-category baseline ratios, scaled to the
 * project's design fee rate. When the project has no consultancy-oriented
 * types, returns 0.
 */
function consultancyFee(project: Project): number {
  const area = projectArea(project)
  const designRate = designFeePerSqft(project)
  if (area <= 0 || designRate <= 0 || DESIGN_BASELINE_RATE <= 0) return 0

  const types = getProjectTypes(project)
  const hasConsultancyType = types.some((t) => CONSULTANCY_PROJECT_TYPES.has(t))
  if (!hasConsultancyType) return 0

  const consultancyRate = designRate * (CONSULTANCY_BASELINE_RATE / DESIGN_BASELINE_RATE)
  return Math.round(area * consultancyRate)
}

function totalFee(project: Project): number {
  return totalDesignFee(project) + consultancyFee(project) + buildFee(project)
}

function metricValue(project: Project, metric: FeeMetric): number {
  switch (metric) {
    case 'Fee per Sq.ft':
      return designFeePerSqft(project)
    case 'Total Design Fee':
      return totalDesignFee(project)
    case 'Consultancy Fee':
      return consultancyFee(project)
    case 'Build Fee':
      return buildFee(project)
    case 'Total Fee':
      return totalFee(project)
    default:
      return 0
  }
}

function metricAxisMeta(metric: FeeMetric): {
  xAxisLabel: string
  format: 'perSqft' | 'currency'
  seriesLabel: string
  color: string
} {
  switch (metric) {
    case 'Fee per Sq.ft':
      return {
        xAxisLabel: 'Fee per Sq.ft (₹)',
        format: 'perSqft',
        seriesLabel: 'Fee / sqft',
        color: CHART_COLORS.teal,
      }
    case 'Total Design Fee':
      return {
        xAxisLabel: 'Total Design Fee (₹)',
        format: 'currency',
        seriesLabel: 'Total Design Fee',
        color: CHART_COLORS.blue,
      }
    case 'Consultancy Fee':
      return {
        xAxisLabel: 'Consultancy Fee (₹)',
        format: 'currency',
        seriesLabel: 'Consultancy Fee',
        color: CHART_COLORS.purple,
      }
    case 'Build Fee':
      return {
        xAxisLabel: 'Build Fee (₹)',
        format: 'currency',
        seriesLabel: 'Build Fee',
        color: CHART_COLORS.amber,
      }
    case 'Total Fee':
      return {
        xAxisLabel: 'Total Fee (₹)',
        format: 'currency',
        seriesLabel: 'Total Fee',
        color: CHART_COLORS.green,
      }
    default:
      return {
        xAxisLabel: 'Value (₹)',
        format: 'currency',
        seriesLabel: 'Value',
        color: CHART_COLORS.teal,
      }
  }
}

function liveProjects(projects: Project[]): Project[] {
  return projects
    .filter((p) => p.status === 'Live')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
}

function buildProjectOptions(live: Project[]): LiveProjectFeeOption[] {
  return [
    { value: 'all', label: 'All Live Projects' },
    ...live.map((p) => ({ value: p.id, label: p.name })),
  ]
}

/** Master Live Project fee chart from real project fee / sqft fields. */
export function getLiveProjectFeeAnalytics(
  projects: Project[],
  liveProjectId: string,
  metric: FeeMetric,
): LiveProjectFeeAnalytics {
  const live = liveProjects(projects)
  const projectOptions = buildProjectOptions(live)

  let scoped = live
  if (liveProjectId !== 'all') {
    scoped = live.filter((p) => p.id === liveProjectId)
  }

  const axis = metricAxisMeta(metric)
  const data = scoped
    .map((p) => ({
      project: p.name,
      projectId: p.id,
      value: metricValue(p, metric),
    }))
    .sort((a, b) => b.value - a.value || a.project.localeCompare(b.project))

  return {
    projectOptions,
    chart: {
      yAxisLabel: 'Live Projects',
      xAxisLabel: axis.xAxisLabel,
      format: axis.format,
      seriesKey: 'value',
      seriesLabel: axis.seriesLabel,
      color: axis.color,
      data,
    },
  }
}

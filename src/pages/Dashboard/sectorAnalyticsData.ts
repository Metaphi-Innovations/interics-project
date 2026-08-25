/**
 * Sample data for Dashboard — Sector & Project Type Analytics.
 */

import { CHART_COLORS } from '@/design-system/tokens'

export const SECTOR_FILTER_OPTIONS = [
  { value: 'top5', label: 'Top 5' },
  { value: 'top10', label: 'Top 10' },
  { value: 'top15', label: 'Top 15' },
  { value: 'all', label: 'All Sectors' },
] as const

export type SectorFilterValue = (typeof SECTOR_FILTER_OPTIONS)[number]['value']

export type SectorPerformanceMetric = 'completedCount' | 'avgCompletedSqft'

export const SECTOR_PERFORMANCE_METRIC_OPTIONS = [
  {
    value: 'completedCount' as const,
    label: 'Completed Projects',
    xAxisLabel: 'Completed Projects (No.)',
  },
  {
    value: 'avgCompletedSqft' as const,
    label: 'Average Completed Project Size',
    xAxisLabel: 'Average Project Size (sq.ft.)',
  },
] as const

/** Stable sector colors for Sector Performance bars / legend. */
export const SECTOR_COLORS: Record<string, string> = {
  Corporate: CHART_COLORS.green,
  Retail: CHART_COLORS.blue,
  Healthcare: CHART_COLORS.orange,
  Hospitality: CHART_COLORS.purple,
  Residential: CHART_COLORS.teal,
  Education: CHART_COLORS.amber,
  'IT / Tech': CHART_COLORS.blue,
  Banking: CHART_COLORS.teal,
  Manufacturing: CHART_COLORS.grey,
  Pharma: CHART_COLORS.purple,
  'F&B': CHART_COLORS.orange,
  Logistics: CHART_COLORS.amber,
  Media: CHART_COLORS.red,
  Automobile: CHART_COLORS.blue,
  Government: CHART_COLORS.grey,
  Sports: CHART_COLORS.green,
  Agriculture: CHART_COLORS.teal,
  Energy: CHART_COLORS.amber,
}

const FALLBACK_SECTOR_COLORS = [
  CHART_COLORS.green,
  CHART_COLORS.blue,
  CHART_COLORS.orange,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.grey,
]

export function sectorColor(sector: string, index = 0): string {
  return SECTOR_COLORS[sector] ?? FALLBACK_SECTOR_COLORS[index % FALLBACK_SECTOR_COLORS.length]!
}

/**
 * Completed-projects-only sector metrics.
 * `completedCount` and `avgCompletedSqft` must never include Pitch / Live /
 * Cancelled / Archived projects.
 */
export interface SectorPerformanceRow {
  sector: string
  completedCount: number
  avgCompletedSqft: number
}

export const SECTOR_PERFORMANCE: SectorPerformanceRow[] = [
  { sector: 'Corporate', completedCount: 15, avgCompletedSqft: 6200 },
  { sector: 'Retail', completedCount: 9, avgCompletedSqft: 3800 },
  { sector: 'Healthcare', completedCount: 7, avgCompletedSqft: 5100 },
  { sector: 'Hospitality', completedCount: 6, avgCompletedSqft: 7400 },
  { sector: 'Residential', completedCount: 5, avgCompletedSqft: 2900 },
  { sector: 'Education', completedCount: 4, avgCompletedSqft: 4500 },
  { sector: 'IT / Tech', completedCount: 4, avgCompletedSqft: 5800 },
  { sector: 'Banking', completedCount: 3, avgCompletedSqft: 4900 },
  { sector: 'Manufacturing', completedCount: 3, avgCompletedSqft: 8600 },
  { sector: 'Pharma', completedCount: 3, avgCompletedSqft: 6700 },
  { sector: 'F&B', completedCount: 2, avgCompletedSqft: 3200 },
  { sector: 'Logistics', completedCount: 2, avgCompletedSqft: 9100 },
  { sector: 'Media', completedCount: 2, avgCompletedSqft: 3600 },
  { sector: 'Automobile', completedCount: 2, avgCompletedSqft: 7800 },
  { sector: 'Government', completedCount: 1, avgCompletedSqft: 5400 },
  { sector: 'Sports', completedCount: 1, avgCompletedSqft: 12000 },
  { sector: 'Agriculture', completedCount: 1, avgCompletedSqft: 4100 },
  { sector: 'Energy', completedCount: 1, avgCompletedSqft: 6900 },
]

/** @deprecated Prefer SECTOR_PERFORMANCE.completedCount — kept for fee ranking. */
export const PROJECTS_BY_SECTOR = SECTOR_PERFORMANCE.map((r) => ({
  sector: r.sector,
  count: r.completedCount,
}))

export const DESIGN_VS_BUILD = [
  { key: 'design_only', label: 'Design Only', value: 19 },
  { key: 'design_build', label: 'Design & Build', value: 28 },
]

/** @deprecated Prefer SECTOR_PERFORMANCE.avgCompletedSqft */
export const SECTOR_AVG_PROJECT_SIZE = SECTOR_PERFORMANCE.map((r) => ({
  sector: r.sector,
  avgSqft: r.avgCompletedSqft,
}))

/** Average Design / Consultancy / Build fee by sector (₹). */
export const SECTOR_WISE_FEE_AVERAGE = [
  { sector: 'Corporate', designFee: 185, consultancyFee: 95, buildFee: 420 },
  { sector: 'Retail', designFee: 140, consultancyFee: 70, buildFee: 360 },
  { sector: 'Healthcare', designFee: 210, consultancyFee: 110, buildFee: 480 },
  { sector: 'Hospitality', designFee: 230, consultancyFee: 120, buildFee: 510 },
  { sector: 'Residential', designFee: 160, consultancyFee: 80, buildFee: 390 },
  { sector: 'Education', designFee: 150, consultancyFee: 75, buildFee: 340 },
  { sector: 'IT / Tech', designFee: 195, consultancyFee: 100, buildFee: 450 },
  { sector: 'Banking', designFee: 220, consultancyFee: 115, buildFee: 490 },
  { sector: 'Manufacturing', designFee: 170, consultancyFee: 85, buildFee: 400 },
  { sector: 'Pharma', designFee: 205, consultancyFee: 105, buildFee: 470 },
  { sector: 'F&B', designFee: 130, consultancyFee: 65, buildFee: 330 },
  { sector: 'Logistics', designFee: 145, consultancyFee: 72, buildFee: 350 },
  { sector: 'Media', designFee: 155, consultancyFee: 78, buildFee: 370 },
  { sector: 'Automobile', designFee: 175, consultancyFee: 90, buildFee: 410 },
  { sector: 'Government', designFee: 165, consultancyFee: 88, buildFee: 380 },
  { sector: 'Sports', designFee: 240, consultancyFee: 125, buildFee: 520 },
  { sector: 'Agriculture', designFee: 120, consultancyFee: 60, buildFee: 300 },
  { sector: 'Energy', designFee: 200, consultancyFee: 108, buildFee: 460 },
]

export function sectorFilterLimit(
  filter: SectorFilterValue,
  total: number,
): number {
  if (filter === 'top5') return 5
  if (filter === 'top10') return 10
  if (filter === 'top15') return 15
  return total
}

export function limitSectors<T extends { sector: string }>(
  rows: readonly T[],
  filter: SectorFilterValue,
): T[] {
  const limit = sectorFilterLimit(filter, rows.length)
  // Keep order aligned with completed-project ranking (already sorted by count).
  const ranked = PROJECTS_BY_SECTOR.map((s) => s.sector).slice(0, limit)
  const bySector = new Map(rows.map((r) => [r.sector, r]))
  return ranked
    .map((sector) => bySector.get(sector))
    .filter((row): row is T => Boolean(row))
}

export interface SectorPerformanceChartRow {
  sector: string
  value: number
  color: string
}

/** Rows sorted highest→lowest for the selected completed-only metric. */
export function buildSectorPerformanceChartData(
  filter: SectorFilterValue,
  metric: SectorPerformanceMetric,
): SectorPerformanceChartRow[] {
  const sorted = [...SECTOR_PERFORMANCE].sort((a, b) => b[metric] - a[metric])
  const limit = sectorFilterLimit(filter, sorted.length)
  return sorted.slice(0, limit).map((row, index) => ({
    sector: row.sector,
    value: row[metric],
    color: sectorColor(row.sector, index),
  }))
}

export function getSectorPerformanceMetricMeta(metric: SectorPerformanceMetric) {
  return (
    SECTOR_PERFORMANCE_METRIC_OPTIONS.find((o) => o.value === metric) ??
    SECTOR_PERFORMANCE_METRIC_OPTIONS[0]
  )
}

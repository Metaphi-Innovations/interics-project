/**
 * Sample data for Dashboard 1 — Sector & Project Type Analytics.
 */

export const SECTOR_FILTER_OPTIONS = [
  { value: 'top5', label: 'Top 5' },
  { value: 'top10', label: 'Top 10' },
  { value: 'top15', label: 'Top 15' },
  { value: 'all', label: 'All Sectors' },
] as const

export type SectorFilterValue = (typeof SECTOR_FILTER_OPTIONS)[number]['value']

/** Sorted by project count (desc) — used for Top N filtering. */
export const PROJECTS_BY_SECTOR = [
  { sector: 'Corporate', count: 16 },
  { sector: 'Retail', count: 9 },
  { sector: 'Healthcare', count: 7 },
  { sector: 'Hospitality', count: 6 },
  { sector: 'Residential', count: 5 },
  { sector: 'Education', count: 4 },
  { sector: 'IT / Tech', count: 4 },
  { sector: 'Banking', count: 3 },
  { sector: 'Manufacturing', count: 3 },
  { sector: 'Pharma', count: 3 },
  { sector: 'F&B', count: 2 },
  { sector: 'Logistics', count: 2 },
  { sector: 'Media', count: 2 },
  { sector: 'Automobile', count: 2 },
  { sector: 'Government', count: 1 },
  { sector: 'Sports', count: 1 },
  { sector: 'Agriculture', count: 1 },
  { sector: 'Energy', count: 1 },
]

export const DESIGN_VS_BUILD = [
  { key: 'design_only', label: 'Design Only', value: 19 },
  { key: 'design_build', label: 'Design & Build', value: 28 },
]

export const SECTOR_AVG_PROJECT_SIZE = [
  { sector: 'Corporate', avgSqft: 6200 },
  { sector: 'Retail', avgSqft: 3800 },
  { sector: 'Healthcare', avgSqft: 5100 },
  { sector: 'Hospitality', avgSqft: 7400 },
  { sector: 'Residential', avgSqft: 2900 },
  { sector: 'Education', avgSqft: 4500 },
  { sector: 'IT / Tech', avgSqft: 5800 },
  { sector: 'Banking', avgSqft: 4900 },
  { sector: 'Manufacturing', avgSqft: 8600 },
  { sector: 'Pharma', avgSqft: 6700 },
  { sector: 'F&B', avgSqft: 3200 },
  { sector: 'Logistics', avgSqft: 9100 },
  { sector: 'Media', avgSqft: 3600 },
  { sector: 'Automobile', avgSqft: 7800 },
  { sector: 'Government', avgSqft: 5400 },
  { sector: 'Sports', avgSqft: 12000 },
  { sector: 'Agriculture', avgSqft: 4100 },
  { sector: 'Energy', avgSqft: 6900 },
]

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

export function limitSectors<T extends { sector: string }>(
  rows: readonly T[],
  filter: SectorFilterValue,
): T[] {
  const limit =
    filter === 'top5' ? 5 : filter === 'top10' ? 10 : filter === 'top15' ? 15 : rows.length
  // Keep order aligned with PROJECTS_BY_SECTOR ranking (already sorted by count).
  const ranked = PROJECTS_BY_SECTOR.map((s) => s.sector).slice(0, limit)
  const bySector = new Map(rows.map((r) => [r.sector, r]))
  return ranked
    .map((sector) => bySector.get(sector))
    .filter((row): row is T => Boolean(row))
}

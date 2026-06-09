/** Sector values used in Customer listing and project/customer forms. */
export const SECTOR_OPTIONS = [
  'Commercial',
  'Residential',
  'Hospitality',
  'Retail',
  'Industrial',
] as const

export type SectorOption = (typeof SECTOR_OPTIONS)[number]

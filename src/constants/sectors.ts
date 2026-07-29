/** @deprecated Prefer Sector Master via settings Redux (`fetchSectors`). Kept for fallback labels. */
export const SECTOR_OPTIONS = [
  'Banking',
  'IT Companies',
  'Healthcare',
  'Hospitality',
  'Manufacturing',
] as const

export type SectorOption = (typeof SECTOR_OPTIONS)[number]

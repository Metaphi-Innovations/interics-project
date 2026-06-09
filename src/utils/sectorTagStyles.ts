/** Customer sector tag colors — light + dark surfaces. */

export interface SectorTagColors {
  bg: string
  color: string
}

const OTHER_LIGHT: SectorTagColors = { bg: '#F3F4F6', color: '#374151' }
const OTHER_DARK: SectorTagColors = { bg: '#374151', color: '#E5E7EB' }

const SECTOR_COLORS: Record<
  string,
  { light: SectorTagColors; dark: SectorTagColors }
> = {
  commercial: {
    light: { bg: '#DBEAFE', color: '#1D4ED8' },
    dark: { bg: '#1E3A8A', color: '#93C5FD' },
  },
  residential: {
    light: { bg: '#DCFCE7', color: '#15803D' },
    dark: { bg: '#14532D', color: '#86EFAC' },
  },
  hospitality: {
    light: { bg: '#EDE9FE', color: '#7C3AED' },
    dark: { bg: '#4C1D95', color: '#C4B5FD' },
  },
  retail: {
    light: { bg: '#FFEDD5', color: '#C2410C' },
    dark: { bg: '#7C2D12', color: '#FDBA74' },
  },
  industrial: {
    light: { bg: '#E0F2FE', color: '#0369A1' },
    dark: { bg: '#0C4A6E', color: '#7DD3FC' },
  },
}

export function getSectorTagSx(sector: string, mode: 'light' | 'dark'): SectorTagColors {
  const key = sector.trim().toLowerCase()
  const pair = SECTOR_COLORS[key]
  if (pair) {
    return mode === 'dark' ? pair.dark : pair.light
  }
  return mode === 'dark' ? OTHER_DARK : OTHER_LIGHT
}

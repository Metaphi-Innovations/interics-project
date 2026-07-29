import type { StatusType } from '@/design-system/components/display/StatusBadge'
import { getStatusBadgeColors } from '@/design-system/components/display/StatusBadge'

export interface MasterChipColors {
  bg: string
  color: string
}

/** Fallback palette when a master name has no dedicated mapping. */
const FALLBACK_PALETTE_LIGHT: MasterChipColors[] = [
  { bg: '#DBEAFE', color: '#1D4ED8' },
  { bg: '#DCFCE7', color: '#15803D' },
  { bg: '#EDE9FE', color: '#7C3AED' },
  { bg: '#FFEDD5', color: '#C2410C' },
  { bg: '#E0F2FE', color: '#0369A1' },
  { bg: '#FEF3C7', color: '#B45309' },
  { bg: '#FCE7F3', color: '#BE185D' },
  { bg: '#ECFDF5', color: '#047857' },
]

const FALLBACK_PALETTE_DARK: MasterChipColors[] = [
  { bg: '#1E3A8A', color: '#93C5FD' },
  { bg: '#14532D', color: '#86EFAC' },
  { bg: '#4C1D95', color: '#C4B5FD' },
  { bg: '#7C2D12', color: '#FDBA74' },
  { bg: '#0C4A6E', color: '#7DD3FC' },
  { bg: '#78350F', color: '#FCD34D' },
  { bg: '#9D174D', color: '#F9A8D4' },
  { bg: '#065F46', color: '#6EE7B7' },
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return hash
}

function fallbackColors(name: string, mode: 'light' | 'dark'): MasterChipColors {
  const palette = mode === 'dark' ? FALLBACK_PALETTE_DARK : FALLBACK_PALETTE_LIGHT
  return palette[hashName(name.trim().toLowerCase()) % palette.length]
}

/** Map Status Master display names → StatusBadge keys (predefined UI colors). */
const STATUS_NAME_TO_TYPE: Record<string, StatusType> = {
  'execution ongoing': 'execution_ongoing',
  'payment pending': 'payment_pending',
  'at risk': 'at_risk',
  completed: 'completed',
  'on hold': 'archived',
  pitch: 'pitch',
  live: 'live',
  cancelled: 'cancelled',
  archived: 'archived',
  'quotation ready': 'quotation_ready',
  'quotation pending': 'pending',
  delayed: 'delayed',
  'planning in progress': 'planning_in_progress',
  'in progress': 'in_progress',
}

export function getStatusMasterChipColors(
  name: string,
  mode: 'light' | 'dark',
): MasterChipColors {
  const key = name.trim().toLowerCase()
  const statusType = STATUS_NAME_TO_TYPE[key]
  if (statusType) {
    const { bg, text } = getStatusBadgeColors(statusType, mode)
    return { bg, color: text }
  }
  return fallbackColors(name, mode)
}

const RATING_COLORS: Record<string, { light: MasterChipColors; dark: MasterChipColors }> = {
  premium: {
    light: { bg: '#DBEAFE', color: '#1D4ED8' },
    dark: { bg: '#1E3A8A', color: '#93C5FD' },
  },
  luxury: {
    light: { bg: '#EDE9FE', color: '#7C3AED' },
    dark: { bg: '#4C1D95', color: '#C4B5FD' },
  },
  'ultra premium': {
    light: { bg: '#FEF3C7', color: '#B45309' },
    dark: { bg: '#78350F', color: '#FCD34D' },
  },
  standard: {
    light: { bg: '#F3F4F6', color: '#374151' },
    dark: { bg: '#374151', color: '#E5E7EB' },
  },
}

export function getRatingMasterChipColors(
  name: string,
  mode: 'light' | 'dark',
): MasterChipColors {
  const key = name.trim().toLowerCase()
  const pair = RATING_COLORS[key]
  if (pair) {
    return mode === 'dark' ? pair.dark : pair.light
  }
  return fallbackColors(name, mode)
}

/** Lifecycle side-effects when a Status Master value is applied to a project. */
export function lifecycleStatusForMasterName(
  name: string,
): 'Completed' | 'Cancelled' | 'Archived' | null {
  const key = name.trim().toLowerCase()
  if (key === 'completed') return 'Completed'
  if (key === 'cancelled') return 'Cancelled'
  if (key === 'on hold' || key === 'archived') return 'Archived'
  return null
}

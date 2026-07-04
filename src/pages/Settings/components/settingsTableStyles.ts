import { tokens } from '@/design-system/tokens'

export const SETTINGS_ACTION_WIDTH_PX = 96
export const SETTINGS_CELL_PAD_X = '16px'

export function settingsDataColWidth(dataColumnCount: number): string {
  return `calc((100% - ${SETTINGS_ACTION_WIDTH_PX}px) / ${Math.max(dataColumnCount, 1)})`
}

export const SETTINGS_TABLE_HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: '8px',
  px: SETTINGS_CELL_PAD_X,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'middle' as const,
  boxSizing: 'border-box' as const,
}

export const SETTINGS_TABLE_CELL_SX = {
  fontSize: 12,
  py: '7px',
  px: SETTINGS_CELL_PAD_X,
  verticalAlign: 'middle' as const,
  boxSizing: 'border-box' as const,
}

export const SETTINGS_TABLE_HEADER_ACTION_SX = {
  ...SETTINGS_TABLE_HEADER_CELL_SX,
  width: SETTINGS_ACTION_WIDTH_PX,
  minWidth: SETTINGS_ACTION_WIDTH_PX,
  maxWidth: SETTINGS_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
}

export const SETTINGS_TABLE_CELL_ACTION_SX = {
  ...SETTINGS_TABLE_CELL_SX,
  width: SETTINGS_ACTION_WIDTH_PX,
  minWidth: SETTINGS_ACTION_WIDTH_PX,
  maxWidth: SETTINGS_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
}

export const SETTINGS_TABLE_SX = {
  tableLayout: 'fixed' as const,
  width: '100%',
}

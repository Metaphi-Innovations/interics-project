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

/** Fixed-width description cells: respect column width and truncate overflow. */
export const SETTINGS_TABLE_DESCRIPTION_CELL_SX = {
  ...SETTINGS_TABLE_CELL_SX,
  maxWidth: 0,
  overflow: 'hidden',
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
  px: '8px',
}

export const SETTINGS_ACTION_BUTTON_SX = {
  p: '5px',
  color: tokens.color.neutral[400],
  borderRadius: '6px',
  transition: 'color 150ms ease, background-color 150ms ease',
  '&:hover': {
    color: tokens.color.primary[600],
    bgcolor: tokens.color.primary[50],
  },
}

export const SETTINGS_ACTION_BUTTON_DANGER_SX = {
  ...SETTINGS_ACTION_BUTTON_SX,
  '&:hover': {
    color: tokens.color.error[600],
    bgcolor: tokens.color.error[50],
  },
}

export const SETTINGS_ACTIONS_GROUP_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
}

export const SETTINGS_TABLE_SX = {
  tableLayout: 'fixed' as const,
  width: '100%',
}

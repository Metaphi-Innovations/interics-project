import { tokens } from '@/design-system/tokens'

export const ROW_ICON_ACTION_BUTTON_SX = {
  p: '5px',
  color: tokens.color.neutral[400],
  borderRadius: '6px',
  transition: 'color 150ms ease, background-color 150ms ease',
  '&:hover': {
    color: tokens.color.primary[600],
    bgcolor: tokens.color.primary[50],
  },
}

export const ROW_ICON_ACTION_BUTTON_DANGER_SX = {
  ...ROW_ICON_ACTION_BUTTON_SX,
  '&:hover': {
    color: tokens.color.error[600],
    bgcolor: tokens.color.error[50],
  },
}

export const ROW_ICON_ACTIONS_GROUP_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
}

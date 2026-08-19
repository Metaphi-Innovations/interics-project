import Box from '@mui/material/Box'
import TableCell from '@mui/material/TableCell'
import { Power } from 'lucide-react'
import type { ReactNode } from 'react'
import Tooltip from '@/design-system/components/primitives/Tooltip'
import IconButton from '@mui/material/IconButton'
import { tokens } from '@/design-system/tokens'
import {
  RowDeleteAction,
  RowEditAction,
} from '@/components/listing/RowIconActions'
import {
  ROW_ICON_ACTION_BUTTON_SX,
  ROW_ICON_ACTIONS_GROUP_SX,
} from '@/components/listing/rowIconActionStyles'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
} from './settingsTableStyles'

interface SettingsTableActionsCellProps {
  children: ReactNode
}

interface SettingsEditActionProps {
  onClick: () => void
  label?: string
}

interface SettingsDeleteActionProps {
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  label?: string
}

interface SettingsToggleActionProps {
  active: boolean
  onClick: () => void
  activateLabel?: string
  deactivateLabel?: string
}

export function SettingsTableActionsCell({ children }: SettingsTableActionsCellProps) {
  return (
    <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
      <Box sx={ROW_ICON_ACTIONS_GROUP_SX}>{children}</Box>
    </TableCell>
  )
}

export function SettingsEditAction({ onClick, label = 'Edit' }: SettingsEditActionProps) {
  return <RowEditAction onClick={onClick} label={label} />
}

export function SettingsDeleteAction({
  onClick,
  disabled = false,
  disabledReason,
  label = 'Delete',
}: SettingsDeleteActionProps) {
  return (
    <RowDeleteAction
      onClick={onClick}
      disabled={disabled}
      disabledReason={disabledReason}
      label={label}
    />
  )
}

export function SettingsToggleAction({
  active,
  onClick,
  activateLabel = 'Activate',
  deactivateLabel = 'Deactivate',
}: SettingsToggleActionProps) {
  const label = active ? deactivateLabel : activateLabel
  const button = (
    <IconButton
      size="small"
      onClick={onClick}
      aria-label={label}
      sx={ROW_ICON_ACTION_BUTTON_SX}
    >
      <Power
        size={14}
        strokeWidth={2}
        color={active ? tokens.color.success[600] : tokens.color.neutral[400]}
      />
    </IconButton>
  )

  return (
    <Tooltip content={label} placement="top">
      {button}
    </Tooltip>
  )
}

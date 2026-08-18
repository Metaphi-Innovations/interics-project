import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import TableCell from '@mui/material/TableCell'
import { Pencil, Trash2, Power } from 'lucide-react'
import type { ReactNode } from 'react'
import Tooltip from '@/design-system/components/primitives/Tooltip'
import { tokens } from '@/design-system/tokens'
import {
  SETTINGS_ACTION_BUTTON_DANGER_SX,
  SETTINGS_ACTION_BUTTON_SX,
  SETTINGS_ACTIONS_GROUP_SX,
  SETTINGS_TABLE_CELL_ACTION_SX,
} from './settingsTableStyles'

interface SettingsTableActionsCellProps {
  children: ReactNode
}

interface SettingsActionButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  variant?: 'default' | 'danger'
  icon?: ReactNode
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

function SettingsActionButton({
  label,
  onClick,
  disabled = false,
  disabledReason,
  variant = 'default',
  icon,
}: SettingsActionButtonProps) {
  const tooltip = disabled && disabledReason ? disabledReason : label
  const button = (
    <IconButton
      size="small"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      sx={variant === 'danger' ? SETTINGS_ACTION_BUTTON_DANGER_SX : SETTINGS_ACTION_BUTTON_SX}
    >
      {icon}
    </IconButton>
  )

  return (
    <Tooltip content={tooltip} placement="top" disabled={!tooltip}>
      {disabled ? <span>{button}</span> : button}
    </Tooltip>
  )
}

export function SettingsTableActionsCell({ children }: SettingsTableActionsCellProps) {
  return (
    <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
      <Box sx={SETTINGS_ACTIONS_GROUP_SX}>{children}</Box>
    </TableCell>
  )
}

export function SettingsEditAction({ onClick, label = 'Edit' }: SettingsEditActionProps) {
  return (
    <SettingsActionButton
      label={label}
      onClick={onClick}
      icon={<Pencil size={14} strokeWidth={2} />}
    />
  )
}

export function SettingsDeleteAction({
  onClick,
  disabled = false,
  disabledReason,
  label = 'Delete',
}: SettingsDeleteActionProps) {
  return (
    <SettingsActionButton
      label={label}
      onClick={onClick}
      disabled={disabled}
      disabledReason={disabledReason}
      variant="danger"
      icon={<Trash2 size={14} strokeWidth={2} />}
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

  return (
    <SettingsActionButton
      label={label}
      onClick={onClick}
      icon={
        <Power
          size={14}
          strokeWidth={2}
          color={active ? tokens.color.success[600] : tokens.color.neutral[400]}
        />
      }
    />
  )
}

import IconButton from '@mui/material/IconButton'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import Tooltip from '@/design-system/components/primitives/Tooltip'
import {
  ROW_ICON_ACTION_BUTTON_DANGER_SX,
  ROW_ICON_ACTION_BUTTON_SX,
  ROW_ICON_ACTIONS_GROUP_SX,
} from './rowIconActionStyles'
import Box from '@mui/material/Box'

interface RowIconActionButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  variant?: 'default' | 'danger'
  icon: ReactNode
}

function RowIconActionButton({
  label,
  onClick,
  disabled = false,
  disabledReason,
  variant = 'default',
  icon,
}: RowIconActionButtonProps) {
  const tooltip = disabled && disabledReason ? disabledReason : label
  const button = (
    <IconButton
      size="small"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      sx={variant === 'danger' ? ROW_ICON_ACTION_BUTTON_DANGER_SX : ROW_ICON_ACTION_BUTTON_SX}
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

export function RowViewAction({ onClick, label = 'View' }: { onClick: () => void; label?: string }) {
  return (
    <RowIconActionButton
      label={label}
      onClick={onClick}
      icon={<Eye size={14} strokeWidth={2} />}
    />
  )
}

export function RowEditAction({ onClick, label = 'Edit' }: { onClick: () => void; label?: string }) {
  return (
    <RowIconActionButton
      label={label}
      onClick={onClick}
      icon={<Pencil size={14} strokeWidth={2} />}
    />
  )
}

export function RowDeleteAction({
  onClick,
  disabled = false,
  disabledReason,
  label = 'Delete',
}: {
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  label?: string
}) {
  return (
    <RowIconActionButton
      label={label}
      onClick={onClick}
      disabled={disabled}
      disabledReason={disabledReason}
      variant="danger"
      icon={<Trash2 size={14} strokeWidth={2} />}
    />
  )
}

export function RowIconActionsGroup({ children }: { children: ReactNode }) {
  return <Box sx={ROW_ICON_ACTIONS_GROUP_SX}>{children}</Box>
}

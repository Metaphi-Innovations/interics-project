import { Chip } from '@mui/material'

export type StatusType =
  | 'live'
  | 'active'
  | 'pitch'
  | 'draft'
  | 'completed'
  | 'cancelled'
  | 'archived'
  | 'in_progress'
  | 'execution_ongoing'
  | 'inactive'
  | 'pending'
  | 'at_risk'
  | 'delayed'

export interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'small' | 'medium'
}

type StatusConfig = {
  label: string
  bg: string
  color: string
  border: string
}

const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  active:             { label: 'Active',            bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  live:               { label: 'Live',              bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  pitch:              { label: 'Pitch',             bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  draft:              { label: 'Draft',             bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  pending:            { label: 'Pending',           bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  completed:          { label: 'Completed',         bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
  cancelled:          { label: 'Cancelled',         bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  at_risk:            { label: 'At Risk',           bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  delayed:            { label: 'Delayed',           bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  archived:           { label: 'Archived',          bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  inactive:           { label: 'Inactive',          bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  in_progress:        { label: 'In Progress',       bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' },
  execution_ongoing:  { label: 'Execution Ongoing', bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' },
}

export default function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive
  const displayLabel = label ?? config.label

  return (
    <Chip
      label={displayLabel}
      size={size}
      sx={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        fontSize: '11px',
        fontWeight: 600,
        height: '22px',
        borderRadius: '999px',
        '& .MuiChip-label': { px: '8px' },
      }}
    />
  )
}

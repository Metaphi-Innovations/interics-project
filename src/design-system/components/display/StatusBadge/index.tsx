import { Chip } from '@mui/material'
import { tokens } from '@/design-system/tokens'

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
  | 'payment_pending'
  /** Invoice receivables (grey draft — distinct from amber `draft` for projects) */
  | 'invoice_draft'
  | 'sent'
  | 'unpaid'
  | 'partially_paid'
  | 'overdue'
  | 'paid'
  /** Vendor PO issued (commitment active) */
  | 'issued'

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
  payment_pending:    { label: 'Payment Pending',   bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  archived:           { label: 'Archived',          bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  inactive:           { label: 'Inactive',          bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  in_progress:        { label: 'In Progress',       bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' },
  execution_ongoing:  { label: 'Execution Ongoing', bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' },
  invoice_draft:      { label: 'Draft',             bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  sent:               { label: 'Sent',              bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
  unpaid:             { label: 'Unpaid',            bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  partially_paid:     { label: 'Partially Paid',    bg: '#F3E8FF', color: '#7C3AED', border: '#E9D5FF' },
  overdue:            { label: 'Overdue',           bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  paid:               { label: 'Paid',              bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  issued:             { label: 'Issued',            bg: tokens.color.info[100], color: tokens.color.info[800], border: tokens.color.info[200] },
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

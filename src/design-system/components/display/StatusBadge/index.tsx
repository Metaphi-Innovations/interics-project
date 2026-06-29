import { Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'

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
  | 'invoice_draft'
  | 'sent'
  | 'unpaid'
  | 'partially_paid'
  | 'overdue'
  | 'paid'
  | 'tax'
  | 'issued'
  | 'filed'
  | 'partial'
  | 'mapped'
  | 'unmapped'
  | 'planning_in_progress'
  | 'quotation_ready'
  | 'additional'
  | 'vendor_linked'
  | 'common'
  | 'included_in_payment'
  | 'adjusted'
  | 'settled'

export interface StatusBadgeColors {
  bg: string
  text: string
}

/** Light-surface palette (product spec). */
export const STATUS_COLORS_LIGHT: Record<StatusType, StatusBadgeColors> = {
  live: { bg: '#DCFCE7', text: '#15803D' },
  pitch: { bg: '#FEF3C7', text: '#B45309' },
  completed: { bg: '#DBEAFE', text: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', text: '#B91C1C' },
  archived: { bg: '#F3F4F6', text: '#374151' },
  execution_ongoing: { bg: '#E0F2FE', text: '#0369A1' },
  quotation_ready: { bg: '#CCFBF1', text: '#0F766E' },
  payment_pending: { bg: '#FEF3C7', text: '#B45309' },
  at_risk: { bg: '#FEE2E2', text: '#B91C1C' },
  delayed: { bg: '#FEE2E2', text: '#B91C1C' },
  planning_in_progress: { bg: '#EDE9FE', text: '#7C3AED' },
  active: { bg: '#DCFCE7', text: '#15803D' },
  inactive: { bg: '#F3F4F6', text: '#374151' },
  pending: { bg: '#FEF3C7', text: '#B45309' },
  paid: { bg: '#DCFCE7', text: '#15803D' },
  overdue: { bg: '#FEE2E2', text: '#B91C1C' },
  sent: { bg: '#DBEAFE', text: '#1D4ED8' },
  draft: { bg: '#F3F4F6', text: '#374151' },
  tax: { bg: '#DBEAFE', text: '#1D4ED8' },
  partially_paid: { bg: '#E0F2FE', text: '#0369A1' },
  unpaid: { bg: '#FEF3C7', text: '#B45309' },
  additional: { bg: '#F3F4F6', text: '#374151' },
  vendor_linked: { bg: '#DBEAFE', text: '#1D4ED8' },
  common: { bg: '#EDE9FE', text: '#7C3AED' },
  included_in_payment: { bg: '#DCFCE7', text: '#15803D' },
  adjusted: { bg: '#E0F2FE', text: '#0369A1' },
  settled: { bg: '#DCFCE7', text: '#15803D' },
  // Aliases — same semantics as spec-adjacent types
  in_progress: { bg: '#E0F2FE', text: '#0369A1' },
  invoice_draft: { bg: '#F3F4F6', text: '#374151' },
  issued: { bg: '#DBEAFE', text: '#1D4ED8' },
  filed: { bg: '#DCFCE7', text: '#15803D' },
  partial: { bg: '#FEF3C7', text: '#B45309' },
  mapped: { bg: '#DCFCE7', text: '#15803D' },
  unmapped: { bg: '#FEF3C7', text: '#B45309' },
}

/** Dark-surface palette — readable on `background.paper` in dark mode. */
export const STATUS_COLORS_DARK: Record<StatusType, StatusBadgeColors> = {
  live: { bg: '#14532D', text: '#86EFAC' },
  pitch: { bg: '#78350F', text: '#FCD34D' },
  completed: { bg: '#1E3A8A', text: '#93C5FD' },
  cancelled: { bg: '#7F1D1D', text: '#FCA5A5' },
  archived: { bg: '#374151', text: '#E5E7EB' },
  execution_ongoing: { bg: '#0C4A6E', text: '#7DD3FC' },
  quotation_ready: { bg: '#134E4A', text: '#5EEAD4' },
  payment_pending: { bg: '#78350F', text: '#FCD34D' },
  at_risk: { bg: '#7F1D1D', text: '#FCA5A5' },
  delayed: { bg: '#7F1D1D', text: '#FCA5A5' },
  planning_in_progress: { bg: '#4C1D95', text: '#C4B5FD' },
  active: { bg: '#14532D', text: '#86EFAC' },
  inactive: { bg: '#374151', text: '#E5E7EB' },
  pending: { bg: '#78350F', text: '#FCD34D' },
  paid: { bg: '#14532D', text: '#86EFAC' },
  overdue: { bg: '#7F1D1D', text: '#FCA5A5' },
  sent: { bg: '#1E3A8A', text: '#93C5FD' },
  draft: { bg: '#374151', text: '#E5E7EB' },
  tax: { bg: '#1E3A8A', text: '#93C5FD' },
  partially_paid: { bg: '#0C4A6E', text: '#7DD3FC' },
  unpaid: { bg: '#78350F', text: '#FCD34D' },
  additional: { bg: '#374151', text: '#E5E7EB' },
  vendor_linked: { bg: '#1E3A8A', text: '#93C5FD' },
  common: { bg: '#4C1D95', text: '#C4B5FD' },
  included_in_payment: { bg: '#14532D', text: '#86EFAC' },
  adjusted: { bg: '#0C4A6E', text: '#7DD3FC' },
  settled: { bg: '#14532D', text: '#86EFAC' },
  in_progress: { bg: '#0C4A6E', text: '#7DD3FC' },
  invoice_draft: { bg: '#374151', text: '#E5E7EB' },
  issued: { bg: '#1E3A8A', text: '#93C5FD' },
  filed: { bg: '#14532D', text: '#86EFAC' },
  partial: { bg: '#78350F', text: '#FCD34D' },
  mapped: { bg: '#14532D', text: '#86EFAC' },
  unmapped: { bg: '#78350F', text: '#FCD34D' },
}

export function getStatusBadgeColors(
  status: StatusType,
  mode: 'light' | 'dark',
): StatusBadgeColors {
  return mode === 'dark' ? STATUS_COLORS_DARK[status] : STATUS_COLORS_LIGHT[status]
}

export interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'small' | 'medium'
}

const STATUS_LABEL: Record<StatusType, string> = {
  active: 'Active',
  live: 'Live',
  paid: 'Paid',
  pitch: 'Pitch',
  draft: 'Draft',
  pending: 'Pending',
  unpaid: 'Unpaid',
  payment_pending: 'Payment Pending',
  cancelled: 'Cancelled',
  at_risk: 'At Risk',
  delayed: 'Delayed',
  overdue: 'Overdue',
  completed: 'Completed',
  tax: 'Tax',
  sent: 'Sent',
  issued: 'Issued',
  in_progress: 'In Progress',
  execution_ongoing: 'Execution Ongoing',
  partially_paid: 'Partially Paid',
  archived: 'Archived',
  inactive: 'Inactive',
  invoice_draft: 'Draft',
  filed: 'Filed',
  partial: 'Partial',
  mapped: 'Mapped',
  unmapped: 'Unmapped',
  planning_in_progress: 'Planning In Progress',
  quotation_ready: 'Quotation Ready',
  additional: 'Additional',
  vendor_linked: 'Vendor Linked',
  common: 'Common',
  included_in_payment: 'Included in Payment',
  adjusted: 'Adjusted',
  settled: 'Settled',
}

export default function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const theme = useTheme()
  const mode = theme.palette.mode === 'dark' ? 'dark' : 'light'
  const { bg, text } = getStatusBadgeColors(status, mode)
  const displayLabel = label ?? STATUS_LABEL[status] ?? status

  return (
    <Chip
      label={displayLabel}
      size={size}
      sx={{
        backgroundColor: bg,
        color: text,
        border: 'none',
        fontSize: '11px',
        fontWeight: 600,
        height: 'auto',
        minHeight: 22,
        borderRadius: '20px',
        '& .MuiChip-label': {
          px: '10px',
          py: '2px',
        },
      }}
    />
  )
}

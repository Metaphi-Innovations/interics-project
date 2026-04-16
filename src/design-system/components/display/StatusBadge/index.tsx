import { Chip } from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'

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
  /** Compliance — return filed */
  | 'filed'
  /** Compliance — partial filing */
  | 'partial'
  /** Compliance — TDS mapped to challan */
  | 'mapped'
  /** Compliance — TDS not mapped */
  | 'unmapped'

export interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'small' | 'medium'
}

type StatusSemantic = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'secondary'

const STATUS_SEMANTIC: Record<StatusType, StatusSemantic> = {
  active:            'success',
  live:              'success',
  paid:              'success',
  pitch:             'warning',
  draft:             'warning',
  pending:           'warning',
  unpaid:            'warning',
  payment_pending:   'warning',
  cancelled:         'error',
  at_risk:           'error',
  delayed:           'error',
  overdue:           'error',
  completed:         'info',
  sent:              'info',
  issued:            'info',
  in_progress:       'primary',
  execution_ongoing: 'primary',
  partially_paid:    'secondary',
  archived:          'neutral',
  inactive:          'neutral',
  invoice_draft:     'neutral',
  filed:             'success',
  partial:           'neutral',
  mapped:            'success',
  unmapped:          'warning',
}

const STATUS_LABEL: Record<StatusType, string> = {
  active:            'Active',
  live:              'Live',
  paid:              'Paid',
  pitch:             'Pitch',
  draft:             'Draft',
  pending:           'Pending',
  unpaid:            'Unpaid',
  payment_pending:   'Payment Pending',
  cancelled:         'Cancelled',
  at_risk:           'At Risk',
  delayed:           'Delayed',
  overdue:           'Overdue',
  completed:         'Completed',
  sent:              'Sent',
  issued:            'Issued',
  in_progress:       'In Progress',
  execution_ongoing: 'Execution Ongoing',
  partially_paid:    'Partially Paid',
  archived:          'Archived',
  inactive:          'Inactive',
  invoice_draft:     'Draft',
  filed:             'Filed',
  partial:           'Partial',
  mapped:            'Mapped',
  unmapped:          'Unmapped',
}

export default function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const theme = useTheme()
  const semantic = STATUS_SEMANTIC[status] ?? 'neutral'
  const displayLabel = label ?? STATUS_LABEL[status] ?? status

  let mainColor: string
  switch (semantic) {
    case 'success':   mainColor = theme.palette.success.main; break
    case 'warning':   mainColor = theme.palette.warning.main; break
    case 'error':     mainColor = theme.palette.error.main; break
    case 'info':      mainColor = theme.palette.info.main; break
    case 'primary':   mainColor = theme.palette.primary.main; break
    case 'secondary': mainColor = theme.palette.secondary?.main ?? '#7C3AED'; break
    default:          mainColor = theme.palette.text.secondary; break
  }

  const bg = semantic === 'neutral'
    ? alpha(theme.palette.text.secondary, 0.1)
    : alpha(mainColor, 0.12)

  const border = semantic === 'neutral'
    ? alpha(theme.palette.text.secondary, 0.2)
    : alpha(mainColor, 0.25)

  const color = semantic === 'neutral' ? theme.palette.text.secondary : mainColor

  return (
    <Chip
      label={displayLabel}
      size={size}
      sx={{
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        fontSize: '11px',
        fontWeight: 600,
        height: '22px',
        borderRadius: '999px',
        '& .MuiChip-label': { px: '8px' },
      }}
    />
  )
}

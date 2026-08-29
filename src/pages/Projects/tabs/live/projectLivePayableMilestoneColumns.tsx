import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { tokens } from '@/design-system/tokens'
import { formatDate, formatInr } from '@/utils/formatters'
import { MONEY_EPS } from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import type {
  PayableMilestoneDisplayAmounts,
  PayableMilestoneDisplayPaymentSummary,
} from './projectLivePayableMilestoneDisplay'

export function PayableAmountBreakdownColumn({
  base,
  tdsRate,
  tdsAmount,
  net,
}: PayableMilestoneDisplayAmounts) {
  return (
    <Stack gap={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Base: ₹{formatInr(base)}
      </Typography>
      {tdsAmount > 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          TDS ({tdsRate ?? 0}%): −₹{formatInr(tdsAmount)}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Net: ₹{formatInr(net)}
      </Typography>
    </Stack>
  )
}

export function PayableInvoiceDetailsColumn({
  invoiceNumber,
  invoiceDate,
  onView,
}: {
  invoiceNumber: string
  invoiceDate: string
  onView: () => void
}) {
  return (
    <Stack gap={0.25}>
      <Typography
        variant="body2"
        onClick={onView}
        sx={{
          color: 'primary.main',
          cursor: 'pointer',
          fontWeight: 500,
          lineHeight: 1.35,
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        {invoiceNumber}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {formatDate(invoiceDate)}
      </Typography>
    </Stack>
  )
}

export function PayablePaymentSummaryColumn({
  tds,
  paid,
  outstanding,
}: PayableMilestoneDisplayPaymentSummary) {
  const outstandingColor =
    outstanding > MONEY_EPS ? tokens.color.error[600] : tokens.color.success[600]
  return (
    <Stack gap={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        TDS: ₹{formatInr(tds)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Paid: ₹{formatInr(paid)}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: outstandingColor }}>
        Outstanding: ₹{formatInr(outstanding)}
      </Typography>
    </Stack>
  )
}

export function PayableDueDateCell({
  dueDate,
  overdue,
}: {
  dueDate: string | null
  overdue: boolean
}) {
  return (
    <Typography
      variant="body2"
      color={dueDate ? (overdue ? 'error.main' : 'text.primary') : 'text.disabled'}
    >
      {dueDate ? formatDate(dueDate) : '—'}
    </Typography>
  )
}

export function PayableStatusCell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {children}
    </Box>
  )
}

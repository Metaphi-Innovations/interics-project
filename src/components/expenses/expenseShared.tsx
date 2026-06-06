import { Box, Stack, Typography } from '@mui/material'
import { Modal, StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import type { Expense, ExpenseType } from '@/slices/live/types'
import { formatCurrency, formatDate } from '@/utils/formatters'

export function expenseStatusDisplay(
  status: Expense['status'],
): { status: StatusType; label: string } {
  switch (status) {
    case 'pending':
      return { status: 'pending', label: 'Pending' }
    case 'included_in_payment':
      return { status: 'included_in_payment', label: 'Included in Payment' }
  }
}

export function ExpenseTypeBadge({ type }: { type: ExpenseType }) {
  switch (type) {
    case 'additional':
      return <StatusBadge status="additional" size="small" />
    case 'vendor_linked':
      return <StatusBadge status="vendor_linked" size="small" />
    case 'common':
      return <StatusBadge status="common" size="small" />
    case 'office_expenses':
      return <StatusBadge status="draft" label="Office Expenses" size="small" />
    case 'reimbursable_expenses':
      return <StatusBadge status="sent" label="Reimbursable Expenses" size="small" />
  }
}

export function expenseVendorCell(e: Expense): string {
  if (e.type === 'additional' || e.type === 'office_expenses') return '—'
  if (e.type === 'vendor_linked' || e.type === 'reimbursable_expenses') return e.vendorName ?? '—'
  const n = e.vendorAllocations?.length ?? 0
  return n === 0 ? '—' : `${n} vendors`
}

export function expenseServiceCell(e: Expense): string {
  if (e.type === 'vendor_linked' || e.type === 'reimbursable_expenses') return e.serviceName ?? '—'
  return '—'
}

export function ExpenseSummaryStrip({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const additional = expenses.filter((e) => e.type === 'additional').reduce((s, e) => s + e.amount, 0)
  const vendorLinked = expenses
    .filter((e) => e.type === 'vendor_linked')
    .reduce((s, e) => s + e.amount, 0)
  const common = expenses.filter((e) => e.type === 'common').reduce((s, e) => s + e.amount, 0)

  const metrics = [
    { label: 'Total Expenses', value: total },
    { label: 'Additional', value: additional },
    { label: 'Vendor Linked', value: vendorLinked },
    { label: 'Common', value: common },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 2,
      }}
    >
      {metrics.map((m) => (
        <Box
          key={m.label}
          sx={{
            p: 2,
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
          >
            {m.label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, mt: 0.5 }}>
            ₹{formatCurrency(m.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

export function ViewExpenseModal({
  open,
  expense,
  onClose,
  projectName,
}: {
  open: boolean
  expense: Expense | null
  onClose: () => void
  /** When set (e.g. global expenses page), shown in details */
  projectName?: string
}) {
  if (!expense) return null

  const locked = expense.status === 'included_in_payment'

  return (
    <Modal open={open} onClose={onClose} title="Expense details" size="sm">
      <Stack gap={2} sx={{ py: 1 }}>
        {locked && (
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
            This expense is included in a payment run and cannot be edited.
          </Typography>
        )}
        {projectName != null && projectName !== '' && (
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Project
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {projectName}
            </Typography>
          </Stack>
        )}
        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Type
          </Typography>
          <Box>
            <ExpenseTypeBadge type={expense.type} />
          </Box>
        </Stack>
        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Description
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {expense.description}
          </Typography>
        </Stack>
        <Stack direction="row" gap={4} flexWrap="wrap">
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Amount
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
              ₹{formatCurrency(expense.amount)}
            </Typography>
          </Stack>
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Date
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {formatDate(expense.date)}
            </Typography>
          </Stack>
        </Stack>
        {(expense.type === 'vendor_linked' ||
          expense.type === 'reimbursable_expenses' ||
          expense.type === 'common') && (
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Vendor / Service
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {expense.type === 'vendor_linked' || expense.type === 'reimbursable_expenses' ? (
                <>
                  {expense.vendorName ?? '—'} · {expense.serviceName ?? '—'}
                </>
              ) : (
                `${expense.vendorAllocations?.length ?? 0} vendors (common split)`
              )}
            </Typography>
          </Stack>
        )}
        {(expense.milestoneName || expense.milestoneId) && (
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Milestone (reference)
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {expense.milestoneName ?? expense.milestoneId}
            </Typography>
          </Stack>
        )}
        {expense.type === 'common' && expense.vendorAllocations && expense.vendorAllocations.length > 0 && (
          <Box
            sx={{
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 2,
              p: 2,
              bgcolor: tokens.color.neutral[50],
            }}
          >
            <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700 }}>
              Allocation
            </Typography>
            {expense.vendorAllocations.map((row) => (
              <Stack
                key={row.vendorId}
                direction="row"
                justifyContent="space-between"
                sx={{ mt: 1 }}
              >
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {row.vendorName}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {row.allocationPercent}% · ₹{formatCurrency(row.allocationAmount)}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
          <StatusBadge
            status={expenseStatusDisplay(expense.status).status}
            label={expenseStatusDisplay(expense.status).label}
            size="small"
          />
        </Stack>
      </Stack>
    </Modal>
  )
}

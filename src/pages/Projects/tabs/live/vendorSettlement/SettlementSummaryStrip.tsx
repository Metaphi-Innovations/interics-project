import { Box, Typography } from '@mui/material'
import { tokens } from '@/design-system/tokens'
import type { VendorInvoice, VendorPayment } from '@/slices/live/reducer'
import { formatCurrency } from '@/utils/formatters'

export function SettlementSummaryStrip({
  vendorInvoices,
  payments,
}: {
  vendorInvoices: VendorInvoice[]
  payments: VendorPayment[]
}) {
  const totalPayable = vendorInvoices.reduce((s, v) => s + v.baseAmount, 0)
  const totalPaid = payments.reduce((s, p) => s + p.netPaid, 0)
  const pendingSettlement = totalPayable - totalPaid
  const adjustments = payments.reduce((s, p) => s + p.reimbursementAdditions, 0)

  const metrics = [
    { label: 'Total Payable', value: totalPayable },
    { label: 'Total Paid', value: totalPaid, highlight: true },
    {
      label: 'Pending Settlement',
      value: pendingSettlement,
      color: pendingSettlement > 0 ? 'warning.main' : 'success.main',
    },
    { label: 'Adjustments', value: adjustments },
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
            bgcolor: m.highlight ? tokens.color.primary[50] : 'background.paper',
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
          >
            {m.label}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: 15,
              mt: 0.5,
              color: m.color ?? (m.highlight ? 'primary.main' : 'text.primary'),
            }}
          >
            ₹{formatCurrency(m.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

import type { ReactNode } from 'react'
import { Box } from '@mui/material'
import { Banknote, CircleCheck, Clock, SlidersHorizontal } from 'lucide-react'
import { KpiStatCard } from '@/components/templates/KpiStatCard'
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

  const metrics: {
    label: string
    value: string
    variant: 'default' | 'success' | 'warning' | 'teal'
    icon: ReactNode
  }[] = [
    {
      label: 'TOTAL PAYABLE',
      value: `₹${formatCurrency(totalPayable)}`,
      variant: 'default',
      icon: <Banknote size={24} strokeWidth={1.75} />,
    },
    {
      label: 'TOTAL PAID',
      value: `₹${formatCurrency(totalPaid)}`,
      variant: 'success',
      icon: <CircleCheck size={24} strokeWidth={1.75} />,
    },
    {
      label: 'PENDING SETTLEMENT',
      value: `₹${formatCurrency(pendingSettlement)}`,
      variant: 'warning',
      icon: <Clock size={24} strokeWidth={1.75} />,
    },
    {
      label: 'ADJUSTMENTS',
      value: `₹${formatCurrency(adjustments)}`,
      variant: 'teal',
      icon: <SlidersHorizontal size={24} strokeWidth={1.75} />,
    },
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
        <KpiStatCard
          key={m.label}
          label={m.label}
          value={m.value}
          variant={m.variant}
          icon={m.icon}
        />
      ))}
    </Box>
  )
}

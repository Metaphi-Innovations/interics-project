import type { ReactNode } from 'react'
import { Box } from '@mui/material'
import { Banknote, CircleCheck, Clock } from 'lucide-react'
import { KpiStatCard } from '@/components/templates/KpiStatCard'
import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorPayment } from '@/slices/live/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  computePayableSummaryKpis,
  type PayableSummaryKpis,
} from '@/pages/Finance/utils/payableSummary'

export function SettlementSummaryStrip({
  kpis: kpisProp,
  vendorPOs,
  payments,
}: {
  /** Prefer server summary from GET /finance/payables/summary. */
  kpis?: PayableSummaryKpis | null
  vendorPOs?: VendorPO[]
  payments?: VendorPayment[]
}) {
  const kpis =
    kpisProp ??
    computePayableSummaryKpis(vendorPOs ?? [], payments ?? [])

  const metrics: {
    label: string
    value: string
    variant: 'default' | 'success' | 'warning'
    icon: ReactNode
  }[] = [
    {
      label: 'Total Vendor Offer',
      value: `₹${formatCurrency(kpis.totalVendorPoValue)}`,
      variant: 'default',
      icon: <Banknote size={24} strokeWidth={1.75} />,
    },
    {
      label: 'Paid Till Date',
      value: `₹${formatCurrency(kpis.paidTillDate)}`,
      variant: 'success',
      icon: <CircleCheck size={24} strokeWidth={1.75} />,
    },
    {
      label: 'Remaining',
      value: `₹${formatCurrency(kpis.pendingPayment)}`,
      variant: 'warning',
      icon: <Clock size={24} strokeWidth={1.75} />,
    },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
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

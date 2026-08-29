import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorPayment } from '@/slices/live/types'
import type { VendorInvoice } from '@/slices/live/types'
import { vendorPoExecutableAmount } from '@/pages/Projects/tabs/live/vendorPOHelpers'

export interface PayableSummaryKpis {
  /** Sum of Live Vendor Offer / Executable values (invoice-aware). */
  totalVendorPoValue: number
  /** Sum of Vendor PO milestone values marked Paid. */
  paidTillDate: number
  /** Remaining: Total Vendor Offer − Paid Till Date. */
  pendingPayment: number
}

/**
 * Client-side fallback KPI rollup (prefer GET /finance/payables/summary).
 * Total uses the same invoice-aware Executable Value as Live Overview / Payables.
 */
export function computePayableSummaryKpis(
  vendorPOs: Array<
    Pick<
      VendorPO,
      'id' | 'projectId' | 'vendorId' | 'poValue' | 'executedValue' | 'milestones' | 'linkedBaselineServiceIds'
    > & { milestones?: VendorPO['milestones'] }
  >,
  payments: Array<Pick<VendorPayment, 'netPaid'>> = [],
  vendorInvoices: VendorInvoice[] = [],
): PayableSummaryKpis {
  const totalVendorPoValue = vendorPOs.reduce(
    (s, po) => s + vendorPoExecutableAmount(po, vendorInvoices),
    0,
  )

  let paidFromMilestones = 0
  let hasMilestoneStatuses = false
  for (const po of vendorPOs) {
    for (const m of po.milestones ?? []) {
      hasMilestoneStatuses = true
      if (String(m.status).toLowerCase() === 'paid') {
        paidFromMilestones += Number(m.value ?? 0)
      }
    }
  }

  const paidTillDate = hasMilestoneStatuses
    ? paidFromMilestones
    : payments.reduce((s, p) => s + (p.netPaid ?? 0), 0)
  const pendingPayment = Math.max(0, totalVendorPoValue - paidTillDate)

  return {
    totalVendorPoValue,
    paidTillDate,
    pendingPayment,
  }
}

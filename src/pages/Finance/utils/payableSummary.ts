import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorPayment } from '@/slices/live/types'
import { vendorPoEffectiveValue } from '@/pages/Projects/tabs/live/vendorPOHelpers'

export interface PayableSummaryKpis {
  /** Sum of Live Vendor PO / offer values across projects. */
  totalVendorPoValue: number
  /** Sum of Vendor PO milestone values marked Paid. */
  paidTillDate: number
  /** Remaining: Total Vendor Offer − Paid Till Date. */
  pendingPayment: number
}

/**
 * Client-side fallback KPI rollup (prefer GET /finance/payables/summary).
 * Paid Till Date uses paid milestone values on Vendor POs when present;
 * otherwise falls back to payment netPaid (legacy).
 */
export function computePayableSummaryKpis(
  vendorPOs: Array<
    Pick<VendorPO, 'poValue' | 'executedValue'> & { milestones?: VendorPO['milestones'] }
  >,
  payments: Array<Pick<VendorPayment, 'netPaid'>> = [],
): PayableSummaryKpis {
  const totalVendorPoValue = vendorPOs.reduce((s, po) => s + vendorPoEffectiveValue(po), 0)

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

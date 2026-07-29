import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorPayment } from '@/slices/live/types'
import { vendorPoEffectiveValue } from '@/pages/Projects/tabs/live/vendorPOHelpers'

export interface PayableSummaryKpis {
  /** Sum of Vendor PO values across projects. */
  totalVendorPoValue: number
  /** Sum of net amounts paid to vendors. */
  paidTillDate: number
  /** Remaining payable: Total Vendor PO Value − Paid Till Date. */
  pendingPayment: number
}

/**
 * Payable dashboard summary KPIs from Vendor POs and payment records.
 * Pending Payment always equals Total Vendor PO Value − Paid Till Date.
 */
export function computePayableSummaryKpis(
  vendorPOs: Array<Pick<VendorPO, 'poValue' | 'executedValue'>>,
  payments: Array<Pick<VendorPayment, 'netPaid'>>,
): PayableSummaryKpis {
  const totalVendorPoValue = vendorPOs.reduce((s, po) => s + vendorPoEffectiveValue(po), 0)
  const paidTillDate = payments.reduce((s, p) => s + (p.netPaid ?? 0), 0)
  const pendingPayment = Math.max(0, totalVendorPoValue - paidTillDate)

  return {
    totalVendorPoValue,
    paidTillDate,
    pendingPayment,
  }
}

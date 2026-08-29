import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'
import type { VendorPOMilestoneOverviewRow } from '@/pages/Projects/tabs/live/vendorPOHelpers'
import {
  vendorInvoiceOutstanding,
  vendorInvoicePaidAmount,
} from '@/pages/Projects/tabs/live/vendorProjectLivePayableStatus'

export interface PayableMilestoneDisplayAmounts {
  base: number
  tdsRate: number | null
  tdsAmount: number
  net: number
}

export interface PayableMilestoneDisplayPaymentSummary {
  tds: number
  paid: number
  outstanding: number
}

export function resolvePayableMilestoneDueDate(
  invoice: VendorInvoice | undefined,
  vendorPo: VendorPO | undefined,
  milestoneId: string,
): string | null {
  if (invoice?.dueDate?.trim()) return invoice.dueDate
  const milestone = vendorPo?.milestones?.find((m) => m.id === milestoneId)
  return milestone?.dueDate ?? null
}

export function resolvePayableMilestoneAmounts(
  row: VendorPOMilestoneOverviewRow,
  invoice: VendorInvoice | undefined,
  _vendorPo: VendorPO | undefined,
): PayableMilestoneDisplayAmounts {
  if (invoice) {
    return {
      base: invoice.baseAmount,
      tdsRate: invoice.tdsRate,
      tdsAmount: invoice.tdsAmount,
      net: invoice.netPayable,
    }
  }

  const base = row.amount
  return {
    base,
    tdsRate: null,
    tdsAmount: 0,
    net: base,
  }
}

export function resolvePayableMilestonePaymentSummary(
  invoice: VendorInvoice | undefined,
  payments: VendorPayment[],
): PayableMilestoneDisplayPaymentSummary | null {
  if (!invoice) return null
  const paid = vendorInvoicePaidAmount(invoice.id, payments)
  return {
    tds: invoice.tdsAmount,
    paid,
    outstanding: vendorInvoiceOutstanding(invoice, payments),
  }
}

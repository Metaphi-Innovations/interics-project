import type { Baseline } from '@/slices/baseline/reducer'
import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'
import type { Service } from '@/slices/settings/reducer'
import type { VendorPOMilestoneOverviewRow } from '@/pages/Projects/tabs/live/vendorPOHelpers'
import {
  vendorMilestonePayableTaxBreakdown,
  resolveVendorMilestoneServiceId,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import { resolveVendorPoMilestoneSnapshot } from '@/pages/Projects/tabs/live/poSnapshotUtils'
import {
  getVendorInvoiceMilestoneNet,
  type FlatVendorMilestone,
} from '@/pages/Finance/utils/vendorBillable'
import {
  resolveVendorLineAmountsFromInvoice,
  resolveVendorLineNetFromInvoice,
  sumVendorLinePaidFromPayments,
} from '@/pages/Projects/tabs/live/paymentAllocation'

const MONEY_EPS = 0.01

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export interface PayableMilestoneDisplayAmounts {
  base: number
  gstRate: number
  gstAmount: number
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

/** Vendor TDS applies only when this milestone/retention has a covering invoice. */
export function resolveVendorPayableTdsRate(
  milestoneInvoice: VendorInvoice | undefined,
): number | null {
  if (!milestoneInvoice) return null
  return milestoneInvoice.tdsRate ?? null
}

/**
 * Project Live Payable Amount Breakdown:
 * uninvoiced → Base + GST; invoiced → that invoice line's Base + GST − TDS.
 */
export function resolvePayableMilestoneAmounts(
  row: VendorPOMilestoneOverviewRow,
  invoice: VendorInvoice | undefined,
  vendorPo: VendorPO | undefined,
  baseline: Baseline | null = null,
  settingsServices: Service[] = [],
): PayableMilestoneDisplayAmounts {
  if (invoice) {
    const lineAmounts = resolveVendorLineAmountsFromInvoice(invoice, row.milestoneId)
    if (lineAmounts) {
      const matchedLines = (invoice.lineItems ?? []).filter(
        (li) => li.milestoneId?.trim() === row.milestoneId.trim(),
      )
      const persistedGstRate = matchedLines.find(
        (li) => li.gstRate != null && Number.isFinite(li.gstRate),
      )?.gstRate
      const gstRate =
        persistedGstRate ??
        (lineAmounts.base > MONEY_EPS
          ? Math.round((100 * lineAmounts.gstAmount) / lineAmounts.base)
          : 0)
      return {
        base: lineAmounts.base,
        gstRate,
        gstAmount: lineAmounts.gstAmount,
        tdsRate: resolveVendorPayableTdsRate(invoice),
        tdsAmount: lineAmounts.tdsAmount,
        net: lineAmounts.net,
      }
    }
  }

  const poSnapshot = resolveVendorPoMilestoneSnapshot(vendorPo, row.milestoneId)
  if (poSnapshot) {
    return {
      base: poSnapshot.base,
      gstRate: poSnapshot.gstRate,
      gstAmount: poSnapshot.gstAmount,
      tdsRate: null,
      tdsAmount: 0,
      net: poSnapshot.net,
    }
  }

  const serviceId = resolveVendorMilestoneServiceId(row.serviceId, vendorPo, baseline)
  const tdsRate = resolveVendorPayableTdsRate(invoice)
  const amounts = vendorMilestonePayableTaxBreakdown(
    row.amount,
    serviceId,
    tdsRate,
    baseline,
    settingsServices,
    vendorPo,
  )
  return {
    base: amounts.base,
    gstRate: amounts.gstRate,
    gstAmount: amounts.gstAmount,
    tdsRate: amounts.tdsRate,
    tdsAmount: amounts.tdsAmount,
    net: amounts.net,
  }
}

/** Row-level TDS / paid / outstanding for one milestone/retention on a vendor invoice. */
export function resolvePayableMilestonePaymentSummary(
  invoice: VendorInvoice | undefined,
  payments: VendorPayment[],
  flatMilestone?: FlatVendorMilestone,
  vendorPoId?: string,
  rowAmounts?: PayableMilestoneDisplayAmounts,
  milestoneId?: string,
): PayableMilestoneDisplayPaymentSummary | null {
  if (!invoice || !flatMilestone) return null

  const targetMilestoneId = milestoneId ?? flatMilestone.milestoneId
  const rowNet =
    rowAmounts?.net ??
    (resolveVendorLineNetFromInvoice(invoice, targetMilestoneId) ||
      getVendorInvoiceMilestoneNet(
        invoice,
        flatMilestone,
        vendorPoId,
        invoice.tdsRate ?? 0,
      ))
  const rowTds = rowAmounts?.tdsAmount ?? 0
  const invoiceNet = Number(invoice.netPayable) || 0

  const paid = sumVendorLinePaidFromPayments(payments, invoice.id, targetMilestoneId, {
    invoiceNet,
    lineNet: rowNet,
  })
  const outstanding = roundMoney(Math.max(0, rowNet - paid))

  return { tds: rowTds, paid, outstanding }
}

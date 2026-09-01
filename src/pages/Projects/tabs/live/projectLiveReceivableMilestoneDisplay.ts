import type { Baseline } from '@/slices/baseline/reducer'
import type { ClientInvoice } from '@/slices/live/types'
import type { Service } from '@/slices/settings/reducer'
import type { BillableMilestone } from '@/pages/Projects/tabs/live/billableMilestones'
import {
  calcClientInvoiceTdsAmount,
  clientMilestoneNetPayable,
  computeLineItemTaxBreakdown,
  resolveClientServiceGstRate,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import {
  resolveClientLineAmountsFromInvoice,
  resolveClientLineNetFromInvoice,
  sumClientLinePaidFromPayments,
} from '@/pages/Projects/tabs/live/paymentAllocation'

const MONEY_EPS = 0.01

export interface ReceivableMilestoneDisplayAmounts {
  base: number
  gstRate: number
  gstAmount: number
  labourCess: number
  tdsRate: number | null
  tdsAmount: number
  net: number
}

export interface ReceivableMilestoneDisplayPaymentSummary {
  tds: number
  received: number
  outstanding: number
}

/** Project Live Receivable Amount Breakdown: uninvoiced → PO estimate; invoiced → that line's tax breakdown. */
export function resolveReceivableMilestoneAmounts(
  row: BillableMilestone,
  invoice: ClientInvoice | undefined,
  poTdsRate: number | null | undefined,
  baseline: Baseline | null = null,
  settingsServices: Service[] = [],
): ReceivableMilestoneDisplayAmounts {
  if (invoice) {
    const lineAmounts = resolveClientLineAmountsFromInvoice(invoice, row.milestoneId)
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
        labourCess: lineAmounts.labourCessAmount,
        tdsRate: invoice.tdsRate ?? poTdsRate ?? null,
        tdsAmount: lineAmounts.tdsAmount,
        net: lineAmounts.net,
      }
    }
  }

  const gstRate = resolveClientServiceGstRate(row.serviceId, baseline, settingsServices)
  const taxed = computeLineItemTaxBreakdown(row.baseAmount, 0, gstRate)
  const tdsAmount = calcClientInvoiceTdsAmount(row.baseAmount, poTdsRate)
  const net = clientMilestoneNetPayable({
    baseAmount: row.baseAmount,
    gstRate,
    tdsRate: poTdsRate,
  })

  return {
    base: row.baseAmount,
    gstRate,
    gstAmount: taxed.gstAmount,
    labourCess: taxed.labourCessAmount,
    tdsRate: poTdsRate ?? null,
    tdsAmount,
    net,
  }
}

/** Row-level TDS / received / outstanding for one milestone/retention on a client invoice. */
export function resolveReceivableMilestonePaymentSummary(
  invoice: ClientInvoice | undefined,
  milestoneId: string,
  rowAmounts?: ReceivableMilestoneDisplayAmounts,
): ReceivableMilestoneDisplayPaymentSummary | null {
  if (!invoice) return null

  const lineNet = rowAmounts?.net ?? resolveClientLineNetFromInvoice(invoice, milestoneId)
  const invoiceNet = Math.max(0, (invoice.grossAmount ?? 0) - (invoice.tdsAmount ?? 0))
  const received = sumClientLinePaidFromPayments(invoice.payments, milestoneId, {
    invoiceNet,
    lineNet,
  })
  const outstanding = Math.max(0, lineNet - received)

  return {
    tds: rowAmounts?.tdsAmount ?? 0,
    received,
    outstanding,
  }
}

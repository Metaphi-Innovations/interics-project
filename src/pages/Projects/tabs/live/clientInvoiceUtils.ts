import { DEFAULT_GST_RATE } from '@/config/billingRates'
import type { Baseline, ClientPOMilestone } from '@/slices/baseline/reducer'
import type { ClientInvoice, ClientInvoiceLineItem, ClientInvoicePayment } from '@/slices/live/types'
import type { PitchService } from '@/slices/pitch/reducer'
import type { Service } from '@/slices/settings/reducer'
import { resolvePitchServiceGstRate } from './pitchGstDisplay'

export const MONEY_EPS = 0.01

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export interface LineItemTaxBreakdown {
  labourCessAmount: number
  taxableAmount: number
  gstAmount: number
  grossAmount: number
}

/** Base → labour cess → taxable → GST → gross (client invoice line). */
export function computeLineItemTaxBreakdown(
  baseAmount: number,
  labourCessRate: number,
  gstRate: number,
): LineItemTaxBreakdown {
  const labourCessAmount = roundMoney(baseAmount * (labourCessRate / 100))
  const taxableAmount = roundMoney(baseAmount + labourCessAmount)
  const gstAmount = roundMoney(taxableAmount * (gstRate / 100))
  const grossAmount = roundMoney(taxableAmount + gstAmount)
  return { labourCessAmount, taxableAmount, gstAmount, grossAmount }
}

export interface InvoiceLineRollups {
  baseAmount: number
  labourCessAmount: number
  taxableAmount: number
  gstAmount: number
  grossAmount: number
  /** Blended labour cess % across lines (null when base is zero). */
  labourCessRatePercent: number | null
}

export function rollupsFromLineItems(lineItems: ClientInvoiceLineItem[]): InvoiceLineRollups {
  let labourCessAmount = 0
  let taxableAmount = 0
  let gstAmount = 0

  for (const li of lineItems) {
    const breakdown = computeLineItemTaxBreakdown(
      li.amount,
      li.labourCessRate ?? 0,
      li.gstRate,
    )
    labourCessAmount += breakdown.labourCessAmount
    taxableAmount += breakdown.taxableAmount
    gstAmount += breakdown.gstAmount
  }

  const baseAmount = roundMoney(lineItems.reduce((s, li) => s + li.amount, 0))
  labourCessAmount = roundMoney(labourCessAmount)
  taxableAmount = roundMoney(taxableAmount)
  gstAmount = roundMoney(gstAmount)
  const grossAmount = roundMoney(taxableAmount + gstAmount)
  const labourCessRatePercent =
    baseAmount > 0 ? roundMoney((labourCessAmount / baseAmount) * 100) : null

  return {
    baseAmount,
    labourCessAmount,
    taxableAmount,
    gstAmount,
    grossAmount,
    labourCessRatePercent,
  }
}

export function totalSettledFromPayments(payments: ClientInvoicePayment[]): number {
  return roundMoney(
    payments.reduce((s, p) => s + p.amountReceived + p.tdsDeducted, 0),
  )
}

export function totalReceivedBank(payments: ClientInvoicePayment[]): number {
  return roundMoney(payments.reduce((s, p) => s + p.amountReceived, 0))
}

export function totalTdsFromPayments(payments: ClientInvoicePayment[]): number {
  return roundMoney(payments.reduce((s, p) => s + p.tdsDeducted, 0))
}

export function balancePending(inv: ClientInvoice): number {
  const tds = inv.tdsAmount ?? 0
  const settled = totalSettledFromPayments(inv.payments)
  // If no payments yet, TDS counts immediately as settled (deducted at source)
  if (settled <= 0 && tds > 0) {
    return roundMoney(inv.grossAmount - tds)
  }
  return roundMoney(inv.grossAmount - settled)
}

export function isInvoiceFullyPaid(inv: ClientInvoice): boolean {
  return balancePending(inv) <= MONEY_EPS
}

export function isDueDateOverdue(dueDate: string): boolean {
  const d = new Date(dueDate)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

/** Effective GST % for display when all lines share similar rate */
export function effectiveGstPercent(inv: ClientInvoice): string {
  const roll = rollupsFromLineItems(inv.lineItems)
  if (roll.taxableAmount <= 0) return '—'
  const pct = (100 * roll.gstAmount) / roll.taxableAmount
  return `${Math.round(pct * 10) / 10}%`
}

/** Blended labour cess % across invoice lines (null when base is zero). */
export function effectiveLabourCessPercent(inv: ClientInvoice): string {
  const roll = rollupsFromLineItems(inv.lineItems)
  if (roll.labourCessRatePercent == null) return '—'
  return `${roll.labourCessRatePercent}%`
}

function findBaselineService(
  baseline: Baseline | null,
  serviceId: string,
): PitchService | null {
  if (!baseline || !serviceId.trim()) return null
  for (const cat of baseline.categories ?? []) {
    for (const svc of cat.services ?? []) {
      if (svc.id === serviceId || svc.subcategoryId === serviceId) return svc
    }
  }
  return null
}

/** GST % for a client PO milestone service (baseline → settings master → default). */
export function resolveClientServiceGstRate(
  serviceId: string,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  const svc = findBaselineService(baseline, serviceId)
  if (svc) return resolvePitchServiceGstRate(svc, settingsServices)
  return DEFAULT_GST_RATE
}

/** Tax-inclusive gross for a pre-tax milestone base amount. */
export function clientMilestoneBaseGross(
  baseAmount: number,
  serviceId: string,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  const gstRate = resolveClientServiceGstRate(serviceId, baseline, settingsServices)
  return computeLineItemTaxBreakdown(baseAmount, 0, gstRate).grossAmount
}

/** Gross (base + GST) for a client PO milestone including retention. */
export function clientMilestoneGross(
  milestone: ClientPOMilestone,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  let gross = clientMilestoneBaseGross(
    milestone.value,
    milestone.serviceId,
    baseline,
    settingsServices,
  )
  if (milestone.retention?.value) {
    gross += clientMilestoneBaseGross(
      milestone.retention.value,
      milestone.serviceId,
      baseline,
      settingsServices,
    )
  }
  return roundMoney(gross)
}

export function invoiceLabourCessAmount(inv: {
  labourCessAmount?: number | null
  lineItems: Array<{ amount: number; labourCessRate?: number; gstRate: number }>
}): number {
  if (inv.labourCessAmount != null) return inv.labourCessAmount
  return roundMoney(
    inv.lineItems.reduce(
      (s, li) =>
        s +
        computeLineItemTaxBreakdown(li.amount, li.labourCessRate ?? 0, li.gstRate)
          .labourCessAmount,
      0,
    ),
  )
}

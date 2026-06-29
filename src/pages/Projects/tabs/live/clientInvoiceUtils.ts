import type { ClientInvoice, ClientInvoiceLineItem, ClientInvoicePayment } from '@/slices/live/types'

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
  return roundMoney(inv.grossAmount - totalSettledFromPayments(inv.payments))
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

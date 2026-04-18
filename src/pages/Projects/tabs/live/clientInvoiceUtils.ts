import type { ClientInvoice, ClientInvoiceLineItem, ClientInvoicePayment } from '@/slices/live/types'

export const MONEY_EPS = 0.01

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function rollupsFromLineItems(lineItems: ClientInvoiceLineItem[]): {
  baseAmount: number
  gstAmount: number
  grossAmount: number
} {
  const baseAmount = lineItems.reduce((s, li) => s + li.amount, 0)
  const gstAmount = roundMoney(lineItems.reduce((s, li) => s + li.gstAmount, 0))
  return {
    baseAmount,
    gstAmount,
    grossAmount: roundMoney(baseAmount + gstAmount),
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
  if (inv.baseAmount <= 0) return '—'
  const pct = (100 * inv.gstAmount) / inv.baseAmount
  return `${Math.round(pct * 10) / 10}%`
}

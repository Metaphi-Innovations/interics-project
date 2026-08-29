import type { ClientInvoice } from '@/slices/live/types'

const MONEY_EPS = 0.01

/** Draft invoice on this milestone that can be converted to tax. */
export function findDraftInvoiceForMilestone(
  invoices: ClientInvoice[],
): ClientInvoice | undefined {
  return invoices.find((inv) => inv.status === 'draft')
}

/** Tax (non-draft) invoice with an outstanding balance eligible for payment recording. */
export function findTaxInvoiceEligibleForPayment(
  invoices: ClientInvoice[],
  balancePending: (inv: ClientInvoice) => number = (inv) => inv.netReceivable,
): ClientInvoice | undefined {
  return invoices.find(
    (inv) => inv.status !== 'draft' && balancePending(inv) > MONEY_EPS,
  )
}

export function shouldShowReceivableConvertToTax(invoices: ClientInvoice[]): boolean {
  return findDraftInvoiceForMilestone(invoices) != null
}

export function shouldShowReceivableRecordPayment(
  invoices: ClientInvoice[],
  balancePending: (inv: ClientInvoice) => number,
): boolean {
  return findTaxInvoiceEligibleForPayment(invoices, balancePending) != null
}

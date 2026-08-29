import type { StatusType } from '@/design-system/components'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'

const MONEY_EPS = 0.01

export type ProjectLivePayableBillingPhase = 'not_invoiced' | 'invoiced'
export type ProjectLivePayablePaymentPhase = 'unpaid' | 'paid'

/** Any covering vendor invoice → Invoiced; no draft/tax distinction for Project Live Payable. */
export function projectLivePayableBillingPhase(
  milestoneInvoices: VendorInvoice[],
): ProjectLivePayableBillingPhase {
  return milestoneInvoices.length === 0 ? 'not_invoiced' : 'invoiced'
}

function vendorInvoicePaidAmount(invoiceId: string, payments: VendorPayment[]): number {
  return payments
    .filter(
      (payment) =>
        payment.linkedInvoiceIds.includes(invoiceId) && payment.status !== 'not_paid',
    )
    .reduce((sum, payment) => sum + payment.netPaid, 0)
}

export function vendorInvoiceOutstanding(
  invoice: VendorInvoice,
  payments: VendorPayment[],
): number {
  return Math.max(0, invoice.netPayable - vendorInvoicePaidAmount(invoice.id, payments))
}

export { vendorInvoicePaidAmount }

function isVendorInvoiceFullyPaid(
  invoice: VendorInvoice,
  payments: VendorPayment[],
): boolean {
  return vendorInvoicePaidAmount(invoice.id, payments) >= invoice.netPayable - MONEY_EPS
}

/** First covering invoice — same precedence as findVendorInvoiceForMilestone. */
export function findPayableInvoiceForView(
  milestoneInvoices: VendorInvoice[],
): VendorInvoice | undefined {
  return milestoneInvoices[0]
}

/** First covering invoice that still has an outstanding payable balance. */
export function findPayableInvoiceEligibleForPayment(
  milestoneInvoices: VendorInvoice[],
  payments: VendorPayment[],
): VendorInvoice | undefined {
  return milestoneInvoices.find((invoice) => !isVendorInvoiceFullyPaid(invoice, payments))
}

/** Paid only when settlement payments cover the invoice net payable; invoice existence alone is not Paid. */
export function projectLivePayablePaymentPhase(
  milestoneInvoices: VendorInvoice[],
  payments: VendorPayment[],
): ProjectLivePayablePaymentPhase {
  if (milestoneInvoices.length === 0) return 'unpaid'
  const allPaid = milestoneInvoices.every((invoice) =>
    isVendorInvoiceFullyPaid(invoice, payments),
  )
  return allPaid ? 'paid' : 'unpaid'
}

export function projectLivePayableBillingStatusBadge(
  phase: ProjectLivePayableBillingPhase,
): { type: StatusType; label: string } {
  switch (phase) {
    case 'not_invoiced':
      return { type: 'draft', label: 'Not Invoiced' }
    case 'invoiced':
      return { type: 'sent', label: 'Invoiced' }
  }
}

export function projectLivePayablePaymentStatusBadge(
  phase: ProjectLivePayablePaymentPhase,
): { type: StatusType; label: string } {
  switch (phase) {
    case 'unpaid':
      return { type: 'unpaid', label: 'Unpaid' }
    case 'paid':
      return { type: 'paid', label: 'Paid' }
  }
}

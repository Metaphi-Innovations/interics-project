import type { StatusType } from '@/design-system/components'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'
import {
  deriveInvoiceSettlementStatus,
  deriveRowPaymentPhase,
  PAYMENT_MONEY_EPS,
  resolveVendorLineNetFromInvoice,
  sumVendorInvoicePaidFromPayments,
  sumVendorLinePaidFromPayments,
} from '@/pages/Projects/tabs/live/paymentAllocation'

export type ProjectLivePayableBillingPhase = 'not_invoiced' | 'invoiced'
export type ProjectLivePayablePaymentPhase = 'unpaid' | 'partially_paid' | 'paid'

/** Any covering vendor invoice → Invoiced; no draft/tax distinction for Project Live Payable. */
export function projectLivePayableBillingPhase(
  milestoneInvoices: VendorInvoice[],
): ProjectLivePayableBillingPhase {
  return milestoneInvoices.length === 0 ? 'not_invoiced' : 'invoiced'
}

export function vendorInvoicePaidAmount(invoiceId: string, payments: VendorPayment[]): number {
  return sumVendorInvoicePaidFromPayments(payments, invoiceId)
}

export function vendorInvoiceOutstanding(
  invoice: VendorInvoice,
  payments: VendorPayment[],
): number {
  return Math.max(0, invoice.netPayable - vendorInvoicePaidAmount(invoice.id, payments))
}

export function vendorLinePaidAmount(
  invoice: VendorInvoice,
  milestoneId: string,
  payments: VendorPayment[],
): number {
  const lineNet = resolveVendorLineNetFromInvoice(invoice, milestoneId)
  const invoiceNet = Number(invoice.netPayable) || 0
  return sumVendorLinePaidFromPayments(payments, invoice.id, milestoneId, {
    invoiceNet,
    lineNet,
  })
}

export function vendorLineOutstanding(
  invoice: VendorInvoice,
  milestoneId: string,
  payments: VendorPayment[],
): number {
  const lineNet = resolveVendorLineNetFromInvoice(invoice, milestoneId)
  const paid = vendorLinePaidAmount(invoice, milestoneId, payments)
  return Math.max(0, lineNet - paid)
}

function isVendorInvoiceFullyPaid(
  invoice: VendorInvoice,
  payments: VendorPayment[],
): boolean {
  return (
    deriveInvoiceSettlementStatus(
      invoice.netPayable,
      vendorInvoicePaidAmount(invoice.id, payments),
    ) === 'paid'
  )
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

/** Row payment phase from persisted allocations (legacy proportional fallback). */
export function projectLivePayablePaymentPhase(
  milestoneInvoices: VendorInvoice[],
  payments: VendorPayment[],
  milestoneId?: string,
): ProjectLivePayablePaymentPhase {
  if (milestoneInvoices.length === 0) return 'unpaid'
  const invoice = milestoneInvoices[0]
  if (!invoice) return 'unpaid'

  if (milestoneId) {
    const lineNet = resolveVendorLineNetFromInvoice(invoice, milestoneId)
    if (lineNet <= PAYMENT_MONEY_EPS) return 'unpaid'
    const linePaid = vendorLinePaidAmount(invoice, milestoneId, payments)
    return deriveRowPaymentPhase(lineNet, linePaid)
  }

  const allPaid = milestoneInvoices.every((inv) => isVendorInvoiceFullyPaid(inv, payments))
  if (allPaid) return 'paid'
  const anyPaid = milestoneInvoices.some(
    (inv) => vendorInvoicePaidAmount(inv.id, payments) > PAYMENT_MONEY_EPS,
  )
  return anyPaid ? 'partially_paid' : 'unpaid'
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
    case 'partially_paid':
      return { type: 'partially_paid', label: 'Partially Paid' }
    case 'paid':
      return { type: 'paid', label: 'Paid' }
  }
}

export { PAYMENT_MONEY_EPS }

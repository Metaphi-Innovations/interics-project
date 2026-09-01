import type { StatusType } from '@/design-system/components'
import type { ClientInvoice } from '@/slices/live/types'
import { balancePending, totalReceivedBank } from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import {
  deriveRowPaymentPhase,
  resolveClientLineNetFromInvoice,
  sumClientLinePaidFromPayments,
} from '@/pages/Projects/tabs/live/paymentAllocation'

const MONEY_EPS = 0.01

export type MilestoneBillingPhase = 'not_invoiced' | 'draft' | 'fully_invoiced'

export type MilestonePaymentPhase = 'unpaid' | 'partially_paid' | 'paid'

export function milestoneBillingPhase(milestoneInvoices: ClientInvoice[]): MilestoneBillingPhase {
  if (milestoneInvoices.length === 0) return 'not_invoiced'
  const onlyDrafts = milestoneInvoices.every((inv) => inv.status === 'draft')
  if (onlyDrafts) return 'draft'
  return 'fully_invoiced'
}

function clientInvoiceNetPayable(inv: ClientInvoice): number {
  return Math.max(0, (inv.grossAmount ?? 0) - (inv.tdsAmount ?? 0))
}

function resolveClientLineNet(inv: ClientInvoice, milestoneId: string): number {
  return resolveClientLineNetFromInvoice(inv, milestoneId)
}

export function milestonePaymentPhase(
  milestoneInvoices: ClientInvoice[],
  milestoneId?: string,
): MilestonePaymentPhase {
  if (milestoneInvoices.length === 0) return 'unpaid'
  const inv = milestoneInvoices[0]
  if (!inv) return 'unpaid'

  if (milestoneId) {
    const lineNet = resolveClientLineNet(inv, milestoneId)
    if (lineNet <= MONEY_EPS) return 'unpaid'
    const invoiceNet = clientInvoiceNetPayable(inv)
    const linePaid = sumClientLinePaidFromPayments(inv.payments, milestoneId, {
      invoiceNet,
      lineNet,
    })
    return deriveRowPaymentPhase(lineNet, linePaid)
  }

  const allPaid = milestoneInvoices.every((invoice) => balancePending(invoice) <= MONEY_EPS)
  if (allPaid) return 'paid'
  const anyReceived = milestoneInvoices.some(
    (invoice) => totalReceivedBank(invoice.payments) > MONEY_EPS,
  )
  return anyReceived ? 'partially_paid' : 'unpaid'
}

export function milestoneBillingStatusBadge(
  phase: MilestoneBillingPhase,
): { type: StatusType; label: string } {
  switch (phase) {
    case 'not_invoiced':
      return { type: 'draft', label: 'Not Invoiced' }
    case 'draft':
      return { type: 'draft', label: 'Draft' }
    case 'fully_invoiced':
      return { type: 'sent', label: 'Invoiced' }
  }
}

export function milestonePaymentStatusBadge(
  phase: MilestonePaymentPhase,
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

export function clientInvoiceStatusBadges(
  inv: ClientInvoice,
): Array<{ type: StatusType; label: string }> {
  const billing =
    inv.status === 'draft'
      ? { type: 'draft' as const, label: 'Draft' }
      : { type: 'tax' as const, label: 'Tax' }
  const payment = milestonePaymentStatusBadge(milestonePaymentPhase([inv]))
  return [billing, payment]
}

export function clientLinePaidAmount(
  inv: ClientInvoice,
  milestoneId: string,
): number {
  const lineNet = resolveClientLineNet(inv, milestoneId)
  const invoiceNet = clientInvoiceNetPayable(inv)
  return sumClientLinePaidFromPayments(inv.payments, milestoneId, {
    invoiceNet,
    lineNet,
  })
}

export function clientLineOutstanding(inv: ClientInvoice, milestoneId: string): number {
  const lineNet = resolveClientLineNet(inv, milestoneId)
  const paid = clientLinePaidAmount(inv, milestoneId)
  return Math.max(0, lineNet - paid)
}

export { resolveClientLineNet, clientInvoiceNetPayable }

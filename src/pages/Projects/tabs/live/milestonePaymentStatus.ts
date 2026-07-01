import type { ClientInvoice, VendorInvoice } from '@/slices/live/types'
import { isInvoiceFullyPaid } from './clientInvoiceUtils'

export type MilestonePaymentStatusLabel = 'Paid' | 'Unpaid'

export function clientMilestonePaymentStatus(
  invoices: ClientInvoice[],
  milestoneId: string,
  serviceId: string,
): MilestonePaymentStatusLabel {
  const inv = invoices.find(
    (i) => i.milestoneId === milestoneId && i.serviceId === serviceId,
  )
  if (!inv) return 'Unpaid'
  return isInvoiceFullyPaid(inv) ? 'Paid' : 'Unpaid'
}

export function vendorMilestonePaymentStatus(
  invoices: VendorInvoice[],
  milestoneId: string,
): MilestonePaymentStatusLabel {
  const inv = invoices.find((i) => i.milestoneId === milestoneId)
  if (!inv) return 'Unpaid'
  return inv.status === 'paid' ? 'Paid' : 'Unpaid'
}

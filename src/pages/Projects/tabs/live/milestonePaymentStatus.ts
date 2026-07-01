import type { ClientPOMilestone } from '@/slices/baseline/reducer'
import type { ClientInvoice, VendorInvoice } from '@/slices/live/types'
import { isInvoiceFullyPaid } from './clientInvoiceUtils'

export type MilestonePaymentStatusLabel = 'Paid' | 'Unpaid'

function isClientRetentionMilestone(milestone: ClientPOMilestone): boolean {
  return (
    milestone.kind === 'retention' ||
    milestone.id.startsWith('cli-ret-') ||
    milestone.name.trim().toLowerCase() === 'retention'
  )
}

export function clientMilestoneStatusesForCard(
  milestones: ClientPOMilestone[],
  serviceId: string,
  invoices: ClientInvoice[],
): {
  milestoneStatuses: Record<string, MilestonePaymentStatusLabel>
  retentionStatus?: MilestonePaymentStatusLabel
} {
  const milestoneStatuses: Record<string, MilestonePaymentStatusLabel> = {}
  let retentionStatus: MilestonePaymentStatusLabel | undefined

  for (const milestone of milestones) {
    if (milestone.serviceId !== serviceId) continue
    const status = clientMilestonePaymentStatus(invoices, milestone.id, milestone.serviceId)
    if (isClientRetentionMilestone(milestone)) {
      retentionStatus = status
    } else {
      milestoneStatuses[milestone.id] = status
    }
  }

  return { milestoneStatuses, retentionStatus }
}

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

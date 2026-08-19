import type { ClientPOMilestone } from '@/slices/baseline/reducer'
import type { ClientInvoice, ClientInvoiceLineItem, VendorInvoice } from '@/slices/live/types'
import { isInvoiceFullyPaid } from './clientInvoiceUtils'

function serviceCompatible(requested: string, ...candidates: Array<string | undefined>): boolean {
  if (!requested) return true
  const present = candidates.filter((c): c is string => Boolean(c))
  if (present.length === 0) return true
  return present.includes(requested)
}

function normalizeLabel(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function milestoneNameFromServiceName(serviceName: string | undefined): string {
  const raw = (serviceName ?? '').trim()
  if (!raw) return ''
  const parts = raw.split(' — ')
  return parts.length >= 2 ? parts[0]!.trim() : raw
}

function lineHasMilestoneId(
  li: Pick<ClientInvoiceLineItem, 'milestoneId'>,
  milestoneId: string,
): boolean {
  return Boolean(li.milestoneId) && li.milestoneId === milestoneId
}

function invoiceCoversMilestoneId(invoice: ClientInvoice, milestoneId: string): boolean {
  if (invoice.milestoneId === milestoneId) return true
  return (invoice.lineItems ?? []).some((li) => lineHasMilestoneId(li, milestoneId))
}

function invoiceCoversMilestoneName(
  invoice: ClientInvoice,
  milestoneName: string,
  serviceId: string,
): boolean {
  const wanted = normalizeLabel(milestoneName)
  if (!wanted) return false

  const headerName = normalizeLabel(invoice.milestoneName)
  if (
    headerName === wanted &&
    serviceCompatible(serviceId, invoice.serviceId)
  ) {
    return true
  }

  return (invoice.lineItems ?? []).some((li) => {
    const lineName = normalizeLabel(
      milestoneNameFromServiceName(li.serviceName) || li.serviceName,
    )
    return (
      lineName === wanted &&
      serviceCompatible(serviceId, li.serviceId, li.baselineServiceId, invoice.serviceId)
    )
  })
}

/** Find a client invoice that covers this milestone (header or any line item). */
export function findClientInvoiceForMilestone(
  invoices: ClientInvoice[],
  milestoneId: string,
  serviceId: string,
  milestoneName?: string,
): ClientInvoice | undefined {
  const byId = invoices.find((invoice) => invoiceCoversMilestoneId(invoice, milestoneId))
  if (byId) return byId
  if (!milestoneName?.trim()) return undefined
  return invoices.find((invoice) =>
    invoiceCoversMilestoneName(invoice, milestoneName, serviceId),
  )
}

export type MilestonePaymentStatusLabel = 'Paid' | 'Unpaid' | 'Billed'

function isClientRetentionMilestone(milestone: ClientPOMilestone): boolean {
  return (
    milestone.kind === 'retention' ||
    milestone.id.startsWith('cli-ret-') ||
    milestone.name.trim().toLowerCase() === 'retention'
  )
}

/** Any covering invoice (draft or tax) — not necessarily fully paid. */
export function clientMilestoneIsBilled(
  invoices: ClientInvoice[],
  milestoneId: string,
  serviceId: string,
  milestoneName?: string,
): boolean {
  return Boolean(findClientInvoiceForMilestone(invoices, milestoneId, serviceId, milestoneName))
}

export function vendorMilestoneIsBilled(
  invoices: VendorInvoice[],
  milestoneId: string,
): boolean {
  return invoices.some(
    (inv) =>
      inv.milestoneId === milestoneId ||
      (inv.lineItems ?? []).some((li) => li.milestoneId === milestoneId),
  )
}

export function clientMilestonePaymentStatus(
  invoices: ClientInvoice[],
  milestoneId: string,
  serviceId: string,
  milestoneName?: string,
): MilestonePaymentStatusLabel {
  const inv = findClientInvoiceForMilestone(invoices, milestoneId, serviceId, milestoneName)
  if (!inv) return 'Unpaid'
  return isInvoiceFullyPaid(inv) ? 'Paid' : 'Billed'
}

export function vendorMilestonePaymentStatus(
  invoices: VendorInvoice[],
  milestoneId: string,
): MilestonePaymentStatusLabel {
  const inv = invoices.find(
    (i) =>
      i.milestoneId === milestoneId ||
      (i.lineItems ?? []).some((li) => li.milestoneId === milestoneId),
  )
  if (!inv) return 'Unpaid'
  return inv.status === 'paid' ? 'Paid' : 'Billed'
}

/**
 * Determine payment status for a retention sub-milestone.
 * Only matches invoices whose milestoneId is exactly `${parentMilestoneId}-retention`.
 * Does NOT fall back to parent milestone name matching.
 */
export function clientRetentionPaymentStatus(
  invoices: ClientInvoice[],
  parentMilestoneId: string,
): MilestonePaymentStatusLabel {
  const retentionId = `${parentMilestoneId}-retention`
  const inv = invoices.find((invoice) => invoiceCoversMilestoneId(invoice, retentionId))
  if (!inv) return 'Unpaid'
  return isInvoiceFullyPaid(inv) ? 'Paid' : 'Billed'
}

export function clientRetentionIsLocked(
  invoices: ClientInvoice[],
  parentMilestoneId: string,
): boolean {
  const status = clientRetentionPaymentStatus(invoices, parentMilestoneId)
  return status === 'Paid' || status === 'Billed'
}

export function clientMilestoneIsLocked(
  invoices: ClientInvoice[],
  milestoneId: string,
  serviceId: string,
  milestoneName?: string,
): boolean {
  const status = clientMilestonePaymentStatus(invoices, milestoneId, serviceId, milestoneName)
  return status === 'Paid' || status === 'Billed'
}

export function vendorMilestoneIsLocked(
  invoices: VendorInvoice[],
  milestoneId: string,
  milestoneStatus?: string,
): boolean {
  if (milestoneStatus === 'Paid') return true
  return vendorMilestoneIsBilled(invoices, milestoneId)
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
    const status = clientMilestonePaymentStatus(
      invoices,
      milestone.id,
      milestone.serviceId,
      milestone.name,
    )
    if (isClientRetentionMilestone(milestone)) {
      retentionStatus = status
    } else {
      milestoneStatuses[milestone.id] = status
    }
  }

  return { milestoneStatuses, retentionStatus }
}

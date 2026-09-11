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

/** Nested retention rows use `${parentId}-retention`; standalone use `cli-ret-*`. */
function isClientRetentionTargetId(id: string | undefined): boolean {
  if (!id?.trim()) return false
  const value = id.trim()
  return value.endsWith('-retention') || value.startsWith('cli-ret-')
}

function isClientRetentionLookup(milestoneId: string, milestoneName?: string): boolean {
  if (isClientRetentionTargetId(milestoneId)) return true
  const name = normalizeLabel(milestoneName)
  return name === 'retention' || name.includes(' — retention')
}

/**
 * Decode milestone label from encoded line serviceName (`Milestone — Service`).
 * Retention lines are encoded as `Milestone — Retention — Service` — return
 * `Milestone — Retention` so they never collapse to the parent milestone name.
 */
function milestoneNameFromServiceName(serviceName: string | undefined): string {
  const raw = (serviceName ?? '').trim()
  if (!raw) return ''
  const parts = raw
    .split(' — ')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return raw
  const retentionIdx = parts.findIndex((part) => part.toLowerCase() === 'retention')
  if (retentionIdx >= 1) {
    return `${parts[0]} — Retention`
  }
  return parts[0]!
}

function invoiceHasRetentionTarget(invoice: ClientInvoice): boolean {
  if (isClientRetentionTargetId(invoice.milestoneId)) return true
  if (isClientRetentionLookup(invoice.milestoneId ?? '', invoice.milestoneName)) return true
  return (invoice.lineItems ?? []).some((li) => isClientRetentionTargetId(li.milestoneId))
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
  return findClientInvoicesForMilestone(invoices, milestoneId, serviceId, milestoneName)[0]
}

/** All client invoices covering this milestone. */
export function findClientInvoicesForMilestone(
  invoices: ClientInvoice[],
  milestoneId: string,
  serviceId: string,
  milestoneName?: string,
): ClientInvoice[] {
  const retentionLookup = isClientRetentionLookup(milestoneId, milestoneName)
  return invoices.filter((invoice) => {
    if (invoiceCoversMilestoneId(invoice, milestoneId)) return true
    if (!milestoneName?.trim()) return false
    // Retention invoices must not attach to parent milestones via name fallback.
    if (!retentionLookup && invoiceHasRetentionTarget(invoice)) return false
    return invoiceCoversMilestoneName(invoice, milestoneName, serviceId)
  })
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

function vendorInvoiceCoversMilestoneId(invoice: VendorInvoice, milestoneId: string): boolean {
  if (invoice.milestoneId === milestoneId) return true
  return (invoice.lineItems ?? []).some((li) => Boolean(li.milestoneId) && li.milestoneId === milestoneId)
}

function vendorInvoiceCoversMilestoneName(
  invoice: VendorInvoice,
  milestoneName: string,
  serviceId: string,
): boolean {
  const wanted = normalizeLabel(milestoneName)
  if (!wanted) return false

  const headerName = normalizeLabel(invoice.milestoneName)
  if (headerName === wanted && serviceCompatible(serviceId, invoice.serviceId)) {
    return true
  }

  return (invoice.lineItems ?? []).some((li) => {
    const lineName = normalizeLabel(li.milestoneName)
    return (
      lineName === wanted &&
      serviceCompatible(serviceId, li.serviceId, invoice.serviceId)
    )
  })
}

/** Find a vendor invoice that covers this milestone (header or any line item). */
export function findVendorInvoiceForMilestone(
  invoices: VendorInvoice[],
  milestoneId: string,
  serviceId = '',
  milestoneName?: string,
): VendorInvoice | undefined {
  return findVendorInvoicesForMilestone(invoices, milestoneId, serviceId, milestoneName)[0]
}

/** All vendor invoices covering this milestone. */
export function findVendorInvoicesForMilestone(
  invoices: VendorInvoice[],
  milestoneId: string,
  serviceId = '',
  milestoneName?: string,
): VendorInvoice[] {
  return invoices.filter((invoice) => {
    if (vendorInvoiceCoversMilestoneId(invoice, milestoneId)) return true
    if (!milestoneName?.trim()) return false
    return vendorInvoiceCoversMilestoneName(invoice, milestoneName, serviceId)
  })
}

/** Any covering invoice (pending/paid/partial/etc.) — not necessarily fully paid. */
export function vendorMilestoneIsBilled(
  invoices: VendorInvoice[],
  milestoneId: string,
  serviceId = '',
  milestoneName?: string,
): boolean {
  return Boolean(findVendorInvoiceForMilestone(invoices, milestoneId, serviceId, milestoneName))
}

export function clientMilestonePaymentStatus(
  invoices: ClientInvoice[],
  milestoneId: string,
  serviceId: string,
  milestoneName?: string,
): MilestonePaymentStatusLabel {
  const covering = findClientInvoicesForMilestone(invoices, milestoneId, serviceId, milestoneName)
  if (covering.length === 0) return 'Unpaid'
  const allPaid = covering.every((inv) => isInvoiceFullyPaid(inv))
  return allPaid ? 'Paid' : 'Billed'
}

export function vendorMilestonePaymentStatus(
  invoices: VendorInvoice[],
  milestoneId: string,
  serviceId = '',
  milestoneName?: string,
): MilestonePaymentStatusLabel {
  const covering = findVendorInvoicesForMilestone(invoices, milestoneId, serviceId, milestoneName)
  if (covering.length === 0) return 'Unpaid'
  const allPaid = covering.every((inv) => inv.status === 'paid')
  return allPaid ? 'Paid' : 'Billed'
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

export function vendorMilestoneHasFinancialActivity(
  invoices: VendorInvoice[],
  milestoneId: string,
  serviceId = '',
  milestoneName?: string,
): boolean {
  return vendorMilestoneIsBilled(invoices, milestoneId, serviceId, milestoneName)
}

export function vendorMilestoneIsLocked(
  invoices: VendorInvoice[],
  milestoneId: string,
  _milestoneStatus?: string,
  serviceId = '',
  milestoneName?: string,
): boolean {
  return vendorMilestoneHasFinancialActivity(invoices, milestoneId, serviceId, milestoneName)
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

import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import { vendorMilestoneNetPayable } from '@/pages/Projects/tabs/live/vendorSettlement/utils'

export const VENDOR_MONEY_EPS = 0.01

export interface FlatVendorMilestone {
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  value: number
  kind?: string
  isRetention: boolean
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeLabel(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function serviceCompatible(requested: string, ...candidates: Array<string | undefined>): boolean {
  if (!requested) return true
  const present = candidates.filter((c): c is string => Boolean(c))
  if (present.length === 0) return true
  return present.includes(requested)
}

/** Canonical vendor invoice lines — prefers data.lineItems[], falls back to legacy header. */
export function resolveVendorInvoiceLineItems(
  invoice: Pick<
    VendorInvoice,
    'milestoneId' | 'milestoneName' | 'serviceId' | 'serviceName' | 'baseAmount' | 'lineItems'
  >,
): Array<{
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  amount: number
  netAmount?: number
  tdsAmount?: number
}> {
  const lines = invoice.lineItems ?? []
  if (lines.length > 0) {
    return lines
      .filter((li) => li.milestoneId)
      .map((li) => ({
        milestoneId: li.milestoneId!,
        milestoneName: li.milestoneName ?? li.milestoneId!,
        serviceId: li.serviceId ?? invoice.serviceId,
        serviceName: li.serviceName ?? invoice.serviceName,
        amount: Number(li.amount ?? 0) || 0,
        netAmount: li.netAmount,
        tdsAmount: li.tdsAmount,
      }))
  }
  if (!invoice.milestoneId) return []
  return [
    {
      milestoneId: invoice.milestoneId,
      milestoneName: invoice.milestoneName ?? invoice.milestoneId,
      serviceId: invoice.serviceId,
      serviceName: invoice.serviceName,
      amount: Number(invoice.baseAmount ?? 0) || 0,
    },
  ]
}

export function flattenVendorPoMilestones(po: VendorPO | null | undefined): FlatVendorMilestone[] {
  if (!po) return []
  const defaultServiceId = po.linkedBaselineServiceIds?.[0]?.trim() || ''
  const out: FlatVendorMilestone[] = []

  for (const m of po.milestones ?? []) {
    if (!m.name?.trim()) continue
    const kind = m.kind ?? (m.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
    const isRetention = kind === 'retention'
    out.push({
      milestoneId: m.id,
      milestoneName: isRetention ? m.name.trim() || 'Retention' : m.name.trim(),
      serviceId: m.serviceId?.trim() || defaultServiceId,
      serviceName: m.serviceId?.trim() || defaultServiceId,
      value: Number(m.value) || 0,
      kind,
      isRetention,
    })
  }
  return out
}

/** Scope invoices to a Vendor PO (vendorPoId when present; legacy vendor+service fallback). */
export function scopeVendorInvoicesForPo(
  invoices: VendorInvoice[],
  projectId: string,
  vendorPoId: string,
  vendorId: string,
  serviceId: string,
): VendorInvoice[] {
  return invoices.filter((inv) => {
    if (inv.projectId !== projectId || inv.vendorId !== vendorId) return false
    if (inv.vendorPoId?.trim()) return inv.vendorPoId === vendorPoId
    return inv.serviceId === serviceId
  })
}

/** Coverage discovery — same precedence as pending-payable-milestones / milestonePaymentStatus. */
function vendorInvoiceCoversMilestone(
  invoice: VendorInvoice,
  milestone: FlatVendorMilestone,
  vendorPoId?: string,
): boolean {
  if (vendorPoId && invoice.vendorPoId?.trim() && invoice.vendorPoId !== vendorPoId) return false
  if (invoice.milestoneId && invoice.milestoneId === milestone.milestoneId) return true
  if ((invoice.lineItems ?? []).some((li) => li.milestoneId === milestone.milestoneId)) return true
  const wanted = normalizeLabel(milestone.milestoneName)
  if (!wanted) return false
  if (
    normalizeLabel(invoice.milestoneName) === wanted &&
    serviceCompatible(milestone.serviceId, invoice.serviceId)
  ) {
    return true
  }
  return (invoice.lineItems ?? []).some((li) => {
    const lineName = normalizeLabel(li.milestoneName)
    return (
      Boolean(lineName) &&
      lineName === wanted &&
      serviceCompatible(milestone.serviceId, li.serviceId, invoice.serviceId)
    )
  })
}

function matchingLineItemsForMilestone(
  invoice: VendorInvoice,
  milestone: FlatVendorMilestone,
): NonNullable<VendorInvoice['lineItems']> {
  return (invoice.lineItems ?? []).filter(
    (li) =>
      li.milestoneId === milestone.milestoneId ||
      (normalizeLabel(li.milestoneName) === normalizeLabel(milestone.milestoneName) &&
        serviceCompatible(milestone.serviceId, li.serviceId, invoice.serviceId)),
  )
}

function headerMatchesMilestone(invoice: VendorInvoice, milestone: FlatVendorMilestone): boolean {
  if (invoice.milestoneId && invoice.milestoneId === milestone.milestoneId) return true
  const wanted = normalizeLabel(milestone.milestoneName)
  if (!wanted) return false
  return (
    normalizeLabel(invoice.milestoneName) === wanted &&
    serviceCompatible(milestone.serviceId, invoice.serviceId)
  )
}

/**
 * Canonical amount this invoice contributes to ONE milestone.
 * Line-item amounts take precedence; header baseAmount only when no line item
 * exists for this milestone. Never counts both for the same milestone.
 */
export function getVendorInvoiceMilestoneAmount(
  invoice: VendorInvoice,
  milestone: FlatVendorMilestone,
  vendorPoId?: string,
): number {
  if (!vendorInvoiceCoversMilestone(invoice, milestone, vendorPoId)) return 0

  const matchingLines = matchingLineItemsForMilestone(invoice, milestone)
  if (matchingLines.length > 0) {
    return roundMoney(matchingLines.reduce((sum, li) => sum + Number(li.amount ?? 0), 0))
  }

  if (headerMatchesMilestone(invoice, milestone)) {
    return roundMoney(Number(invoice.baseAmount ?? 0))
  }

  return roundMoney(milestone.value)
}

export function getVendorInvoiceMilestoneNet(
  invoice: VendorInvoice,
  milestone: FlatVendorMilestone,
  vendorPoId: string | undefined,
  tdsRate: number,
): number {
  const base = getVendorInvoiceMilestoneAmount(invoice, milestone, vendorPoId)
  if (base <= VENDOR_MONEY_EPS) return 0
  const effectiveTds = invoice.tdsRate ?? tdsRate
  if (
    invoice.netPayable != null &&
    invoice.netPayable > VENDOR_MONEY_EPS &&
    invoice.baseAmount > VENDOR_MONEY_EPS
  ) {
    if (Math.abs(base - invoice.baseAmount) <= VENDOR_MONEY_EPS) {
      return roundMoney(invoice.netPayable)
    }
    return roundMoney((invoice.netPayable * base) / invoice.baseAmount)
  }
  return vendorMilestoneNetPayable(base, effectiveTds)
}

export type VendorMilestoneCoverage = {
  milestoneAmount: number
  milestoneNet: number
  billedAmount: number
  billedNet: number
  draftAmount: number
  taxAmount: number
  remainingAmount: number
  remainingBase: number
}

function isVendorDraftEquivalentStatus(status: string): boolean {
  const s = status.trim().toLowerCase()
  return s === 'draft' || s === 'uploaded' || s === 'pending' || s === 'not_paid' || s === ''
}

export function getVendorMilestoneCoverage(
  invoices: VendorInvoice[],
  projectId: string,
  vendorPoId: string,
  vendorId: string,
  serviceId: string,
  milestone: FlatVendorMilestone,
  tdsRate: number,
  excludeInvoiceId?: string,
): VendorMilestoneCoverage {
  const scoped = scopeVendorInvoicesForPo(invoices, projectId, vendorPoId, vendorId, serviceId)
  const milestoneNet = vendorMilestoneNetPayable(milestone.value, tdsRate)

  let draftNet = 0
  let taxNet = 0
  let billedBase = 0
  for (const inv of scoped) {
    if (excludeInvoiceId && inv.id === excludeInvoiceId) continue
    const base = getVendorInvoiceMilestoneAmount(inv, milestone, vendorPoId)
    const net = getVendorInvoiceMilestoneNet(inv, milestone, vendorPoId, tdsRate)
    if (net <= VENDOR_MONEY_EPS) continue
    billedBase += base
    if (isVendorDraftEquivalentStatus(inv.status)) draftNet += net
    else taxNet += net
  }

  draftNet = roundMoney(draftNet)
  taxNet = roundMoney(taxNet)
  billedBase = roundMoney(billedBase)
  const billedNet = roundMoney(draftNet + taxNet)

  return {
    milestoneAmount: roundMoney(milestone.value),
    milestoneNet,
    billedAmount: billedBase,
    billedNet,
    draftAmount: draftNet,
    taxAmount: taxNet,
    remainingAmount: Math.max(0, roundMoney(milestoneNet - billedNet)),
    remainingBase: Math.max(0, roundMoney(milestone.value - billedBase)),
  }
}

export function vendorBilledAmountForMilestone(
  invoices: VendorInvoice[],
  projectId: string,
  vendorPoId: string,
  vendorId: string,
  serviceId: string,
  milestone: FlatVendorMilestone,
): number {
  const scoped = scopeVendorInvoicesForPo(invoices, projectId, vendorPoId, vendorId, serviceId)
  let billed = 0
  for (const inv of scoped) {
    billed += getVendorInvoiceMilestoneAmount(inv, milestone, vendorPoId)
  }
  return roundMoney(billed)
}

/** @deprecated Prefer vendorMilestoneFullyInvoiced — binary "has invoice" ≠ fully monetarily invoiced. */
export function vendorMilestoneIsCovered(
  invoices: VendorInvoice[],
  projectId: string,
  vendorPoId: string,
  vendorId: string,
  serviceId: string,
  milestone: FlatVendorMilestone,
): boolean {
  const billed = vendorBilledAmountForMilestone(
    invoices,
    projectId,
    vendorPoId,
    vendorId,
    serviceId,
    milestone,
  )
  return vendorMilestoneFullyInvoiced(milestone.value, billed)
}

export function vendorMilestoneFullyInvoiced(milestoneValue: number, billedAmount: number): boolean {
  return remainingVendorMilestoneValue(billedAmount, milestoneValue) <= VENDOR_MONEY_EPS
}

export function vendorPoHasPendingInvoiceWork(
  po: VendorPO,
  invoices: VendorInvoice[],
): boolean {
  const milestones = flattenVendorPoMilestones(po)
  if (milestones.length === 0) return false
  const serviceId = po.linkedBaselineServiceIds?.[0]?.trim() || ''
  return milestones.some(
    (m) =>
      !vendorHasCoveringInvoice(invoices, po.projectId, po.id, po.vendorId, serviceId, m),
  )
}

export function vendorHasCoveringInvoice(
  invoices: VendorInvoice[],
  projectId: string,
  vendorPoId: string,
  vendorId: string,
  serviceId: string,
  milestone: FlatVendorMilestone,
): boolean {
  const scoped = scopeVendorInvoicesForPo(invoices, projectId, vendorPoId, vendorId, serviceId)
  return scoped.some((inv) => vendorInvoiceCoversMilestone(inv, milestone, vendorPoId))
}

export function sumBilledPerVendorMilestone(
  invoices: VendorInvoice[],
  projectId: string,
  vendorPoId: string,
  vendorId: string,
  serviceId: string,
  milestones: FlatVendorMilestone[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const m of milestones) {
    map.set(
      m.milestoneId,
      vendorBilledAmountForMilestone(
        invoices,
        projectId,
        vendorPoId,
        vendorId,
        serviceId,
        m,
      ),
    )
  }
  return map
}

export function remainingVendorMilestoneValue(billed: number, value: number): number {
  return Math.max(0, roundMoney(value - billed))
}

export type VendorMilestoneBillStatus = 'unbilled' | 'partial' | 'billed'

export function vendorMilestoneBillStatus(_billed: number, _value: number): VendorMilestoneBillStatus {
  if (_billed <= VENDOR_MONEY_EPS) return 'unbilled'
  return 'billed'
}

export function vendorMilestoneIsSelectable(billed: number, value: number): boolean {
  return remainingVendorMilestoneValue(billed, value) > VENDOR_MONEY_EPS
}

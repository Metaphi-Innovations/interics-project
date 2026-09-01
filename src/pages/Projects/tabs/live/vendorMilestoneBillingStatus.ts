import type { VendorInvoice } from '@/slices/live/types'
import {
  milestoneBillingStatusBadge,
  milestonePaymentStatusBadge,
  type MilestoneBillingPhase,
  type MilestonePaymentPhase,
} from './clientMilestoneBillingStatus'

export type VendorMilestoneBillingPhase = MilestoneBillingPhase
export type VendorMilestonePaymentPhase = MilestonePaymentPhase

export function isVendorDraftStatus(status: string): boolean {
  const s = status.trim().toLowerCase()
  return s === 'draft' || s === 'uploaded' || s === 'pending' || s === 'not_paid' || s === ''
}

export function vendorMilestoneBillingPhase(
  milestoneInvoices: VendorInvoice[],
): VendorMilestoneBillingPhase {
  if (milestoneInvoices.length === 0) return 'not_invoiced'
  const onlyDrafts =
    milestoneInvoices.length > 0 &&
    milestoneInvoices.every((inv) => isVendorDraftStatus(inv.status))
  if (onlyDrafts) return 'draft'
  return 'fully_invoiced'
}

/** Payment phase from actual vendor invoice payment outcomes only. */
export function vendorMilestonePaymentPhase(
  milestoneInvoices: VendorInvoice[],
): VendorMilestonePaymentPhase {
  if (milestoneInvoices.length === 0) return 'unpaid'
  const allPaid = milestoneInvoices.every((inv) => inv.status === 'paid')
  if (allPaid) return 'paid'
  const anyPaidOrPartial = milestoneInvoices.some(
    (inv) => inv.status === 'paid' || inv.status === 'partially_paid',
  )
  return anyPaidOrPartial ? 'partially_paid' : 'unpaid'
}

export const vendorMilestoneBillingStatusBadge = milestoneBillingStatusBadge
export const vendorMilestonePaymentStatusBadge = milestonePaymentStatusBadge

import type { Baseline, ClientPOMilestone, VendorPO } from '@/slices/baseline/reducer'
import type { ClientInvoice, ClientInvoiceLineItem, ClientInvoicePayment } from '@/slices/live/types'
import type { PitchService, VendorMapping } from '@/slices/pitch/reducer'
import type { Service } from '@/slices/settings/reducer'
import {
  resolveClientPoMilestoneGstRate,
  resolveClientServiceGstRate,
} from './clientPoGstResolution'
import { resolvePitchServiceGstRate } from './pitchGstDisplay'

export { resolveClientPoMilestoneGstRate, resolveClientServiceGstRate } from './clientPoGstResolution'
export type { ClientPoMilestoneGstContext } from './clientPoGstResolution'

export const MONEY_EPS = 0.01

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export interface LineItemTaxBreakdown {
  labourCessAmount: number
  taxableAmount: number
  gstAmount: number
  grossAmount: number
}

/** Base → labour cess → taxable → GST → gross (client invoice line). */
export function calcClientInvoiceTdsAmount(
  base: number,
  tdsRate: number | null | undefined,
): number {
  if (!tdsRate) return 0
  return roundMoney((base * tdsRate) / 100)
}

/** Net receivable for a pre-GST milestone base (base → GST → TDS on base). */
export function clientMilestoneNetPayable({
  baseAmount,
  gstRate,
  tdsRate,
  labourCessRate = 0,
}: {
  baseAmount: number
  gstRate: number
  tdsRate: number | null | undefined
  labourCessRate?: number
}): number {
  const { grossAmount } = computeLineItemTaxBreakdown(baseAmount, labourCessRate, gstRate)
  return roundMoney(grossAmount - calcClientInvoiceTdsAmount(baseAmount, tdsRate))
}

export function computeLineItemTaxBreakdown(
  baseAmount: number,
  labourCessRate: number,
  gstRate: number,
): LineItemTaxBreakdown {
  const labourCessAmount = roundMoney(baseAmount * (labourCessRate / 100))
  const taxableAmount = roundMoney(baseAmount + labourCessAmount)
  const gstAmount = roundMoney(taxableAmount * (gstRate / 100))
  const grossAmount = roundMoney(taxableAmount + gstAmount)
  return { labourCessAmount, taxableAmount, gstAmount, grossAmount }
}

export interface VendorMilestonePayableAmounts {
  base: number
  gstRate: number
  gstAmount: number
  tdsRate: number | null
  tdsAmount: number
  gross: number
  net: number
}

/**
 * Canonical Project Live Payable tax breakdown:
 * gross = base + GST; net = gross − vendor TDS (TDS on base).
 */
export function vendorMilestonePayableTaxBreakdown(
  baseAmount: number,
  serviceId: string,
  tdsRate: number | null | undefined,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
  vendorPo?: Pick<VendorPO, 'linkedVendorMappingId' | 'linkedBaselineServiceIds'>,
): VendorMilestonePayableAmounts {
  const gstRate = resolveVendorPayableServiceGstRate(
    serviceId,
    vendorPo,
    baseline,
    settingsServices,
  )
  const { gstAmount, grossAmount } = computeLineItemTaxBreakdown(baseAmount, 0, gstRate)
  const tdsAmount =
    tdsRate != null && tdsRate > 0 ? calcClientInvoiceTdsAmount(baseAmount, tdsRate) : 0
  return {
    base: baseAmount,
    gstRate,
    gstAmount,
    tdsRate: tdsRate ?? null,
    tdsAmount,
    gross: grossAmount,
    net: roundMoney(grossAmount - tdsAmount),
  }
}

export function vendorMilestonePayableNet(
  baseAmount: number,
  serviceId: string,
  tdsRate: number | null | undefined,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  return vendorMilestonePayableTaxBreakdown(
    baseAmount,
    serviceId,
    tdsRate,
    baseline,
    settingsServices,
  ).net
}

export interface InvoiceLineRollups {
  baseAmount: number
  labourCessAmount: number
  taxableAmount: number
  gstAmount: number
  grossAmount: number
  /** Blended labour cess % across lines (null when base is zero). */
  labourCessRatePercent: number | null
}

export function rollupsFromLineItems(lineItems: ClientInvoiceLineItem[]): InvoiceLineRollups {
  let labourCessAmount = 0
  let taxableAmount = 0
  let gstAmount = 0

  for (const li of lineItems) {
    const breakdown = computeLineItemTaxBreakdown(
      li.amount,
      li.labourCessRate ?? 0,
      li.gstRate,
    )
    labourCessAmount += breakdown.labourCessAmount
    taxableAmount += breakdown.taxableAmount
    gstAmount += breakdown.gstAmount
  }

  const baseAmount = roundMoney(lineItems.reduce((s, li) => s + li.amount, 0))
  labourCessAmount = roundMoney(labourCessAmount)
  taxableAmount = roundMoney(taxableAmount)
  gstAmount = roundMoney(gstAmount)
  const grossAmount = roundMoney(taxableAmount + gstAmount)
  const labourCessRatePercent =
    baseAmount > 0 ? roundMoney((labourCessAmount / baseAmount) * 100) : null

  return {
    baseAmount,
    labourCessAmount,
    taxableAmount,
    gstAmount,
    grossAmount,
    labourCessRatePercent,
  }
}

export function totalSettledFromPayments(payments: ClientInvoicePayment[]): number {
  return roundMoney(
    payments.reduce((s, p) => s + p.amountReceived + p.tdsDeducted, 0),
  )
}

export function totalReceivedBank(payments: ClientInvoicePayment[]): number {
  return roundMoney(payments.reduce((s, p) => s + p.amountReceived, 0))
}

export function totalTdsFromPayments(payments: ClientInvoicePayment[]): number {
  return roundMoney(payments.reduce((s, p) => s + p.tdsDeducted, 0))
}

export function balancePending(inv: ClientInvoice): number {
  const netPayable = roundMoney(inv.grossAmount - (inv.tdsAmount ?? 0));
  return roundMoney(netPayable - totalReceivedBank(inv.payments));
}

/** Project Live Receivable Amount Breakdown → Net (gross incl. GST/cess minus TDS). */
export function clientInvoiceAmountBreakdownNet(
  inv: ClientInvoice,
  poTdsRate?: number | null,
): number {
  const lines = inv.lineItems ?? []
  if (lines.length > 0) {
    let total = 0
    let hasLine = false
    for (const li of lines) {
      hasLine = true
      if (li.netAmount != null && Number.isFinite(li.netAmount)) {
        total += li.netAmount
        continue
      }
      const base = li.amount ?? 0
      const labour = li.labourCessAmount ?? 0
      const gst = li.gstAmount ?? 0
      const tds = li.tdsAmount ?? 0
      total += roundMoney(base + labour + gst - tds)
    }
    if (hasLine) return roundMoney(total)
  }

  const roll = rollupsFromLineItems(inv.lineItems);
  const effectiveTdsRate = inv.tdsRate ?? poTdsRate ?? null;
  const tdsAmount = calcClientInvoiceTdsAmount(roll.baseAmount, effectiveTdsRate);
  return roundMoney(roll.baseAmount + roll.labourCessAmount + inv.gstAmount - tdsAmount);
}

export function isInvoiceFullyPaid(inv: ClientInvoice): boolean {
  return balancePending(inv) <= MONEY_EPS
}

export function isDueDateOverdue(dueDate: string): boolean {
  const d = new Date(dueDate)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

/** Effective GST % for display when all lines share similar rate */
export function effectiveGstPercent(inv: ClientInvoice): string {
  const roll = rollupsFromLineItems(inv.lineItems)
  if (roll.taxableAmount <= 0) return '—'
  const pct = (100 * roll.gstAmount) / roll.taxableAmount
  return `${Math.round(pct * 10) / 10}%`
}

/** Blended labour cess % across invoice lines (null when base is zero). */
export function effectiveLabourCessPercent(inv: ClientInvoice): string {
  const roll = rollupsFromLineItems(inv.lineItems)
  if (roll.labourCessRatePercent == null) return '—'
  return `${roll.labourCessRatePercent}%`
}

function findBaselineService(
  baseline: Baseline | null,
  serviceId: string,
): PitchService | null {
  if (!baseline || !serviceId.trim()) return null
  for (const cat of baseline.categories ?? []) {
    for (const svc of cat.services ?? []) {
      if (svc.id === serviceId || svc.subcategoryId === serviceId) return svc
    }
  }
  return null
}

function findVendorMappingInBaseline(
  baseline: Baseline | null,
  mappingId: string,
): { service: PitchService; mapping: VendorMapping } | null {
  if (!baseline || !mappingId.trim()) return null
  for (const cat of baseline.categories ?? []) {
    for (const svc of cat.services ?? []) {
      const mapping = svc.vendorMappings?.find((m) => m.id === mappingId)
      if (mapping) return { service: svc, mapping }
    }
  }
  return null
}

/** Resolve vendor PO milestone service id for GST lookup. */
export function resolveVendorMilestoneServiceId(
  milestoneServiceId: string | undefined,
  vendorPo: Pick<VendorPO, 'linkedVendorMappingId' | 'linkedBaselineServiceIds'> | undefined,
  baseline: Baseline | null,
): string {
  const fromMilestone = milestoneServiceId?.trim()
  if (fromMilestone) return fromMilestone

  const mappingId = vendorPo?.linkedVendorMappingId?.trim()
  if (mappingId) {
    const linked = findVendorMappingInBaseline(baseline, mappingId)
    if (linked) {
      return linked.service.subcategoryId?.trim() || linked.service.id
    }
  }

  return vendorPo?.linkedBaselineServiceIds?.[0]?.trim() ?? ''
}

/** GST % for a vendor PO milestone (mapping override → pitch service → settings master). */
export function resolveVendorPayableServiceGstRate(
  serviceId: string,
  vendorPo: Pick<VendorPO, 'linkedVendorMappingId' | 'linkedBaselineServiceIds'> | undefined,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  const mappingId = vendorPo?.linkedVendorMappingId?.trim()
  if (mappingId) {
    const linked = findVendorMappingInBaseline(baseline, mappingId)
    if (linked) {
      if (linked.mapping.gstRate != null && !Number.isNaN(linked.mapping.gstRate)) {
        return linked.mapping.gstRate
      }
      return resolvePitchServiceGstRate(linked.service, settingsServices)
    }
  }

  return resolveClientServiceGstRate(serviceId, baseline, settingsServices)
}

/** Tax-inclusive gross for a pre-tax milestone base amount. */
export function clientMilestoneBaseGross(
  baseAmount: number,
  serviceId: string,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  const gstRate = resolveClientServiceGstRate(serviceId, baseline, settingsServices)
  return computeLineItemTaxBreakdown(baseAmount, 0, gstRate).grossAmount
}

/** Gross (base + GST) for a client PO milestone including retention. */
export function clientMilestoneGross(
  milestone: ClientPOMilestone,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  let gross = clientMilestoneBaseGross(
    milestone.value,
    milestone.serviceId,
    baseline,
    settingsServices,
  )
  if (milestone.retention?.value) {
    gross += clientMilestoneBaseGross(
      milestone.retention.value,
      milestone.serviceId,
      baseline,
      settingsServices,
    )
  }
  return roundMoney(gross)
}

export function invoiceLabourCessAmount(inv: {
  labourCessAmount?: number | null
  lineItems: Array<{ amount: number; labourCessRate?: number; gstRate: number }>
}): number {
  if (inv.labourCessAmount != null) return inv.labourCessAmount
  return roundMoney(
    inv.lineItems.reduce(
      (s, li) =>
        s +
        computeLineItemTaxBreakdown(li.amount, li.labourCessRate ?? 0, li.gstRate)
          .labourCessAmount,
      0,
    ),
  )
}

/** Preview client invoice line tax using PO gstRate (server recomputes on save). */
export function previewClientInvoiceLineTax(
  baseAmount: number,
  labourCessRate: number,
  gstRate: number,
  tdsRate: number | null | undefined,
): {
  labourCessAmount: number
  taxableAmount: number
  gstAmount: number
  tdsAmount: number
  netAmount: number
} {
  const labourCessAmount = roundMoney((baseAmount * labourCessRate) / 100)
  const taxableAmount = roundMoney(baseAmount + labourCessAmount)
  const gstAmount = roundMoney((taxableAmount * gstRate) / 100)
  const tdsAmount = calcClientInvoiceTdsAmount(baseAmount, tdsRate)
  const netAmount = roundMoney(baseAmount + labourCessAmount + gstAmount - tdsAmount)
  return { labourCessAmount, taxableAmount, gstAmount, tdsAmount, netAmount }
}

/** Preview vendor invoice line tax from PO milestone GST snapshot. */
export function previewVendorInvoiceLineTax(
  baseAmount: number,
  poMilestone: Pick<import('@/slices/baseline/reducer').VendorPOMilestone, 'value' | 'gstRate' | 'gstAmount'> | null,
  poGstRate: number | null | undefined,
  invoiceTdsRate: number,
): { gstRate: number; gstAmount: number; tdsAmount: number; netAmount: number } {
  const poBase = Number(poMilestone?.value) || 0
  const gstRate =
    poMilestone?.gstRate != null
      ? poMilestone.gstRate
      : poGstRate != null
        ? poGstRate
        : 0
  let gstAmount: number
  if (poMilestone?.gstAmount != null && poBase > 0) {
    gstAmount =
      Math.abs(baseAmount - poBase) <= 0.01
        ? roundMoney(poMilestone.gstAmount)
        : roundMoney((poMilestone.gstAmount * baseAmount) / poBase)
  } else {
    gstAmount = roundMoney((baseAmount * gstRate) / 100)
  }
  const tdsAmount = calcClientInvoiceTdsAmount(baseAmount, invoiceTdsRate)
  const netAmount = roundMoney(baseAmount + gstAmount - tdsAmount)
  return { gstRate, gstAmount, tdsAmount, netAmount }
}

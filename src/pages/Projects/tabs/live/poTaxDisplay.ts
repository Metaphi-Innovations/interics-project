import type { Baseline, ClientPOMilestone, ClientPORetention, VendorPOMilestone } from '@/slices/baseline/reducer'
import type { Service } from '@/slices/settings/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import { calcClientInvoiceTdsAmount, roundMoney } from './clientInvoiceUtils'
import { resolveClientServiceGstRate } from './clientPoGstResolution'
import { findVendorInvoicesForMilestone } from './milestonePaymentStatus'

export type PoTaxDisplayRow = {
  base: number
  gstRate: number | null
  gstAmount: number | null
  tdsRate: number | null
  tdsAmount: number | null
  net: number | null
  /** True when values come from persisted PO snapshot fields. */
  fromSnapshot: boolean
  /** True when GST values come from a linked vendor invoice. */
  gstFromInvoice?: boolean
}

function hasClientTaxSnapshot(row: {
  gstRate?: number
  gstAmount?: number
  tdsRate?: number
  tdsAmount?: number
  net?: number
}): boolean {
  return (
    row.gstRate != null &&
    row.gstAmount != null &&
    row.tdsRate != null &&
    row.tdsAmount != null &&
    row.net != null
  )
}

/** PO-level GST/TDS formulas (no labour cess). Mirrors server po-tax-engine. */
function previewClientPoTax(
  baseAmount: number,
  serviceId: string,
  globalTdsRate: number | null | undefined,
  baseline: Baseline | null,
  settingsServices: Service[],
): PoTaxDisplayRow {
  const gstRate = resolveClientServiceGstRate(serviceId, baseline, settingsServices)
  const gstAmount = roundMoney((baseAmount * gstRate) / 100)
  const effectiveTdsRate = globalTdsRate != null && Number.isFinite(globalTdsRate) ? globalTdsRate : 0
  const tdsAmount = calcClientInvoiceTdsAmount(baseAmount, effectiveTdsRate)
  const net = roundMoney(baseAmount + gstAmount - tdsAmount)
  return {
    base: baseAmount,
    gstRate,
    gstAmount,
    tdsRate: effectiveTdsRate,
    tdsAmount,
    net,
    fromSnapshot: false,
  }
}

function previewVendorPoTax(baseAmount: number, gstRate: number): PoTaxDisplayRow {
  const gstAmount = roundMoney((baseAmount * gstRate) / 100)
  const net = roundMoney(baseAmount + gstAmount)
  return {
    base: baseAmount,
    gstRate,
    gstAmount,
    tdsRate: null,
    tdsAmount: null,
    net,
    fromSnapshot: false,
  }
}

export function clientMilestoneTaxDisplay(
  milestone: Pick<
    ClientPOMilestone,
    'value' | 'serviceId' | 'gstRate' | 'gstAmount' | 'tdsRate' | 'tdsAmount' | 'net'
  >,
  globalTdsRate: number | null | undefined,
  previewContext?: {
    baseline: Baseline | null
    settingsServices: Service[]
  },
): PoTaxDisplayRow | null {
  const base = Number(milestone.value) || 0
  if (base <= 0) return null

  if (hasClientTaxSnapshot(milestone)) {
    return {
      base,
      gstRate: milestone.gstRate ?? null,
      gstAmount: milestone.gstAmount ?? null,
      tdsRate: milestone.tdsRate ?? null,
      tdsAmount: milestone.tdsAmount ?? null,
      net: milestone.net ?? null,
      fromSnapshot: true,
    }
  }

  if (!previewContext) return null
  return previewClientPoTax(
    base,
    milestone.serviceId,
    globalTdsRate,
    previewContext.baseline,
    previewContext.settingsServices,
  )
}

export function clientRetentionTaxDisplay(
  retention: ClientPORetention,
  serviceId: string,
  globalTdsRate: number | null | undefined,
  previewContext?: {
    baseline: Baseline | null
    settingsServices: Service[]
  },
): PoTaxDisplayRow | null {
  const base = Number(retention.value) || 0
  if (base <= 0) return null

  if (hasClientTaxSnapshot(retention)) {
    return {
      base,
      gstRate: retention.gstRate ?? null,
      gstAmount: retention.gstAmount ?? null,
      tdsRate: retention.tdsRate ?? null,
      tdsAmount: retention.tdsAmount ?? null,
      net: retention.net ?? null,
      fromSnapshot: true,
    }
  }

  if (!previewContext) return null
  return previewClientPoTax(base, serviceId, globalTdsRate, previewContext.baseline, previewContext.settingsServices)
}

function resolveVendorMilestoneInvoiceTax(
  milestone: Pick<VendorPOMilestone, 'id' | 'name' | 'value'>,
  invoices: VendorInvoice[],
  serviceId = '',
): PoTaxDisplayRow | null {
  const covering = findVendorInvoicesForMilestone(
    invoices,
    milestone.id,
    serviceId,
    milestone.name,
  )
  if (covering.length === 0) return null

  let base = 0
  let gstAmount = 0
  let gstRate: number | null = null
  let net: number | null = null

  for (const invoice of covering) {
    const lineItems = (invoice.lineItems ?? []).filter(
      (line) => line.milestoneId === milestone.id,
    )
    if (lineItems.length > 0) {
      for (const line of lineItems) {
        const lineBase = Number(line.amount) || 0
        base += lineBase
        gstAmount += Number(line.gstAmount) || 0
        if (line.gstRate != null && Number.isFinite(line.gstRate)) {
          gstRate = line.gstRate
        }
        if (line.netAmount != null && Number.isFinite(line.netAmount)) {
          net = (net ?? 0) + line.netAmount
        }
      }
      continue
    }

    if (invoice.milestoneId === milestone.id) {
      base += Number(invoice.baseAmount) || 0
      gstAmount += Number(invoice.gstAmount) || 0
      if (invoice.gstRate != null && Number.isFinite(invoice.gstRate)) {
        gstRate = invoice.gstRate
      }
      if (invoice.netPayable != null && Number.isFinite(invoice.netPayable)) {
        net = (net ?? 0) + invoice.netPayable
      }
    }
  }

  if (base <= 0 && gstAmount <= 0) return null

  return {
    base: roundMoney(base),
    gstRate,
    gstAmount: gstAmount > 0 ? roundMoney(gstAmount) : null,
    tdsRate: null,
    tdsAmount: null,
    net: net != null ? roundMoney(net) : null,
    fromSnapshot: false,
    gstFromInvoice: true,
  }
}

/** Preview vendor milestone tax from PO GST rate (create/edit forms only). */
export function vendorMilestoneTaxPreview(
  milestone: Pick<VendorPOMilestone, 'value' | 'gstRate' | 'gstAmount' | 'net'>,
  poGstRate: number | null | undefined,
): PoTaxDisplayRow | null {
  const base = Number(milestone.value) || 0
  if (base <= 0) return null
  if (poGstRate == null || !Number.isFinite(poGstRate)) return null
  return previewVendorPoTax(base, poGstRate)
}

/** Show vendor milestone GST only when applied on a linked invoice. */
export function vendorMilestoneTaxDisplay(
  milestone: Pick<VendorPOMilestone, 'id' | 'name' | 'value'>,
  invoiceContext: {
    invoices: VendorInvoice[]
    serviceId?: string
  },
): PoTaxDisplayRow | null {
  return resolveVendorMilestoneInvoiceTax(
    milestone,
    invoiceContext.invoices,
    invoiceContext.serviceId ?? '',
  )
}

export function formatGstRateLabel(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${rate}%`
}

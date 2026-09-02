import type { Baseline, ClientPOMilestone, ClientPORetention, VendorPOMilestone } from '@/slices/baseline/reducer'
import type { Service } from '@/slices/settings/reducer'
import { calcClientInvoiceTdsAmount, roundMoney } from './clientInvoiceUtils'
import { resolveClientServiceGstRate } from './clientPoGstResolution'

export type PoTaxDisplayRow = {
  base: number
  gstRate: number | null
  gstAmount: number | null
  tdsRate: number | null
  tdsAmount: number | null
  net: number | null
  /** True when values come from persisted PO snapshot fields. */
  fromSnapshot: boolean
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

function hasVendorTaxSnapshot(row: {
  gstRate?: number
  gstAmount?: number
  net?: number
}): boolean {
  return row.gstRate != null && row.gstAmount != null && row.net != null
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

export function vendorMilestoneTaxDisplay(
  milestone: Pick<VendorPOMilestone, 'value' | 'gstRate' | 'gstAmount' | 'net'>,
  poGstRate: number | null | undefined,
): PoTaxDisplayRow | null {
  const base = Number(milestone.value) || 0
  if (base <= 0) return null

  if (hasVendorTaxSnapshot(milestone)) {
    return {
      base,
      gstRate: milestone.gstRate ?? null,
      gstAmount: milestone.gstAmount ?? null,
      tdsRate: null,
      tdsAmount: null,
      net: milestone.net ?? null,
      fromSnapshot: true,
    }
  }

  if (poGstRate == null || !Number.isFinite(poGstRate)) return null
  return previewVendorPoTax(base, poGstRate)
}

export function formatGstRateLabel(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${rate}%`
}

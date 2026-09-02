import type { ClientPO, ClientPOMilestone, ClientPORetention, VendorPO } from '@/slices/baseline/reducer'

export type ClientPoTaxSnapshot = {
  base: number
  gstRate: number
  gstAmount: number
  labourCessRate: number
  labourCessAmount: number
  tdsRate: number | null
  tdsAmount: number
  net: number
}

function readClientTaxRow(
  row: Pick<
    ClientPOMilestone,
    'value' | 'gstRate' | 'gstAmount' | 'tdsRate' | 'tdsAmount' | 'labourCessRate' | 'labourCessAmount' | 'net'
  >,
): ClientPoTaxSnapshot | null {
  if (row.net == null || row.gstAmount == null || row.tdsAmount == null) return null
  return {
    base: Number(row.value) || 0,
    gstRate: Number(row.gstRate ?? 0),
    gstAmount: Number(row.gstAmount),
    labourCessRate: Number(row.labourCessRate ?? 0),
    labourCessAmount: Number(row.labourCessAmount ?? 0),
    tdsRate: row.tdsRate ?? null,
    tdsAmount: Number(row.tdsAmount),
    net: Number(row.net),
  }
}

function readRetentionSnapshot(retention: ClientPORetention): ClientPoTaxSnapshot | null {
  if (retention.net == null || retention.gstAmount == null || retention.tdsAmount == null) return null
  return {
    base: Number(retention.value) || 0,
    gstRate: Number(retention.gstRate ?? 0),
    gstAmount: Number(retention.gstAmount),
    labourCessRate: Number(retention.labourCessRate ?? 0),
    labourCessAmount: Number(retention.labourCessAmount ?? 0),
    tdsRate: retention.tdsRate ?? null,
    tdsAmount: Number(retention.tdsAmount),
    net: Number(retention.net),
  }
}

/** Resolve Client PO milestone/retention tax snapshot by billing milestone id. */
export function resolveClientPoMilestoneSnapshot(
  po: ClientPO | null | undefined,
  milestoneId: string,
): ClientPoTaxSnapshot | null {
  if (!po?.milestones?.length) return null
  const wanted = milestoneId.trim()
  if (!wanted) return null

  const isNestedRetention = wanted.endsWith('-retention')
  const parentId = isNestedRetention ? wanted.slice(0, -'-retention'.length) : ''

  for (const m of po.milestones) {
    if (isNestedRetention) {
      if (m.id !== parentId || !m.retention) continue
      return readRetentionSnapshot(m.retention)
    }
    if (m.id === wanted) {
      if (m.kind === 'retention' || m.id.startsWith('cli-ret-')) {
        return readClientTaxRow(m)
      }
      return readClientTaxRow(m)
    }
  }
  return null
}

export type VendorPoTaxSnapshot = {
  base: number
  gstRate: number
  gstAmount: number
  tdsRate: number | null
  tdsAmount: number
  net: number
}

export function resolveVendorPoMilestoneSnapshot(
  vendorPo: VendorPO | null | undefined,
  milestoneId: string,
): VendorPoTaxSnapshot | null {
  if (!vendorPo?.milestones?.length) return null
  const m = vendorPo.milestones.find((row) => row.id === milestoneId)
  if (!m || m.net == null || m.gstAmount == null) return null
  return {
    base: Number(m.value) || 0,
    gstRate: Number(m.gstRate ?? vendorPo.gstRate ?? 0),
    gstAmount: Number(m.gstAmount),
    tdsRate: m.tdsRate ?? null,
    tdsAmount: Number(m.tdsAmount ?? 0),
    net: Number(m.net),
  }
}

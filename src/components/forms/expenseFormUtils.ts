import type { VendorPO } from '@/slices/baseline/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import type { PitchService } from '@/slices/pitch/reducer'
import { vendorPoEffectiveValue } from '@/pages/Projects/tabs/live/vendorPOHelpers'

export function findServiceInBaseline(baseline: Baseline | null, serviceId: string): PitchService | undefined {
  if (!baseline) return undefined
  for (const cat of baseline.categories) {
    const s = cat.services.find((svc) => svc.id === serviceId)
    if (s) return s
  }
  return undefined
}

export function computeCommonAllocationsFromVendorPOs(
  amount: number,
  projectVendorPOs: VendorPO[],
): { vendorId: string; vendorName: string; allocationPercent: number; allocationAmount: number }[] {
  const rows = projectVendorPOs
  const byVendor = new Map<string, { name: string; sum: number }>()
  for (const p of rows) {
    const cur = byVendor.get(p.vendorId) ?? { name: p.vendorName, sum: 0 }
    cur.sum += vendorPoEffectiveValue(p)
    byVendor.set(p.vendorId, cur)
  }
  const list = [...byVendor.entries()].map(([vendorId, v]) => ({
    vendorId,
    vendorName: v.name,
    poSum: v.sum,
  }))
  const totalPo = list.reduce((s, x) => s + x.poSum, 0)
  if (totalPo <= 0 || list.length === 0 || amount <= 0) return []

  const rawPct = list.map((x) => ({
    ...x,
    pctRaw: (x.poSum / totalPo) * 100,
  }))
  const floors = rawPct.map((x) => Math.floor(x.pctRaw))
  let rem = 100 - floors.reduce((a, b) => a + b, 0)
  const order = rawPct
    .map((x, i) => ({ i, frac: x.pctRaw - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  const pct = [...floors]
  for (let k = 0; k < rem; k++) {
    const idx = order[k]?.i
    if (idx !== undefined) pct[idx] += 1
  }

  const roundedAmt = list.map((_, i) => Math.round((amount * (pct[i] ?? 0)) / 100))
  let sumRounded = roundedAmt.reduce((a, b) => a + b, 0)
  const target = Math.round(amount)
  const drift = target - sumRounded
  if (roundedAmt.length > 0) {
    roundedAmt[roundedAmt.length - 1] = (roundedAmt[roundedAmt.length - 1] ?? 0) + drift
  }

  return list.map((x, i) => ({
    vendorId: x.vendorId,
    vendorName: x.vendorName,
    allocationPercent: pct[i] ?? 0,
    allocationAmount: roundedAmt[i] ?? 0,
  }))
}

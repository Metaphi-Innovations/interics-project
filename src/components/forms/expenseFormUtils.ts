import type { VendorPO } from '@/slices/baseline/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import type { PitchService } from '@/slices/pitch/reducer'
import { vendorPoEffectiveValue } from '@/pages/Projects/tabs/live/vendorPOHelpers'

export type CommonExpenseSplitMethod = 'proportional_po' | 'equal'

export interface CommonExpenseAllocation {
  vendorId: string
  vendorName: string
  allocationPercent: number
  allocationAmount: number
}

export function findServiceInBaseline(baseline: Baseline | null, serviceId: string): PitchService | undefined {
  if (!baseline) return undefined
  for (const cat of baseline.categories) {
    const s = cat.services.find((svc) => svc.id === serviceId)
    if (s) return s
  }
  return undefined
}

/** Unique build vendors mapped on the project via vendor POs. */
export function getBuildVendorsFromPOs(
  projectVendorPOs: VendorPO[],
): { vendorId: string; vendorName: string; poSum: number }[] {
  const byVendor = new Map<string, { vendorName: string; poSum: number }>()
  for (const po of projectVendorPOs) {
    const cur = byVendor.get(po.vendorId) ?? { vendorName: po.vendorName, poSum: 0 }
    cur.poSum += vendorPoEffectiveValue(po)
    byVendor.set(po.vendorId, cur)
  }
  return [...byVendor.entries()]
    .map(([vendorId, v]) => ({
      vendorId,
      vendorName: v.vendorName,
      poSum: v.poSum,
    }))
    .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
}

function distributeRoundedAmounts(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  if (totalWeight <= 0 || weights.length === 0) return []

  const rawPct = weights.map((w) => (w / totalWeight) * 100)
  const floors = rawPct.map((p) => Math.floor(p))
  let rem = 100 - floors.reduce((a, b) => a + b, 0)
  const order = rawPct
    .map((p, i) => ({ i, frac: p - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  const pct = [...floors]
  for (let k = 0; k < rem; k++) {
    const idx = order[k]?.i
    if (idx !== undefined) pct[idx] += 1
  }

  const roundedAmt = pct.map((p) => Math.round((amount * p) / 100))
  const target = Math.round(amount)
  const drift = target - roundedAmt.reduce((a, b) => a + b, 0)
  if (roundedAmt.length > 0) {
    roundedAmt[roundedAmt.length - 1] = (roundedAmt[roundedAmt.length - 1] ?? 0) + drift
  }
  return roundedAmt
}

export function computeEqualSplitAllocations(
  amount: number,
  vendors: { vendorId: string; vendorName: string }[],
): CommonExpenseAllocation[] {
  if (amount <= 0 || vendors.length === 0) return []
  const weights = vendors.map(() => 1)
  const amounts = distributeRoundedAmounts(amount, weights)
  const pctEach = Math.floor(100 / vendors.length)
  let rem = 100 - pctEach * vendors.length

  return vendors.map((v, i) => ({
    vendorId: v.vendorId,
    vendorName: v.vendorName,
    allocationPercent: pctEach + (i < rem ? 1 : 0),
    allocationAmount: amounts[i] ?? 0,
  }))
}

export interface WeightedVendor {
  vendorId: string
  vendorName: string
  weight: number
}

export function computeProportionalAllocations(
  amount: number,
  vendors: WeightedVendor[],
): CommonExpenseAllocation[] {
  if (amount <= 0 || vendors.length === 0) return []

  const amounts = distributeRoundedAmounts(
    amount,
    vendors.map((v) => v.weight),
  )
  const totalWeight = vendors.reduce((s, v) => s + v.weight, 0)
  if (totalWeight <= 0) return []

  const rawPct = vendors.map((v) => (v.weight / totalWeight) * 100)
  const floors = rawPct.map((p) => Math.floor(p))
  let rem = 100 - floors.reduce((a, b) => a + b, 0)
  const order = rawPct
    .map((p, i) => ({ i, frac: p - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  const pct = [...floors]
  for (let k = 0; k < rem; k++) {
    const idx = order[k]?.i
    if (idx !== undefined) pct[idx] += 1
  }

  return vendors.map((v, i) => ({
    vendorId: v.vendorId,
    vendorName: v.vendorName,
    allocationPercent: pct[i] ?? 0,
    allocationAmount: amounts[i] ?? 0,
  }))
}

export function computeAllocationsForVendors(
  amount: number,
  vendors: WeightedVendor[],
  method: CommonExpenseSplitMethod,
): CommonExpenseAllocation[] {
  if (amount <= 0 || vendors.length === 0) return []
  if (method === 'equal') {
    return computeEqualSplitAllocations(amount, vendors)
  }
  return computeProportionalAllocations(amount, vendors)
}

export function computeCommonAllocationsFromVendorPOs(
  amount: number,
  projectVendorPOs: VendorPO[],
): CommonExpenseAllocation[] {
  const vendors = getBuildVendorsFromPOs(projectVendorPOs)
  return computeProportionalAllocations(
    amount,
    vendors.map((v) => ({ vendorId: v.vendorId, vendorName: v.vendorName, weight: v.poSum })),
  )
}

export function computeCommonExpenseAllocations(
  amount: number,
  projectVendorPOs: VendorPO[],
  method: CommonExpenseSplitMethod,
): CommonExpenseAllocation[] {
  const vendors = getBuildVendorsFromPOs(projectVendorPOs)
  return computeAllocationsForVendors(
    amount,
    vendors.map((v) => ({ vendorId: v.vendorId, vendorName: v.vendorName, weight: v.poSum })),
    method,
  )
}

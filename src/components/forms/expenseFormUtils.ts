import type { VendorPO } from '@/slices/baseline/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import type { PitchService } from '@/slices/pitch/reducer'

/** Contractual PO value for common-expense ratio weights (ignores executedValue). */
export function vendorPoContractualValue(po: Pick<VendorPO, 'poValue'>): number {
  return po.poValue
}

export type CommonExpenseSplitMethod = 'proportional_po' | 'equal'

export interface CommonExpenseAllocation {
  vendorId: string
  vendorName: string
  allocationPercent: number
  allocationAmount: number
  includedInRecovery?: boolean
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
    cur.poSum += vendorPoContractualValue(po)
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

export interface BuildVendorWeight {
  vendorId: string
  vendorName: string
  poSum: number
}

export function sameVendorIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  return b.every((id) => setA.has(id))
}

/** Sum contractual PO weight for selected vendors only. */
export function selectedBuildVendorPoWeight(
  buildVendors: BuildVendorWeight[],
  selectedVendorIds: string[],
): number {
  const selected = new Set(selectedVendorIds)
  return buildVendors
    .filter((v) => selected.has(v.vendorId))
    .reduce((s, v) => s + v.poSum, 0)
}

/** Expense-share percentage derived from allocated amount (for display only). */
export function expenseSharePercent(allocationAmount: number, expenseAmount: number): number {
  if (expenseAmount <= 0) return 0
  return Math.round((allocationAmount / expenseAmount) * 100)
}

/**
 * Common-expense rows with fixed PO Ratio (all build vendors) and normalized Expense Share
 * (selected vendors only). allocationPercent = PO Ratio; allocationAmount = Expense Share.
 */
export function computeExpenseShareAllocations(
  amount: number,
  buildVendors: BuildVendorWeight[],
  method: CommonExpenseSplitMethod,
  selectedVendorIds: string[],
): CommonExpenseAllocation[] {
  if (buildVendors.length === 0) return []

  const weighted = buildVendors.map((v) => ({
    vendorId: v.vendorId,
    vendorName: v.vendorName,
    weight: v.poSum,
  }))

  // PO Ratio — unchanged: proportional across ALL build vendors.
  const poRatioRows = computeAllocationsForVendors(100, weighted, method)
  const poRatioById = new Map(poRatioRows.map((r) => [r.vendorId, r.allocationPercent]))

  const selectedSet = new Set(selectedVendorIds)
  const selected = buildVendors.filter((v) => selectedSet.has(v.vendorId))

  const expenseAmountById = new Map<string, number>()
  if (amount > 0 && selected.length > 0) {
    const selectedWeights = selected.map((v) => v.poSum)
    const totalSelectedWeight = selectedWeights.reduce((s, w) => s + w, 0)
    if (totalSelectedWeight > 0) {
      const amounts = distributeRoundedAmounts(amount, selectedWeights)
      selected.forEach((v, i) => {
        expenseAmountById.set(v.vendorId, amounts[i] ?? 0)
      })
    }
  }

  return buildVendors.map((v) => ({
    vendorId: v.vendorId,
    vendorName: v.vendorName,
    allocationPercent: poRatioById.get(v.vendorId) ?? 0,
    allocationAmount: selectedSet.has(v.vendorId) ? (expenseAmountById.get(v.vendorId) ?? 0) : 0,
    includedInRecovery: selectedSet.has(v.vendorId),
  }))
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

/** PO Ratio + Expense Share when all build vendors participate (legacy/full-vendor path). */
export function computeCommonExpenseAllocations(
  amount: number,
  projectVendorPOs: VendorPO[],
  method: CommonExpenseSplitMethod,
): CommonExpenseAllocation[] {
  const vendorIds = getBuildVendorsFromPOs(projectVendorPOs).map((v) => v.vendorId)
  return computeCommonExpenseAllocationsWithSelection(amount, projectVendorPOs, method, vendorIds)
}

export function computeCommonExpenseAllocationsWithSelection(
  amount: number,
  projectVendorPOs: VendorPO[],
  method: CommonExpenseSplitMethod,
  selectedVendorIds: string[],
): CommonExpenseAllocation[] {
  return computeExpenseShareAllocations(
    amount,
    getBuildVendorsFromPOs(projectVendorPOs),
    method,
    selectedVendorIds,
  )
}

/** Preview/submit helper — preserves stored allocations on unchanged edit inputs. */
export function resolveCommonExpenseAllocations(params: {
  amount: number
  buildVendors: BuildVendorWeight[]
  projectVendorPOs?: VendorPO[]
  selectedVendorIds: string[]
  method: CommonExpenseSplitMethod
  preserveWhenUnchanged?: {
    amount: number
    selectedVendorIds: string[]
    vendorAllocations: CommonExpenseAllocation[]
  } | null
}): CommonExpenseAllocation[] {
  const {
    amount,
    buildVendors,
    projectVendorPOs,
    selectedVendorIds,
    method,
    preserveWhenUnchanged,
  } = params

  if (
    preserveWhenUnchanged &&
    amount === preserveWhenUnchanged.amount &&
    sameVendorIdSet(selectedVendorIds, preserveWhenUnchanged.selectedVendorIds) &&
    preserveWhenUnchanged.vendorAllocations.length > 0
  ) {
    const storedById = new Map(
      preserveWhenUnchanged.vendorAllocations.map((a) => [a.vendorId, a]),
    )
    const poRatioRows = computeExpenseShareAllocations(100, buildVendors, method, [])
    const poRatioById = new Map(poRatioRows.map((r) => [r.vendorId, r.allocationPercent]))

    return buildVendors.map((v) => {
      const stored = storedById.get(v.vendorId)
      const isSelected = selectedVendorIds.includes(v.vendorId)
      if (stored) {
        return {
          ...stored,
          allocationPercent: poRatioById.get(v.vendorId) ?? stored.allocationPercent,
          includedInRecovery: isSelected,
        }
      }
      return {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        allocationPercent: poRatioById.get(v.vendorId) ?? 0,
        allocationAmount: 0,
        includedInRecovery: isSelected,
      }
    })
  }

  if (projectVendorPOs && projectVendorPOs.length > 0) {
    return computeCommonExpenseAllocationsWithSelection(
      amount,
      projectVendorPOs,
      method,
      selectedVendorIds,
    )
  }

  return computeExpenseShareAllocations(amount, buildVendors, method, selectedVendorIds)
}

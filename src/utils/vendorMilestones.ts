import type { VendorMapping, VendorMilestone, VendorRetention } from '@/slices/pitch/reducer'

export const VENDOR_MILESTONE_PCT_EPS = 0.01

/** Legacy API stored retention as a milestone with `isRetention: true`. */
type LegacyVendorMilestone = VendorMilestone & { isRetention?: boolean }

/** Migrate legacy milestones + normalize defaults. */
export function normalizeVendorMapping(vm: VendorMapping): VendorMapping {
  const isMeasurable = vm.isMeasurable ?? false
  let retention: VendorRetention | undefined = vm.retention
  const regular: VendorMilestone[] = []

  const rawMilestones = vm.milestones as unknown as LegacyVendorMilestone[]
  for (const raw of rawMilestones ?? []) {
    const m = raw as LegacyVendorMilestone
    if (m.isRetention) {
      if (!retention) {
        retention = {
          percentage: m.percentage,
          amount: m.value,
        }
      }
      continue
    }
    regular.push({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
    })
  }

  return {
    ...vm,
    isMeasurable,
    milestones: regular,
    retention,
  }
}

export function sumVendorMilestonePercentages(m: VendorMapping): number {
  const milestones = m.milestones ?? []
  const fromMilestones = milestones.reduce((s, x) => s + x.percentage, 0)
  const fromRetention = m.retention?.percentage ?? 0
  return fromMilestones + fromRetention
}

export type VendorMilestoneValidation = {
  valid: boolean
  currentPct: number
  /** When invalid due to % total */
  pctMessage?: string
  /** When retention exists but no regular milestones */
  structureMessage?: string
}

/**
 * Option A: If any regular milestone OR retention exists, require >=1 regular milestone and total % === 100.
 * Empty milestones and no retention: valid (no breakdown yet).
 */
export function validateVendorMilestonePercents(m: VendorMapping): VendorMilestoneValidation {
  const milestones = m.milestones ?? []
  const hasRetention = Boolean(m.retention)
  const hasMilestones = milestones.length > 0
  const currentPct = sumVendorMilestonePercentages({ ...m, milestones })

  if (!hasRetention && !hasMilestones) {
    return { valid: true, currentPct: 0 }
  }

  if (hasRetention && milestones.length === 0) {
    return {
      valid: false,
      currentPct,
      structureMessage: 'Add at least one milestone before retention. Retention cannot be used alone.',
    }
  }

  if (Math.abs(currentPct - 100) >= VENDOR_MILESTONE_PCT_EPS) {
    return {
      valid: false,
      currentPct,
      pctMessage: `Total must equal 100% (currently ${currentPct.toFixed(1)}%)`,
    }
  }

  return { valid: true, currentPct }
}

export function vendorMappingMilestoneBlockInvalid(m: VendorMapping): boolean {
  return !validateVendorMilestonePercents(m).valid
}

/** Recompute rupee amounts from percentages and vendor allocation total. */
export function reapplyVendorAmountsFromPercentages(m: VendorMapping): VendorMapping {
  const total = m.value
  const milestones = (m.milestones ?? []).map((ms) => ({
    ...ms,
    value: Math.round((ms.percentage / 100) * total),
  }))
  const retention = m.retention
    ? {
        percentage: m.retention.percentage,
        amount: Math.round((m.retention.percentage / 100) * total),
      }
    : undefined
  return { ...m, milestones, retention }
}

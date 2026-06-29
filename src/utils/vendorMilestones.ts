import type {
  VendorFinalMilestone,
  VendorMapping,
  VendorMilestone,
  VendorRetention,
} from '@/slices/pitch/reducer'

export const VENDOR_MILESTONE_PCT_EPS = 0.01

/** Legacy API stored retention as a milestone with `isRetention: true`. */
type LegacyVendorMilestone = VendorMilestone & { isRetention?: boolean; isFinal?: boolean }

/** Migrate legacy milestones + normalize defaults. */
export function normalizeVendorMapping(vm: VendorMapping): VendorMapping {
  const isMeasurable = vm.isMeasurable ?? false
  let retention: VendorRetention | undefined = vm.retention
  let finalMilestone: VendorFinalMilestone | undefined = vm.finalMilestone
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
    if (m.isFinal) {
      if (!finalMilestone) {
        finalMilestone = {
          name: m.name,
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
    finalMilestone,
  }
}

export function sumVendorMilestonePercentages(m: VendorMapping): number {
  const milestones = m.milestones ?? []
  const fromMilestones = milestones.reduce((s, x) => s + x.percentage, 0)
  const fromRetention = m.retention?.percentage ?? 0
  const fromFinal = m.finalMilestone?.percentage ?? 0
  return fromMilestones + fromRetention + fromFinal
}

export type VendorMilestoneValidation = {
  valid: boolean
  currentPct: number
  /** When invalid due to % total */
  pctMessage?: string
  /** When retention/final exists but no regular milestones */
  structureMessage?: string
}

/**
 * If any regular milestone, retention, or final milestone exists, require >=1 regular milestone
 * and total % === 100. Empty breakdown: valid (no breakdown yet).
 */
export function validateVendorMilestonePercents(m: VendorMapping): VendorMilestoneValidation {
  const milestones = m.milestones ?? []
  const hasRetention = Boolean(m.retention)
  const hasFinalMilestone = Boolean(m.finalMilestone)
  const hasMilestones = milestones.length > 0
  const currentPct = sumVendorMilestonePercentages({ ...m, milestones })

  if (!hasRetention && !hasFinalMilestone && !hasMilestones) {
    return { valid: true, currentPct: 0 }
  }

  if ((hasRetention || hasFinalMilestone) && milestones.length === 0) {
    return {
      valid: false,
      currentPct,
      structureMessage:
        'Add at least one milestone before retention or final milestone. They cannot be used alone.',
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
export function isVendorRetentionMilestone(name: string): boolean {
  return name.trim().toLowerCase() === 'retention'
}

export function isVendorFinalMilestoneId(id: string): boolean {
  return id.startsWith('final-')
}

/** Stable id for retention slice when surfaced as a payable milestone row. */
export function retentionMilestoneId(vendorId: string, serviceId: string): string {
  return `retention-${vendorId}-${serviceId}`
}

/** Stable id for final milestone when surfaced as a payable milestone row. */
export function finalMilestoneId(vendorId: string, serviceId: string): string {
  return `final-${vendorId}-${serviceId}`
}

export function retentionAsMilestone(
  retention: VendorRetention,
  vendorId: string,
  serviceId: string,
): VendorMilestone {
  return {
    id: retentionMilestoneId(vendorId, serviceId),
    name: 'Retention',
    percentage: retention.percentage,
    value: retention.amount,
  }
}

export function finalAsMilestone(
  finalMilestone: VendorFinalMilestone,
  vendorId: string,
  serviceId: string,
): VendorMilestone {
  return {
    id: finalMilestoneId(vendorId, serviceId),
    name: finalMilestone.name,
    percentage: finalMilestone.percentage,
    value: finalMilestone.amount,
  }
}

/** Regular milestones plus retention and final milestone (when configured) for payables / invoicing. */
export function mappingMilestonesWithRetention(mapping: VendorMapping, serviceId: string): VendorMilestone[] {
  const normalized = normalizeVendorMapping(mapping)
  const milestones = [...(normalized.milestones ?? [])]
  const ret = normalized.retention
  if (ret && (ret.percentage > 0 || ret.amount > 0)) {
    milestones.push(retentionAsMilestone(ret, mapping.vendorId, serviceId))
  }
  const fin = normalized.finalMilestone
  if (fin && fin.name.trim() && (fin.percentage > 0 || fin.amount > 0)) {
    milestones.push(finalAsMilestone(fin, mapping.vendorId, serviceId))
  }
  return milestones
}

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
  const finalMilestone = m.finalMilestone
    ? {
        ...m.finalMilestone,
        amount: Math.round((m.finalMilestone.percentage / 100) * total),
      }
    : undefined
  return { ...m, milestones, retention, finalMilestone }
}

import type { ClientPOMilestone } from '@/slices/baseline/reducer'

export const CLIENT_PO_MILESTONE_PCT_EPS = 0.01

export type ClientPOMilestoneValidation = {
  valid: boolean
  currentPct: number
  pctMessage?: string
}

export function sumClientPOMilestonePercentages(milestones: ClientPOMilestone[]): number {
  return milestones.reduce((sum, m) => {
    if (m.kind === 'retention' || m.id.startsWith('cli-ret-')) {
      return sum + m.percentage
    }
    const retentionPct = m.retention?.percentage ?? 0
    return sum + m.percentage + retentionPct
  }, 0)
}

/** Milestone % plus per-milestone retention % must total 100% when any breakdown exists. */
export function validateClientPOMilestonePercents(
  milestones: ClientPOMilestone[],
): ClientPOMilestoneValidation {
  const named = milestones.filter((m) => m.name.trim())
  const hasBreakdown =
    named.length > 0 || named.some((m) => Boolean(m.retention))

  if (!hasBreakdown) {
    return { valid: true, currentPct: 0 }
  }

  const currentPct = sumClientPOMilestonePercentages(named)

  if (currentPct > 100 + CLIENT_PO_MILESTONE_PCT_EPS) {
    return {
      valid: false,
      currentPct,
      pctMessage: `Total must not exceed 100% (currently ${currentPct.toFixed(1)}%)`,
    }
  }

  return { valid: true, currentPct }
}

export function isClientPOMilestoneBreakdownValid(milestones: ClientPOMilestone[]): boolean {
  return validateClientPOMilestonePercents(milestones).valid
}

export function balanceLabel(totalPct: number): string {
  if (Math.abs(totalPct - 100) < CLIENT_PO_MILESTONE_PCT_EPS) return 'Balanced'
  if (totalPct < 100) return `Remaining ${(100 - totalPct).toFixed(1)}%`
  return `Exceeded ${(totalPct - 100).toFixed(1)}%`
}

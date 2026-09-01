import type { VendorPOMilestone } from '@/slices/baseline/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import { recalculateVendorPOMilestonesForExecutedValue } from './poExecutedValueRules'

export type VendorEditorMilestoneRow = {
  id: string
  name: string
  percentage: number
  value: number
}

export type VendorEditorRetentionRow = {
  percentage: number
  amount: number
}

function toPayload(
  milestones: VendorEditorMilestoneRow[],
  retention: VendorEditorRetentionRow | null,
  existingMilestones: VendorPOMilestone[],
): VendorPOMilestone[] {
  const existingById = new Map(existingMilestones.map((m) => [m.id, m]))
  const existingRetention = existingMilestones.find(
    (m) => m.kind === 'retention' || m.name.trim().toLowerCase() === 'retention',
  )

  const rows: VendorPOMilestone[] = milestones
    .filter((m) => m.name.trim())
    .map((m) => {
      const prev = existingById.get(m.id)
      return {
        id: m.id,
        name: m.name,
        percentage: m.percentage,
        value: m.value,
        dueDate: prev?.dueDate ?? null,
        status: prev?.status ?? ('Pending' as const),
        kind: 'regular' as const,
      }
    })

  if (retention && (retention.percentage > 0 || retention.amount > 0)) {
    rows.push({
      id: existingRetention?.id ?? `vpo-ret-${Date.now()}`,
      name: existingRetention?.name ?? 'Retention',
      percentage: retention.percentage,
      value: retention.amount,
      dueDate: existingRetention?.dueDate ?? null,
      status: existingRetention?.status ?? 'Pending',
      kind: 'retention',
    })
  }

  return rows
}

/**
 * Live form-state Executed Value redistribute (Receivable algorithm).
 * Preserves invoice-locked milestone values; updates unlocked values only.
 */
export function applyVendorEditorExecutedValue(
  milestones: VendorEditorMilestoneRow[],
  retention: VendorEditorRetentionRow | null,
  executedValue: number,
  invoices: VendorInvoice[],
  existingMilestones: VendorPOMilestone[] = [],
): {
  milestones: VendorEditorMilestoneRow[]
  retention: VendorEditorRetentionRow | null
} {
  if (!Number.isFinite(executedValue) || executedValue <= 0) {
    return { milestones, retention }
  }

  const payload = toPayload(milestones, retention, existingMilestones)
  if (payload.length === 0) return { milestones, retention }

  const recalculated = recalculateVendorPOMilestonesForExecutedValue(
    payload,
    executedValue,
    invoices,
  )

  const nextMilestones: VendorEditorMilestoneRow[] = []
  let nextRetention: VendorEditorRetentionRow | null = null

  for (const m of recalculated) {
    const kind =
      m.kind ?? (m.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
    if (kind === 'retention') {
      nextRetention = { percentage: m.percentage, amount: m.value }
      continue
    }
    nextMilestones.push({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
    })
  }

  return {
    milestones: nextMilestones,
    retention: nextRetention ?? (retention ? { ...retention, amount: 0 } : null),
  }
}

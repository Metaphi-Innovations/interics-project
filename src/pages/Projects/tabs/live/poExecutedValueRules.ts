import type { ClientPO, ClientPOMilestone, VendorPO, VendorPOMilestone } from '@/slices/baseline/reducer'
import type { ClientInvoice, VendorInvoice } from '@/slices/live/types'
import {
  clientMilestoneIsLocked,
  vendorMilestoneIsBilled,
  vendorMilestoneIsLocked,
} from './milestonePaymentStatus'

export interface POExecutedValueFields {
  poValue: number
  executedValue?: number | null
  executedValueLocked?: boolean
}

export function effectiveExecutedValue(po: POExecutedValueFields): number {
  return po.executedValue ?? po.poValue
}

function isClientRetentionRow(milestone: ClientPOMilestone): boolean {
  return milestone.kind === 'retention' || milestone.id.startsWith('cli-ret-')
}

/**
 * Redistribute target value across milestones:
 * - Locked (billed/paid) slots keep their value.
 * - Remaining is split among unlocked slots by percentage ratio.
 */
export function distributeUnpaidMilestoneValues(
  slots: { percentage: number; isLocked: boolean; value: number }[],
  targetValue: number,
): number[] {
  const lockedTotal = slots.filter((s) => s.isLocked).reduce((sum, s) => sum + s.value, 0)
  const unlockedIndexes = slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.isLocked)
  const unlockedPctTotal = unlockedIndexes.reduce((sum, { slot }) => sum + slot.percentage, 0)
  const remaining = Math.max(0, targetValue - lockedTotal)

  const next = slots.map((slot) => (slot.isLocked ? slot.value : 0))

  if (unlockedIndexes.length === 0 || unlockedPctTotal <= 0 || remaining <= 0) {
    return next
  }

  let assigned = 0
  unlockedIndexes.forEach(({ slot, index }, i) => {
    const isLast = i === unlockedIndexes.length - 1
    if (isLast) {
      next[index] = Math.max(0, remaining - assigned)
      return
    }
    const share = Math.round(remaining * (slot.percentage / unlockedPctTotal))
    next[index] = share
    assigned += share
  })

  return next
}

export function recalculateClientPOMilestonesForExecutedValue(
  milestones: ClientPOMilestone[],
  executedValue: number,
  invoices: ClientInvoice[],
): ClientPOMilestone[] {
  const result = milestones.map((m) => ({
    ...m,
    retention: m.retention ? { ...m.retention } : undefined,
  }))

  type ValueSlot = {
    percentage: number
    isLocked: boolean
    value: number
    apply: (nextValue: number) => void
  }

  const slots: ValueSlot[] = []

  for (const m of result) {
    if (isClientRetentionRow(m)) {
      const isLocked = clientMilestoneIsLocked(invoices, m.id, m.serviceId, m.name)
      slots.push({
        percentage: m.percentage,
        isLocked,
        value: m.value,
        apply: (nextValue) => {
          m.value = nextValue
        },
      })
      continue
    }

    const isLocked = clientMilestoneIsLocked(invoices, m.id, m.serviceId, m.name)
    slots.push({
      percentage: m.percentage,
      isLocked,
      value: m.value,
      apply: (nextValue) => {
        m.value = nextValue
      },
    })

    if (m.retention) {
      const retentionLocked = clientMilestoneIsLocked(
        invoices,
        `${m.id}-retention`,
        m.serviceId,
        `${m.name} — Retention`,
      )
      slots.push({
        percentage: m.retention.percentage,
        isLocked: retentionLocked,
        value: m.retention.value,
        apply: (nextValue) => {
          if (m.retention) m.retention.value = nextValue
        },
      })
    }
  }

  const nextValues = distributeUnpaidMilestoneValues(slots, executedValue)
  slots.forEach((slot, index) => slot.apply(nextValues[index] ?? slot.value))
  return result
}

export const recalculateClientPOMilestonesForPoValue = recalculateClientPOMilestonesForExecutedValue

export function recalculateVendorPOMilestonesForExecutedValue(
  milestones: VendorPOMilestone[],
  executedValue: number,
  invoices: VendorInvoice[],
): VendorPOMilestone[] {
  const result = milestones.map((m) => ({ ...m }))
  const slots = result.map((m) => ({
    percentage: m.percentage,
    isLocked: vendorMilestoneIsLocked(invoices, m.id, m.status, '', m.name),
    value: m.value,
  }))

  const nextValues = distributeUnpaidMilestoneValues(slots, executedValue)
  return result.map((m, index) => {
    if (vendorMilestoneIsLocked(invoices, m.id, m.status, '', m.name)) return m
    return {
      ...m,
      value: nextValues[index] ?? m.value,
    }
  })
}

export const recalculateVendorPOMilestonesForPoValue = recalculateVendorPOMilestonesForExecutedValue

export function clientPOHasBilledMilestone(
  milestones: ClientPOMilestone[],
  invoices: ClientInvoice[],
): boolean {
  return milestones.some((m) => {
    if (isClientRetentionRow(m)) {
      return clientMilestoneIsLocked(invoices, m.id, m.serviceId, m.name)
    }
    if (clientMilestoneIsLocked(invoices, m.id, m.serviceId, m.name)) return true
    if (!m.retention) return false
    return clientMilestoneIsLocked(
      invoices,
      `${m.id}-retention`,
      m.serviceId,
      `${m.name} — Retention`,
    )
  })
}

export function vendorPOHasBilledMilestone(
  milestones: VendorPOMilestone[],
  invoices: VendorInvoice[],
): boolean {
  // Structure lock (STATE 2): any invoice covering this PO's milestone IDs.
  // ID-only — do not use milestone.status or cross-PO name matching.
  return milestones.some((m) => vendorMilestoneIsBilled(invoices, m.id))
}

export function clientPOMilestonesAreProtected(
  existing: ClientPOMilestone[],
  next: ClientPOMilestone[] | undefined,
  invoices: ClientInvoice[],
): boolean {
  if (!next) return false
  for (const m of existing) {
    if (!clientMilestoneIsLocked(invoices, m.id, m.serviceId, m.name)) continue
    const n = next.find((x) => x.id === m.id)
    if (!n) return true
    if (
      n.name !== m.name ||
      n.percentage !== m.percentage ||
      n.value !== m.value ||
      n.serviceId !== m.serviceId ||
      n.serviceName !== m.serviceName
    ) {
      return true
    }
  }
  return false
}

export function vendorPOMilestonesAreProtected(
  existing: VendorPOMilestone[],
  next: VendorPOMilestone[] | undefined,
  invoices: VendorInvoice[],
): boolean {
  if (!next) return false
  const hasBilled = vendorPOHasBilledMilestone(existing, invoices)
  if (hasBilled) {
    if (existing.length !== next.length) return true
    for (const m of existing) {
      const n = next.find((x) => x.id === m.id)
      if (!n) return true
      if (n.name !== m.name || n.percentage !== m.percentage) return true
      if (vendorMilestoneIsLocked(invoices, m.id, m.status, '', m.name) && n.value !== m.value) {
        return true
      }
    }
    return false
  }
  for (const m of existing) {
    if (!vendorMilestoneIsLocked(invoices, m.id, m.status, '', m.name)) continue
    const n = next.find((x) => x.id === m.id)
    if (!n) return true
    if (n.name !== m.name || n.percentage !== m.percentage || n.value !== m.value) return true
  }
  return false
}

export function mergeClientPOUpdate(
  existing: ClientPO,
  body: Partial<ClientPO>,
  options?: { invoices?: ClientInvoice[] },
): { ok: true; po: ClientPO } | { ok: false; message: string } {
  const invoices = options?.invoices ?? []
  const hasBilled = clientPOHasBilledMilestone(existing.milestones ?? [], invoices)

  if (hasBilled && body.poValue != null && body.poValue !== existing.poValue) {
    return { ok: false, message: 'PO value cannot be changed when milestones are billed or paid.' }
  }

  if (body.executedValue != null) {
    if (!Number.isFinite(body.executedValue) || body.executedValue <= 0) {
      return { ok: false, message: 'Executed value must be a positive number.' }
    }
  }

  const nextMilestones = body.milestones ?? existing.milestones
  if (clientPOMilestonesAreProtected(existing.milestones ?? [], nextMilestones, invoices)) {
    return { ok: false, message: 'Billed or paid milestones cannot be modified or removed.' }
  }

  if (body.executedValue != null && hasBilled) {
    const lockedTotal = (existing.milestones ?? [])
      .filter((m) => clientMilestoneIsLocked(invoices, m.id, m.serviceId, m.name))
      .reduce((sum, m) => sum + m.value + (m.retention?.value ?? 0), 0)
    if (body.executedValue < lockedTotal - 0.01) {
      return {
        ok: false,
        message: 'Executed value cannot be less than the total of billed or paid milestones.',
      }
    }
  }

  return {
    ok: true,
    po: {
      ...existing,
      ...body,
      ...(body.milestones !== undefined ? { milestones: body.milestones } : {}),
    },
  }
}

export function mergeVendorPOUpdate(
  existing: VendorPO,
  body: Partial<VendorPO>,
  options?: { invoices?: VendorInvoice[] },
): { ok: true; po: VendorPO } | { ok: false; message: string } {
  const invoices = options?.invoices ?? []
  const hasBilled = vendorPOHasBilledMilestone(existing.milestones ?? [], invoices)

  if (hasBilled && body.poValue != null && body.poValue !== existing.poValue) {
    return { ok: false, message: 'PO value cannot be changed when milestones are billed or paid.' }
  }

  if (body.executedValue != null) {
    if (!Number.isFinite(body.executedValue) || body.executedValue <= 0) {
      return { ok: false, message: 'Executed value must be a positive number.' }
    }
  }

  const nextMilestones = body.milestones ?? existing.milestones
  if (vendorPOMilestonesAreProtected(existing.milestones ?? [], nextMilestones, invoices)) {
    return {
      ok: false,
      message: 'Milestone cannot be deleted because it has invoice or payment activity.',
    }
  }

  if (body.executedValue != null && hasBilled) {
    const lockedTotal = (existing.milestones ?? [])
      .filter((m) => vendorMilestoneIsLocked(invoices, m.id, m.status, '', m.name))
      .reduce((sum, m) => sum + m.value, 0)
    if (body.executedValue < lockedTotal - 0.01) {
      return {
        ok: false,
        message: 'Executed value cannot be less than the total of billed or paid milestones.',
      }
    }
  }

  return {
    ok: true,
    po: {
      ...existing,
      ...body,
      ...(body.milestones !== undefined ? { milestones: body.milestones } : {}),
    },
  }
}

export function canDeleteClientPO(
  milestones: ClientPOMilestone[],
  invoices: ClientInvoice[],
): boolean {
  return !clientPOHasBilledMilestone(milestones, invoices)
}

export function canDeleteVendorPO(
  milestones: VendorPOMilestone[],
  invoices: VendorInvoice[],
): boolean {
  return !vendorPOHasBilledMilestone(milestones, invoices)
}

/** @deprecated Use billed-milestone rules instead */
export function canUpdateExecutedValue(_po: POExecutedValueFields | null | undefined): boolean {
  return true
}

/** @deprecated One-time lock removed */
export function buildClientPOExecutedValueUpdatePayload(
  executedValue: number,
  milestones: ClientPOMilestone[],
): Pick<ClientPO, 'executedValue' | 'milestones'> {
  return { executedValue, milestones }
}

/** @deprecated One-time lock removed */
export function buildVendorPOExecutedValueUpdatePayload(
  executedValue: number,
  milestones: VendorPOMilestone[],
): Pick<VendorPO, 'executedValue' | 'milestones'> {
  return { executedValue, milestones }
}

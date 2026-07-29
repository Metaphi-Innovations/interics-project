import type { ClientPO, ClientPOMilestone, VendorPO, VendorPOMilestone } from '@/slices/baseline/reducer'
import type { ClientInvoice, VendorInvoice } from '@/slices/live/types'
import { clientMilestonePaymentStatus, vendorMilestonePaymentStatus } from './milestonePaymentStatus'

export interface POExecutedValueFields {
  poValue: number
  executedValue?: number | null
  executedValueLocked?: boolean
}

export function effectiveExecutedValue(po: POExecutedValueFields): number {
  return po.executedValue ?? po.poValue
}

export function canUpdateExecutedValue(po: POExecutedValueFields | null | undefined): boolean {
  if (!po) return false
  return !po.executedValueLocked
}

export function buildExecutedValueUpdatePayload(
  executedValue: number,
): Pick<POExecutedValueFields, 'executedValue' | 'executedValueLocked'> {
  return {
    executedValue,
    executedValueLocked: true,
  }
}

function isClientRetentionRow(milestone: ClientPOMilestone): boolean {
  return milestone.kind === 'retention' || milestone.id.startsWith('cli-ret-')
}

/**
 * Redistribute `poValue` across milestones:
 * - Paid slots keep their original value (locked).
 * - Remaining = poValue − total paid is split among unpaid slots
 *   preserving their original percentage ratio.
 * - Rounding remainder is applied to the last unpaid slot so
 *   paid + unpaid always equals `poValue`.
 */
export function distributeUnpaidMilestoneValues(
  slots: { percentage: number; isPaid: boolean; value: number }[],
  poValue: number,
): number[] {
  const paidTotal = slots.filter((s) => s.isPaid).reduce((sum, s) => sum + s.value, 0)
  const unpaidIndexes = slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.isPaid)
  const unpaidPctTotal = unpaidIndexes.reduce((sum, { slot }) => sum + slot.percentage, 0)
  const remaining = Math.max(0, poValue - paidTotal)

  const next = slots.map((slot) => (slot.isPaid ? slot.value : 0))

  if (unpaidIndexes.length === 0 || unpaidPctTotal <= 0 || remaining <= 0) {
    return next
  }

  let assigned = 0
  unpaidIndexes.forEach(({ slot, index }, i) => {
    const isLast = i === unpaidIndexes.length - 1
    if (isLast) {
      next[index] = Math.max(0, remaining - assigned)
      return
    }
    const share = Math.round(remaining * (slot.percentage / unpaidPctTotal))
    next[index] = share
    assigned += share
  })

  return next
}

/** Recalculate unpaid milestone values; paid milestones keep their amounts. */
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
    isPaid: boolean
    value: number
    apply: (nextValue: number) => void
  }

  const slots: ValueSlot[] = []

  for (const m of result) {
    if (isClientRetentionRow(m)) {
      const isPaid = clientMilestonePaymentStatus(invoices, m.id, m.serviceId) === 'Paid'
      slots.push({
        percentage: m.percentage,
        isPaid,
        value: m.value,
        apply: (nextValue) => {
          m.value = nextValue
        },
      })
      continue
    }

    const isPaid = clientMilestonePaymentStatus(invoices, m.id, m.serviceId) === 'Paid'
    slots.push({
      percentage: m.percentage,
      isPaid,
      value: m.value,
      apply: (nextValue) => {
        m.value = nextValue
      },
    })

    if (m.retention) {
      // Nested retention rows are not independently invoiceable; keep them unpaid
      // so they participate in remaining-value redistribution with unpaid work.
      slots.push({
        percentage: m.retention.percentage,
        isPaid: false,
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

/** Alias — PO value / executed value drive the same paid-lock redistribute. */
export const recalculateClientPOMilestonesForPoValue =
  recalculateClientPOMilestonesForExecutedValue

/** Recalculate unpaid milestone values; paid milestones keep amounts and status. */
export function recalculateVendorPOMilestonesForExecutedValue(
  milestones: VendorPOMilestone[],
  executedValue: number,
  invoices: VendorInvoice[],
): VendorPOMilestone[] {
  const result = milestones.map((m) => ({ ...m }))
  const slots = result.map((m) => ({
    percentage: m.percentage,
    isPaid:
      m.status === 'Paid' || vendorMilestonePaymentStatus(invoices, m.id) === 'Paid',
    value: m.value,
  }))

  const nextValues = distributeUnpaidMilestoneValues(slots, executedValue)
  return result.map((m, index) => {
    const isPaid =
      m.status === 'Paid' || vendorMilestonePaymentStatus(invoices, m.id) === 'Paid'
    if (isPaid) {
      // Preserve percentage, value, and status exactly as at payment time.
      return m
    }
    return {
      ...m,
      value: nextValues[index] ?? m.value,
    }
  })
}

/** Alias — PO value / executed value drive the same paid-lock redistribute. */
export const recalculateVendorPOMilestonesForPoValue =
  recalculateVendorPOMilestonesForExecutedValue

export function buildClientPOExecutedValueUpdatePayload(
  executedValue: number,
  milestones: ClientPOMilestone[],
): Pick<ClientPO, 'poValue' | 'executedValue' | 'executedValueLocked' | 'milestones'> {
  return {
    poValue: executedValue,
    executedValue,
    executedValueLocked: true,
    milestones,
  }
}

export function buildVendorPOExecutedValueUpdatePayload(
  executedValue: number,
  milestones: VendorPOMilestone[],
): Pick<VendorPO, 'poValue' | 'executedValue' | 'executedValueLocked' | 'milestones'> {
  return {
    poValue: executedValue,
    executedValue,
    executedValueLocked: true,
    milestones,
  }
}

export function clientPOHasPaidMilestone(
  milestones: ClientPOMilestone[],
  invoices: ClientInvoice[],
): boolean {
  return milestones.some(
    (m) => clientMilestonePaymentStatus(invoices, m.id, m.serviceId) === 'Paid',
  )
}

export function vendorPOHasPaidMilestone(milestones: VendorPOMilestone[]): boolean {
  return milestones.some((m) => m.status === 'Paid')
}

/** Reject milestone mutations when any milestone is paid. */
export function clientPOMilestonesAreProtected(
  existing: ClientPOMilestone[],
  next: ClientPOMilestone[] | undefined,
  invoices: ClientInvoice[],
): boolean {
  if (!next || !clientPOHasPaidMilestone(existing, invoices)) return false
  if (existing.length !== next.length) return true
  return existing.some((m) => {
    if (clientMilestonePaymentStatus(invoices, m.id, m.serviceId) !== 'Paid') return false
    const n = next.find((x) => x.id === m.id)
    if (!n) return true
    return (
      n.name !== m.name ||
      n.percentage !== m.percentage ||
      n.value !== m.value ||
      n.serviceId !== m.serviceId ||
      n.serviceName !== m.serviceName
    )
  })
}

export function vendorPOMilestonesAreProtected(
  existing: VendorPOMilestone[],
  next: VendorPOMilestone[] | undefined,
): boolean {
  if (!next || !vendorPOHasPaidMilestone(existing)) return false
  if (existing.length !== next.length) return true
  return existing.some((m) => {
    if (m.status !== 'Paid') return false
    const n = next.find((x) => x.id === m.id)
    if (!n) return true
    return n.name !== m.name || n.percentage !== m.percentage || n.value !== m.value
  })
}

export function mergeClientPOUpdate(
  existing: ClientPO,
  body: Partial<ClientPO>,
  options?: { invoices?: ClientInvoice[] },
): { ok: true; po: ClientPO } | { ok: false; message: string } {
  if (body.executedValueLocked === true && body.executedValue != null) {
    if (existing.executedValueLocked) {
      return { ok: false, message: 'Executed value has already been updated and is locked.' }
    }
    if (!Number.isFinite(body.executedValue) || body.executedValue <= 0) {
      return { ok: false, message: 'Executed value must be a positive number.' }
    }
    const nextMilestones = body.milestones ?? existing.milestones
    if (
      clientPOMilestonesAreProtected(existing.milestones ?? [], nextMilestones, options?.invoices ?? [])
    ) {
      return { ok: false, message: 'Paid milestones cannot be modified.' }
    }
    return {
      ok: true,
      po: {
        ...existing,
        ...(body.poValue != null ? { poValue: body.poValue } : {}),
        executedValue: body.executedValue,
        executedValueLocked: true,
        milestones: nextMilestones,
      },
    }
  }

  if (existing.executedValueLocked) {
    const lockedKeys: (keyof ClientPO)[] = [
      'poNumber',
      'poValue',
      'executedValue',
      'milestones',
      'documentUrl',
      'fileName',
      'startDate',
      'endDate',
    ]
    for (const key of lockedKeys) {
      if (key in body && body[key] !== undefined && body[key] !== existing[key]) {
        return { ok: false, message: 'This PO is locked and cannot be modified.' }
      }
    }
  }

  if (body.milestones) {
    const existingMilestones = existing.milestones ?? []
    const milestonesChanged =
      JSON.stringify(existingMilestones) !== JSON.stringify(body.milestones)
    if (milestonesChanged && existing.executedValueLocked) {
      return { ok: false, message: 'This PO is locked and cannot be modified.' }
    }
  }

  if (
    clientPOMilestonesAreProtected(
      existing.milestones ?? [],
      body.milestones,
      options?.invoices ?? [],
    )
  ) {
    return { ok: false, message: 'Paid milestones cannot be modified.' }
  }

  return { ok: true, po: { ...existing, ...body } }
}

export function mergeVendorPOUpdate(
  existing: VendorPO,
  body: Partial<VendorPO>,
): { ok: true; po: VendorPO } | { ok: false; message: string } {
  if (body.executedValueLocked === true && body.executedValue != null) {
    if (existing.executedValueLocked) {
      return { ok: false, message: 'Executed value has already been updated and is locked.' }
    }
    if (!Number.isFinite(body.executedValue) || body.executedValue <= 0) {
      return { ok: false, message: 'Executed value must be a positive number.' }
    }
    const nextMilestones = body.milestones ?? existing.milestones
    if (vendorPOMilestonesAreProtected(existing.milestones, nextMilestones)) {
      return { ok: false, message: 'Paid milestones cannot be modified.' }
    }
    return {
      ok: true,
      po: {
        ...existing,
        ...(body.poValue != null ? { poValue: body.poValue } : {}),
        executedValue: body.executedValue,
        executedValueLocked: true,
        milestones: nextMilestones,
      },
    }
  }

  if (existing.executedValueLocked) {
    const lockedKeys: (keyof VendorPO)[] = [
      'poNumber',
      'poDate',
      'poValue',
      'executedValue',
      'milestones',
      'documentUrl',
      'fileName',
      'vendorId',
      'vendorName',
      'paymentTerms',
      'linkedBaselineServiceIds',
      'linkedVendorMappingId',
    ]
    for (const key of lockedKeys) {
      if (key in body && body[key] !== undefined && body[key] !== existing[key]) {
        return { ok: false, message: 'This PO is locked and cannot be modified.' }
      }
    }
  }

  if (vendorPOMilestonesAreProtected(existing.milestones, body.milestones)) {
    return { ok: false, message: 'Paid milestones cannot be modified.' }
  }

  return { ok: true, po: { ...existing, ...body } }
}

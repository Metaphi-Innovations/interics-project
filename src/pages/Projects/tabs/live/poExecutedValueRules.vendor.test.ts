import { describe, expect, it, vi } from 'vitest'

vi.mock('./clientInvoiceUtils', () => ({
  isInvoiceFullyPaid: (inv: { status: string }) => inv.status === 'paid',
}))

import type { VendorInvoice } from '@/slices/live/types'
import {
  mergeVendorPOUpdate,
  recalculateVendorPOMilestonesForExecutedValue,
  vendorPOHasBilledMilestone,
} from './poExecutedValueRules'
import { applyVendorEditorExecutedValue } from './applyVendorEditorExecutedValue'

type VendorMilestone = {
  id: string
  name: string
  percentage: number
  value: number
  dueDate: string | null
  status: 'Paid' | 'Pending' | 'Overdue'
  kind?: 'regular' | 'retention'
}

function vendorInvoice(
  partial: Partial<VendorInvoice> & Pick<VendorInvoice, 'id' | 'milestoneId'>,
): VendorInvoice {
  return {
    projectId: 'proj-1',
    vendorId: 'v1',
    vendorName: 'Vendor',
    serviceId: 'svc-1',
    serviceName: 'Service',
    milestoneName: 'M1',
    invoiceNumber: 'VIN-1',
    invoiceDate: '2026-08-01',
    baseAmount: 40000,
    tdsRate: 0,
    tdsAmount: 0,
    netPayable: 40000,
    status: 'pending',
    ...partial,
  }
}

const baseMilestones: VendorMilestone[] = [
  { id: 'm1', name: 'M1', percentage: 40, value: 40000, dueDate: null, status: 'Pending', kind: 'regular' },
  { id: 'm2', name: 'M2', percentage: 50, value: 50000, dueDate: null, status: 'Pending', kind: 'regular' },
  {
    id: 'ret',
    name: 'Retention',
    percentage: 10,
    value: 10000,
    dueDate: null,
    status: 'Pending',
    kind: 'retention',
  },
]

function basePo(milestones = baseMilestones) {
  return {
    id: 'vpo-1',
    projectId: 'proj-1',
    vendorId: 'v1',
    vendorName: 'Vendor',
    poNumber: 'VPO-1',
    poDate: '2026-08-01',
    poValue: 100000,
    executedValue: 100000,
    milestones,
    status: 'Issued' as const,
    linkedBaselineServiceIds: [] as string[],
  }
}

describe('recalculateVendorPOMilestonesForExecutedValue', () => {
  it('allocates normally when no invoices', () => {
    const next = recalculateVendorPOMilestonesForExecutedValue(baseMilestones, 100000, [])
    expect(next.map((m) => m.value)).toEqual([40000, 50000, 10000])
  })

  it('preserves invoiced milestone value and redistributes remaining', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1', milestoneName: 'M1' })]
    const next = recalculateVendorPOMilestonesForExecutedValue(baseMilestones, 80000, invoices)
    expect(next.find((m) => m.id === 'm1')?.value).toBe(40000)
    expect(next.find((m) => m.id === 'm2')?.value).toBe(33333)
    expect(next.find((m) => m.id === 'ret')?.value).toBe(6667)
    expect(next.reduce((s, m) => s + m.value, 0)).toBe(80000)
  })

  it('preserves multiple invoiced milestones', () => {
    const invoices = [
      vendorInvoice({ id: 'inv-1', milestoneId: 'm1' }),
      vendorInvoice({ id: 'inv-2', milestoneId: 'm2', milestoneName: 'M2' }),
    ]
    const next = recalculateVendorPOMilestonesForExecutedValue(baseMilestones, 95000, invoices)
    expect(next.find((m) => m.id === 'm1')?.value).toBe(40000)
    expect(next.find((m) => m.id === 'm2')?.value).toBe(50000)
    expect(next.find((m) => m.id === 'ret')?.value).toBe(5000)
  })

  it('does not change values when all milestones are invoiced', () => {
    const invoices = [
      vendorInvoice({ id: 'inv-1', milestoneId: 'm1' }),
      vendorInvoice({ id: 'inv-2', milestoneId: 'm2' }),
      vendorInvoice({ id: 'inv-3', milestoneId: 'ret', milestoneName: 'Retention' }),
    ]
    const next = recalculateVendorPOMilestonesForExecutedValue(baseMilestones, 120000, invoices)
    expect(next.map((m) => m.value)).toEqual([40000, 50000, 10000])
  })

  it('locks by milestone name fallback when ids differ', () => {
    const invoices = [
      vendorInvoice({
        id: 'inv-name',
        milestoneId: 'other-id',
        milestoneName: 'M1',
        serviceId: 'svc-1',
      }),
    ]
    const next = recalculateVendorPOMilestonesForExecutedValue(baseMilestones, 80000, invoices)
    expect(next.find((m) => m.id === 'm1')?.value).toBe(40000)
    expect(next.find((m) => m.id === 'm2')?.value).not.toBe(50000)
  })

  it('assigns rounding remainder to the final unlocked milestone', () => {
    const milestones: VendorMilestone[] = [
      { id: 'm1', name: 'M1', percentage: 33.33, value: 33330, dueDate: null, status: 'Pending', kind: 'regular' },
      { id: 'm2', name: 'M2', percentage: 33.33, value: 33330, dueDate: null, status: 'Pending', kind: 'regular' },
      { id: 'm3', name: 'M3', percentage: 33.34, value: 33340, dueDate: null, status: 'Pending', kind: 'regular' },
    ]
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1', milestoneName: 'M1' })]
    const next = recalculateVendorPOMilestonesForExecutedValue(milestones, 90000, invoices)
    expect(next[0]?.value).toBe(33330)
    expect(next.reduce((s, m) => s + m.value, 0)).toBe(90000)
  })
})

describe('mergeVendorPOUpdate', () => {
  it('rejects executed value below locked total', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1' })]
    const result = mergeVendorPOUpdate(
      basePo() as never,
      { executedValue: 30000, milestones: baseMilestones as never },
      { invoices },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/cannot be less than/i)
  })

  it('rejects mutation of invoiced milestone structure', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1' })]
    const next = baseMilestones.map((m) =>
      m.id === 'm1' ? { ...m, percentage: 30, value: 30000 } : m,
    )
    const result = mergeVendorPOUpdate(basePo() as never, { milestones: next as never }, { invoices })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/cannot be modified/i)
  })

  it('rejects changing non-invoiced percentage when any milestone is invoiced', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1' })]
    const next = baseMilestones.map((m) =>
      m.id === 'm2' ? { ...m, percentage: 60, value: 60000 } : m,
    )
    const result = mergeVendorPOUpdate(basePo() as never, { milestones: next as never }, { invoices })
    expect(result.ok).toBe(false)
  })

  it('allows unlocked value changes when percentages are unchanged', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1' })]
    const next = baseMilestones.map((m) => {
      if (m.id === 'm1') return m
      if (m.id === 'm2') return { ...m, value: 33333 }
      return { ...m, value: 6667 }
    })
    const result = mergeVendorPOUpdate(
      basePo() as never,
      { executedValue: 80000, milestones: next as never },
      { invoices },
    )
    expect(result.ok).toBe(true)
  })

  it('allows editing non-invoiced milestones', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1' })]
    const next = baseMilestones.map((m) =>
      m.id === 'm2' ? { ...m, name: 'M2 Updated' } : m,
    )
    const result = mergeVendorPOUpdate(basePo() as never, { milestones: next as never }, { invoices })
    // Name change is structure — must be rejected when any invoice exists
    expect(result.ok).toBe(false)
  })

  it('unlocks after covering invoice is removed', () => {
    expect(vendorPOHasBilledMilestone(baseMilestones as never, [])).toBe(false)
    const result = mergeVendorPOUpdate(
      basePo() as never,
      {
        milestones: baseMilestones.map((m) =>
          m.id === 'm1' ? { ...m, percentage: 35, value: 35000 } : m,
        ) as never,
      },
      { invoices: [] },
    )
    expect(result.ok).toBe(true)
  })

  it('STATE 1: no invoice coverage → structure unlocked even if status is Paid', () => {
    const paidMilestones = baseMilestones.map((m) => ({ ...m, status: 'Paid' as const }))
    expect(vendorPOHasBilledMilestone(paidMilestones as never, [])).toBe(false)
    const result = mergeVendorPOUpdate(
      { ...basePo(), milestones: paidMilestones } as never,
      {
        milestones: paidMilestones.map((m) =>
          m.id === 'm2' ? { ...m, name: 'M2 Renamed', percentage: 45, value: 45000 } : m,
        ) as never,
      },
      { invoices: [] },
    )
    expect(result.ok).toBe(true)
  })

  it('STATE 1: cross-PO name match alone does not structure-lock this PO', () => {
    // Invoice covers a different milestone id that happens to share the name "M1"
    const foreignInvoice = vendorInvoice({
      id: 'inv-other-po',
      milestoneId: 'other-po-m1',
      milestoneName: 'M1',
    })
    expect(vendorPOHasBilledMilestone(baseMilestones as never, [foreignInvoice])).toBe(false)
  })

  it('STATE 2: any ID-covered milestone structure-locks the PO', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1' })]
    expect(vendorPOHasBilledMilestone(baseMilestones as never, invoices)).toBe(true)
    const result = mergeVendorPOUpdate(
      basePo() as never,
      {
        milestones: baseMilestones.map((m) =>
          m.id === 'm2' ? { ...m, percentage: 55, value: 55000 } : m,
        ) as never,
      },
      { invoices },
    )
    expect(result.ok).toBe(false)
  })
})

describe('applyVendorEditorExecutedValue (live form)', () => {
  it('updates values immediately when EV changes', () => {
    const next = applyVendorEditorExecutedValue(
      [
        { id: 'm1', name: 'M1', percentage: 40, value: 24000 },
        { id: 'm2', name: 'M2', percentage: 50, value: 30000 },
      ],
      { percentage: 10, amount: 6000 },
      80000,
      [],
    )
    expect(next.milestones.map((m) => m.value)).toEqual([32000, 40000])
    expect(next.retention?.amount).toBe(8000)
  })

  it('preserves locked values while redistributing live', () => {
    const invoices = [vendorInvoice({ id: 'inv-1', milestoneId: 'm1' })]
    const next = applyVendorEditorExecutedValue(
      [
        { id: 'm1', name: 'M1', percentage: 40, value: 40000 },
        { id: 'm2', name: 'M2', percentage: 50, value: 50000 },
      ],
      { percentage: 10, amount: 10000 },
      80000,
      invoices,
      baseMilestones,
    )
    expect(next.milestones.find((m) => m.id === 'm1')?.value).toBe(40000)
    expect(next.milestones.find((m) => m.id === 'm2')?.value).toBe(33333)
    expect(next.retention?.amount).toBe(6667)
  })
})

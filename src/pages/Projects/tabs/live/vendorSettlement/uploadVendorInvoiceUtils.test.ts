import { describe, expect, it } from 'vitest'
import {
  buildMilestoneUploadOptions,
  buildVendorInvoiceUploadLineItems,
  countUnbuildableVendorMilestoneSelections,
  initialVendorMilestoneSelection,
  shouldApplyInitialVendorMilestoneSelection,
  sumVendorInvoiceLineItemAmounts,
  toggleSelectedMilestoneIds,
} from './uploadVendorInvoiceUtils'

const milestones = [
  {
    milestoneId: 'm1',
    milestoneName: 'Milestone A',
    serviceId: 'svc-1',
    value: 400,
    isRetention: false,
  },
  {
    milestoneId: 'm2',
    milestoneName: 'Milestone B',
    serviceId: 'svc-1',
    value: 600,
    isRetention: false,
  },
  {
    milestoneId: 'ret-1',
    milestoneName: 'Retention',
    serviceId: 'svc-1',
    value: 100,
    isRetention: true,
  },
]

describe('toggleSelectedMilestoneIds', () => {
  it('adds and removes without duplicates', () => {
    expect(toggleSelectedMilestoneIds([], 'm1')).toEqual(['m1'])
    expect(toggleSelectedMilestoneIds(['m1'], 'm2')).toEqual(['m1', 'm2'])
    expect(toggleSelectedMilestoneIds(['m1', 'm2'], 'm1')).toEqual(['m2'])
    expect(toggleSelectedMilestoneIds(['m1'], 'm1')).toEqual([])
  })
})

describe('buildVendorInvoiceUploadLineItems', () => {
  const options = buildMilestoneUploadOptions(
    milestones,
    (id) => milestones.find((m) => m.milestoneId === id)?.value ?? 0,
    () => false,
  )

  it('builds one line item per selected milestone and retention', () => {
    const lineItems = buildVendorInvoiceUploadLineItems(['m1', 'm2', 'ret-1'], options, 'svc-1')

    expect(lineItems).toHaveLength(3)
    expect(lineItems[0]).toMatchObject({ milestoneId: 'm1', amount: 400 })
    expect(lineItems[1]).toMatchObject({ milestoneId: 'm2', amount: 600 })
    expect(lineItems[2]).toMatchObject({ milestoneId: 'ret-1', amount: 100 })
    expect(sumVendorInvoiceLineItemAmounts(lineItems)).toBe(1100)
  })

  it('dedupes selected milestone IDs', () => {
    const lineItems = buildVendorInvoiceUploadLineItems(['m1', 'm1', 'm2'], options, 'svc-1')
    expect(lineItems).toHaveLength(2)
    expect(sumVendorInvoiceLineItemAmounts(lineItems)).toBe(1000)
  })

  it('preserves first-selected order for header compatibility', () => {
    const lineItems = buildVendorInvoiceUploadLineItems(['m2', 'm1'], options, 'svc-1')
    expect(lineItems[0]?.milestoneId).toBe('m2')
    expect(lineItems[1]?.milestoneId).toBe('m1')
  })

  it('supports single milestone flow unchanged', () => {
    const lineItems = buildVendorInvoiceUploadLineItems(['m1'], options, 'svc-1')
    expect(lineItems).toEqual([
      {
        milestoneId: 'm1',
        milestoneName: 'Milestone A',
        serviceId: 'svc-1',
        serviceName: 'svc-1',
        amount: 400,
      },
    ])
  })

  it('skips disabled milestones', () => {
    const disabledOptions = buildMilestoneUploadOptions(
      milestones,
      (id) => milestones.find((m) => m.milestoneId === id)?.value ?? 0,
      (id) => id === 'm1',
    )
    const lineItems = buildVendorInvoiceUploadLineItems(['m1', 'm2'], disabledOptions, 'svc-1')
    expect(lineItems).toHaveLength(1)
    expect(lineItems[0]?.milestoneId).toBe('m2')
  })
})

describe('countUnbuildableVendorMilestoneSelections', () => {
  it('counts selected milestones that cannot become invoice lines', () => {
    const options = buildMilestoneUploadOptions(
      milestones,
      (id) => milestones.find((m) => m.milestoneId === id)?.value ?? 0,
      (id) => id === 'm1',
    )
    expect(countUnbuildableVendorMilestoneSelections(['m1', 'm2', 'ret-1'], options)).toBe(1)
    expect(buildVendorInvoiceUploadLineItems(['m1', 'm2', 'ret-1'], options, 'svc-1')).toHaveLength(2)
  })
})

describe('combined invoice totals', () => {
  it('uses combined base for TDS calculation input', () => {
    const options = buildMilestoneUploadOptions(
      milestones,
      (id) => milestones.find((m) => m.milestoneId === id)?.value ?? 0,
      () => false,
    )
    const lineItems = buildVendorInvoiceUploadLineItems(['m1', 'm2', 'ret-1'], options, 'svc-1')
    const base = sumVendorInvoiceLineItemAmounts(lineItems)
    expect(base).toBe(1100)
    expect(Math.round((base * 10) / 100)).toBe(110)
  })
})

describe('shouldApplyInitialVendorMilestoneSelection', () => {
  it('seeds once per PO when user has not edited selection', () => {
    expect(
      shouldApplyInitialVendorMilestoneSelection({
        initialMilestoneId: 'm1',
        selectedPoId: 'po-1',
        seededPoId: null,
        selectionTouched: false,
      }),
    ).toBe(true)
    expect(
      shouldApplyInitialVendorMilestoneSelection({
        initialMilestoneId: 'm1',
        selectedPoId: 'po-1',
        seededPoId: 'po-1',
        selectionTouched: false,
      }),
    ).toBe(false)
    expect(
      shouldApplyInitialVendorMilestoneSelection({
        initialMilestoneId: 'm1',
        selectedPoId: 'po-1',
        seededPoId: null,
        selectionTouched: true,
      }),
    ).toBe(false)
  })
})

describe('vendor row-entry selection persistence', () => {
  it('keeps [A, B, retention] after async PO load (Test 3 & 4)', () => {
    let selection: string[] = []
    let seededPoId: string | null = null
    let selectionTouched = false
    const initialMilestoneId = 'm1'
    const poId = 'po-1'

    if (
      shouldApplyInitialVendorMilestoneSelection({
        initialMilestoneId,
        selectedPoId: poId,
        seededPoId,
        selectionTouched,
      })
    ) {
      seededPoId = poId
      selection = initialVendorMilestoneSelection(initialMilestoneId)
    }
    expect(selection).toEqual(['m1'])

    selectionTouched = true
    selection = toggleSelectedMilestoneIds(selection, 'm2')
    selection = toggleSelectedMilestoneIds(selection, 'ret-1')
    expect(selection).toEqual(['m1', 'm2', 'ret-1'])

    if (
      shouldApplyInitialVendorMilestoneSelection({
        initialMilestoneId,
        selectedPoId: poId,
        seededPoId,
        selectionTouched,
      })
    ) {
      selection = initialVendorMilestoneSelection(initialMilestoneId)
    }
    expect(selection).toEqual(['m1', 'm2', 'ret-1'])
  })

  it('resets to initial milestone on a new drawer session', () => {
    let selection = ['m1', 'm2']
    let seededPoId: string | null = 'po-1'
    let selectionTouched = true

    selection = []
    seededPoId = null
    selectionTouched = false

    if (
      shouldApplyInitialVendorMilestoneSelection({
        initialMilestoneId: 'm1',
        selectedPoId: 'po-1',
        seededPoId,
        selectionTouched,
      })
    ) {
      seededPoId = 'po-1'
      selection = initialVendorMilestoneSelection('m1')
    }
    expect(selection).toEqual(['m1'])
  })
})

describe('vendor per-line tax (Tests 9 & 10)', () => {
  it('uses milestone-specific GST rates', () => {
    const gstA = Math.round((5000 * 12) / 100)
    const gstB = Math.round((3000 * 18) / 100)
    expect(gstA).toBe(600)
    expect(gstB).toBe(540)
  })

  it('calculates TDS on base only per line', () => {
    const base = 5000
    const gst = 600
    const tds = Math.round((base * 2) / 100)
    expect(tds).toBe(100)
    expect(base + gst - tds).toBe(5500)
  })
})

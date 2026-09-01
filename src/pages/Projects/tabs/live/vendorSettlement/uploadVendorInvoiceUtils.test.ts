import { describe, expect, it } from 'vitest'
import {
  buildMilestoneUploadOptions,
  buildVendorInvoiceUploadLineItems,
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

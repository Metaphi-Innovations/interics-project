import { describe, expect, it } from 'vitest'
import {
  buildVendorSelectOptions,
  vendorIdAfterBuildVendorChange,
  paidByVendorIdAfterBuildVendorChange,
  shouldResetLiveProjectDependentFields,
  sortActiveVendorOptions,
} from './expenseFormStateUtils'
import { getBuildVendorsFromPOs } from './expenseFormUtils'
import {
  computeCommonExpenseAllocationsWithSelection,
  expenseSharePercent,
} from './expenseFormUtils'

describe('sortActiveVendorOptions', () => {
  it('returns all active vendors sorted by name for dropdown use', () => {
    const vendors = [
      { id: 'v2', name: 'Zeta Vendors' },
      { id: 'v1', name: 'Alpha Vendors' },
      { id: 'v3', name: 'Beta Vendors' },
    ]

    expect(sortActiveVendorOptions(vendors)).toEqual([
      { id: 'v1', name: 'Alpha Vendors' },
      { id: 'v3', name: 'Beta Vendors' },
      { id: 'v2', name: 'Zeta Vendors' },
    ])
  })

  it('preserves a selected vendor that remains in the canonical list', () => {
    const vendors = sortActiveVendorOptions([
      { id: 'selected-vendor', name: 'Selected Vendor' },
      { id: 'other-vendor', name: 'Other Vendor' },
    ])

    expect(vendors.find((v) => v.id === 'selected-vendor')).toEqual({
      id: 'selected-vendor',
      name: 'Selected Vendor',
    })
  })
})

describe('shouldResetLiveProjectDependentFields', () => {
  it('does not reset on initial mount', () => {
    expect(shouldResetLiveProjectDependentFields(undefined, '')).toBe(false)
    expect(shouldResetLiveProjectDependentFields(undefined, 'project-a')).toBe(false)
  })

  it('does not reset when project is unchanged', () => {
    expect(shouldResetLiveProjectDependentFields('project-a', 'project-a')).toBe(false)
  })

  it('resets project-dependent fields when project changes in create mode', () => {
    expect(shouldResetLiveProjectDependentFields('', 'project-a')).toBe(true)
    expect(shouldResetLiveProjectDependentFields('project-a', 'project-b')).toBe(true)
  })
})

describe('buildVendorSelectOptions', () => {
  it('maps project build vendors to sorted select options', () => {
    expect(
      buildVendorSelectOptions([
        { vendorId: 'v-b', vendorName: 'Vendor B' },
        { vendorId: 'v-a', vendorName: 'Vendor A' },
      ]),
    ).toEqual([
      { id: 'v-a', name: 'Vendor A' },
      { id: 'v-b', name: 'Vendor B' },
    ])
  })

  it('excludes vendors not on the project build vendor list', () => {
    const projectOptions = buildVendorSelectOptions([
      { vendorId: 'v-a', vendorName: 'Vendor A' },
    ])
    const globalOptions = sortActiveVendorOptions([
      { id: 'v-a', name: 'Vendor A' },
      { id: 'v-global', name: 'Global Vendor' },
    ])

    expect(projectOptions.map((v) => v.id)).toEqual(['v-a'])
    expect(globalOptions.map((v) => v.id)).toContain('v-global')
    expect(projectOptions.map((v) => v.id)).not.toContain('v-global')
  })
})

describe('vendorIdAfterBuildVendorChange', () => {
  it('keeps vendor when it remains on the project build vendor list', () => {
    expect(vendorIdAfterBuildVendorChange('v-a', ['v-a', 'v-b'])).toBe('v-a')
  })

  it('clears vendor when it is not on the new project build vendor list', () => {
    expect(vendorIdAfterBuildVendorChange('v-old', ['v-a', 'v-b'])).toBe('')
  })

  it('leaves empty vendor unchanged', () => {
    expect(vendorIdAfterBuildVendorChange('', ['v-a'])).toBe('')
  })
})

describe('paidByVendorIdAfterBuildVendorChange', () => {
  it('keeps Paid By when vendor remains on the project', () => {
    expect(paidByVendorIdAfterBuildVendorChange('v-a', ['v-a', 'v-b'])).toBe('v-a')
  })

  it('clears Paid By when vendor is not on the new project', () => {
    expect(paidByVendorIdAfterBuildVendorChange('v-old', ['v-a', 'v-b'])).toBe('')
  })

  it('leaves empty Paid By unchanged', () => {
    expect(paidByVendorIdAfterBuildVendorChange('', ['v-a'])).toBe('')
  })
})

describe('Vendor Linked vs Common Expense project vendor source', () => {
  it('uses the same build vendor options for Vendor Linked and Paid By', () => {
    const pos = [
      {
        id: 'po-a',
        projectId: 'p1',
        vendorId: 'v-a',
        vendorName: 'Vendor A',
        poNumber: 'PO-A',
        poDate: '2026-01-01',
        poValue: 50,
        milestones: [],
        status: 'Issued' as const,
      },
      {
        id: 'po-b',
        projectId: 'p1',
        vendorId: 'v-b',
        vendorName: 'Vendor B',
        poNumber: 'PO-B',
        poDate: '2026-01-01',
        poValue: 25,
        milestones: [],
        status: 'Issued' as const,
      },
    ]

    const buildVendors = getBuildVendorsFromPOs(pos)
    const vendorLinkedOptions = buildVendorSelectOptions(buildVendors)
    const paidByOptions = buildVendorSelectOptions(buildVendors)
    const globalOptions = sortActiveVendorOptions([
      { id: 'v-a', name: 'Vendor A' },
      { id: 'v-global', name: 'Global Vendor' },
    ])

    expect(vendorLinkedOptions).toEqual(paidByOptions)
    expect(vendorLinkedOptions.map((v) => v.id)).toEqual(['v-a', 'v-b'])
    expect(globalOptions.map((v) => v.id)).toContain('v-global')
    expect(vendorLinkedOptions.map((v) => v.id)).not.toContain('v-global')
  })

  it('clears Vendor Linked selection when project build vendors change', () => {
    expect(vendorIdAfterBuildVendorChange('v-a', ['v-a', 'v-b'])).toBe('v-a')
    expect(vendorIdAfterBuildVendorChange('v-a', ['v-b'])).toBe('')
  })
})

describe('Paid By independence from Allocated To allocation', () => {
  const pos = [
    {
      id: 'po-a',
      projectId: 'p1',
      vendorId: 'v-a',
      vendorName: 'Vendor A',
      poNumber: 'PO-A',
      poDate: '2026-01-01',
      poValue: 50,
      milestones: [],
      status: 'Issued' as const,
    },
    {
      id: 'po-b',
      projectId: 'p1',
      vendorId: 'v-b',
      vendorName: 'Vendor B',
      poNumber: 'PO-B',
      poDate: '2026-01-01',
      poValue: 25,
      milestones: [],
      status: 'Issued' as const,
    },
    {
      id: 'po-c',
      projectId: 'p1',
      vendorId: 'v-c',
      vendorName: 'Vendor C',
      poNumber: 'PO-C',
      poDate: '2026-01-01',
      poValue: 25,
      milestones: [],
      status: 'Issued' as const,
    },
  ]

  it('does not change PO Ratio or Expense Share based on Paid By selection', () => {
    const selected = ['v-a', 'v-b']
    const rows = computeCommonExpenseAllocationsWithSelection(1000, pos, 'proportional_po', selected)
    const byId = Object.fromEntries(rows.map((r) => [r.vendorId, r]))

    expect(byId['v-a']?.allocationPercent).toBe(50)
    expect(byId['v-b']?.allocationPercent).toBe(25)
    expect(byId['v-c']?.allocationPercent).toBe(25)
    expect(byId['v-a']?.allocationAmount).toBe(670)
    expect(byId['v-b']?.allocationAmount).toBe(330)
    expect(expenseSharePercent(byId['v-a']!.allocationAmount, 1000)).toBe(67)
    expect(expenseSharePercent(byId['v-b']!.allocationAmount, 1000)).toBe(33)
  })
})

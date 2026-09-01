import { describe, expect, it } from 'vitest'
import type { VendorPO } from '@/slices/baseline/reducer'
import type { PitchCategory } from '@/slices/pitch/reducer'
import {
  resolveMasterCategoryServiceIds,
  vendorPOCardsFromMilestones,
} from './vendorPOCardHydration'
import { vendorPOCategoryLabel } from './vendorPOCatalog'

const categoryOptions = [{ id: 'master-cat-1', label: 'Build Services' }]
const serviceOptions = [
  { id: 'master-svc-1', label: 'Design', categoryId: 'master-cat-1' },
]

function makeBaselineCategories(): PitchCategory[] {
  return [
    {
      id: 'cat-1',
      categoryId: 'master-cat-1',
      categoryName: 'Build Services',
      totalValue: 100,
      services: [
        {
          id: 'svc-1',
          name: 'Design',
          subcategoryId: 'master-svc-1',
          subcategoryName: 'Design',
          customName: null,
          value: 100,
          clientMilestones: [],
          vendorMappings: [],
          milestonesTotal: 0,
        },
      ],
    },
  ]
}

describe('resolveMasterCategoryServiceIds', () => {
  it('maps direct master service id to category and service', () => {
    expect(
      resolveMasterCategoryServiceIds('master-svc-1', categoryOptions, serviceOptions, null),
    ).toEqual({ categoryId: 'master-cat-1', serviceId: 'master-svc-1' })
  })

  it('maps baseline linked id via master selection', () => {
    expect(
      resolveMasterCategoryServiceIds(
        'svc-1',
        categoryOptions,
        serviceOptions,
        { categories: makeBaselineCategories() },
      ),
    ).toEqual({ categoryId: 'master-cat-1', serviceId: 'master-svc-1' })
  })
})

describe('vendorPOCardsFromMilestones', () => {
  const po: Pick<VendorPO, 'milestones' | 'linkedBaselineServiceIds'> = {
    linkedBaselineServiceIds: ['master-svc-1'],
    milestones: [
      {
        id: 'm-1',
        name: 'Advance',
        percentage: 50,
        value: 5000,
        dueDate: null,
        status: 'Pending',
        kind: 'regular',
      },
      {
        id: 'ret-1',
        name: 'Retention',
        percentage: 10,
        value: 1000,
        dueDate: null,
        status: 'Pending',
        kind: 'retention',
      },
    ],
  }

  it('hydrates milestone and retention cards with category and service', () => {
    const { milestoneCards, retentionCards } = vendorPOCardsFromMilestones(
      po,
      categoryOptions,
      serviceOptions,
      null,
    )

    expect(milestoneCards).toHaveLength(1)
    expect(milestoneCards[0]?.categoryId).toBe('master-cat-1')
    expect(milestoneCards[0]?.serviceId).toBe('master-svc-1')
    expect(milestoneCards[0]?.milestones[0]?.name).toBe('Advance')

    expect(retentionCards).toHaveLength(1)
    expect(retentionCards[0]?.categoryId).toBe('master-cat-1')
    expect(retentionCards[0]?.serviceId).toBe('master-svc-1')
    expect(retentionCards[0]?.name).toBe('Retention')
  })
})

describe('vendorPOCategoryLabel with master catalog', () => {
  it('resolves category from master catalog when baseline is absent', () => {
    const po = {
      linkedBaselineServiceIds: ['master-svc-1'],
    } as VendorPO

    expect(
      vendorPOCategoryLabel(po, null, {
        categories: [{ value: 'master-cat-1', label: 'Build Services' }],
        services: [{ value: 'master-svc-1', label: 'Design', categoryId: 'master-cat-1' }],
      }),
    ).toBe('Build Services')
  })
})

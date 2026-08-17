import { describe, expect, it } from 'vitest'
import type { PitchCategory } from '@/slices/pitch/reducer'
import type { TransitionDraft } from '@/utils/transitionDraft'
import {
  formatGoLiveBlockMessage,
  pitchHasClientOfferService,
  pitchHasVendorOffer,
  validateGoLiveMinimum,
} from '@/utils/transitionFinalize'

const emptyCategories: PitchCategory[] = []

const clientOfferOnly: PitchCategory[] = [
  {
    id: 'pc-1',
    categoryId: 'cat-1',
    categoryName: 'Design',
    totalValue: 1000,
    services: [
      {
        id: 'ps-1',
        name: '',
        subcategoryId: null,
        subcategoryName: null,
        customName: null,
        value: 1000,
        clientMilestones: [],
        vendorMappings: [],
        milestonesTotal: 0,
      },
    ],
  },
]

const vendorOfferOnly: PitchCategory[] = [
  {
    id: 'pc-1',
    categoryId: 'cat-1',
    categoryName: 'Design',
    totalValue: 0,
    services: [
      {
        id: 'ps-1',
        name: 'Interior Design',
        subcategoryId: 'sub-1',
        subcategoryName: 'Interior Design',
        customName: null,
        value: 0,
        clientMilestones: [],
        vendorMappings: [
          {
            id: 'vm-1',
            vendorId: 'v-1',
            vendorName: 'Vendor A',
            value: 0,
            percentage: 0,
            milestones: [],
            isMeasurable: false,
          },
        ],
        milestonesTotal: 0,
      },
    ],
  },
]

const fullOffer: PitchCategory[] = [
  {
    id: 'pc-1',
    categoryId: 'cat-1',
    categoryName: 'Design',
    totalValue: 5000,
    services: [
      {
        id: 'ps-1',
        name: 'Interior Design',
        subcategoryId: 'sub-1',
        subcategoryName: 'Interior Design',
        customName: null,
        value: 5000,
        clientMilestones: [],
        vendorMappings: [
          {
            id: 'vm-1',
            vendorId: 'v-1',
            vendorName: 'Vendor A',
            value: 3000,
            percentage: 60,
            milestones: [],
            isMeasurable: false,
          },
        ],
        milestonesTotal: 0,
      },
    ],
  },
]

function makeDraft(categories: PitchCategory[]): TransitionDraft {
  return {
    sourceVersionId: 'pv-1',
    projectId: 'p-1',
    versionNumber: 1,
    label: 'Version 1',
    categories,
    plannedExpenses: [],
    originalServiceValues: {},
    totalRevenue: 0,
    totalCost: 0,
    profitability: 0,
  }
}

describe('pitchHasClientOfferService', () => {
  it('passes when a service has value > 0 without subcategory or name', () => {
    expect(pitchHasClientOfferService(clientOfferOnly)).toBe(true)
  })

  it('fails on empty categories', () => {
    expect(pitchHasClientOfferService(emptyCategories)).toBe(false)
  })
})

describe('pitchHasVendorOffer', () => {
  it('passes when any vendor row has a vendorId', () => {
    expect(pitchHasVendorOffer(vendorOfferOnly)).toBe(true)
  })

  it('fails on empty categories', () => {
    expect(pitchHasVendorOffer(emptyCategories)).toBe(false)
  })
})

describe('validateGoLiveMinimum', () => {
  it('allows go-live with client and vendor offers', () => {
    const result = validateGoLiveMinimum({
      projectId: 'p-1',
      clientPOs: [],
      selectedVersionId: 'pv-1',
      draft: makeDraft(fullOffer),
    })
    expect(result.ok).toBe(true)
    expect(result.messages).toHaveLength(0)
  })

  it('allows go-live without pitch offers or a pitch version', () => {
    const withoutOffers = validateGoLiveMinimum({
      projectId: 'p-1',
      clientPOs: [],
      selectedVersionId: 'pv-1',
      draft: makeDraft(emptyCategories),
    })
    const withoutVersion = validateGoLiveMinimum({
      projectId: 'p-1',
      clientPOs: [],
      selectedVersionId: null,
      draft: null,
    })
    expect(withoutOffers.ok).toBe(true)
    expect(withoutVersion.ok).toBe(true)
  })
})

describe('formatGoLiveBlockMessage', () => {
  it('joins multiple validation messages', () => {
    expect(
      formatGoLiveBlockMessage([
        'Add at least one client offer service on the Pitch tab.',
        'Add at least one vendor offer on the Pitch tab.',
      ]),
    ).toBe(
      'Cannot convert to Live: Add at least one client offer service on the Pitch tab. Add at least one vendor offer on the Pitch tab.',
    )
  })
})

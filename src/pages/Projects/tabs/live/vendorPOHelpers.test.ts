import { describe, expect, it } from 'vitest'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { PitchCategory, PitchVersion } from '@/slices/pitch/reducer'
import {
  baselineToOfferVersion,
  buildLiveVendorOfferRows,
  buildVendorOfferRows,
  resolveOfferVersionForProject,
  resolvePitchServiceForMasterSelection,
  vendorOfferHasPo,
} from './vendorPOHelpers'

const projectId = 'proj-1'

function makeCategory(services: PitchCategory['services']): PitchCategory {
  return {
    id: 'cat-1',
    categoryId: 'master-1',
    categoryName: 'Build Services',
    services,
    totalValue: services.reduce((s, svc) => s + svc.value, 0),
  }
}

function makeVersion(categories: PitchCategory[]): PitchVersion {
  return {
    id: 'pv-1',
    projectId,
    versionNumber: 1,
    label: 'Version 1',
    isActive: true,
    createdAt: '2026-01-01',
    categories,
    plannedExpenses: [],
    totalRevenue: 100,
    totalCost: 50,
    profitability: 50,
  }
}

function makeBaseline(categories: PitchCategory[]): Baseline {
  return {
    id: 'bl-1',
    projectId,
    version: 1,
    versionId: 'pv-1',
    versionLabel: 'Version 1',
    basedOnPitchVersion: 'Version 1',
    pitchVersionNumber: 1,
    isActive: true,
    createdAt: '2026-01-01',
    lockedAt: '2026-01-02',
    status: 'Locked',
    clientPOId: 'po-1',
    categories,
    plannedExpenses: [],
    originalServiceValues: {},
    totalRevenue: 100,
    totalCost: 50,
    profitability: 50,
  }
}

describe('resolveOfferVersionForProject', () => {
  it('prefers pitch version when it has categories', () => {
    const categories = [
      makeCategory([
        {
          id: 'svc-1',
          name: 'Design',
          subcategoryId: 'sub-1',
          subcategoryName: 'Design',
          customName: null,
          value: 100,
          clientMilestones: [],
          vendorMappings: [],
          milestonesTotal: 0,
        },
      ]),
    ]
    const pitch = makeVersion(categories)
    const baseline = makeBaseline([])

    const resolved = resolveOfferVersionForProject(projectId, pitch, [pitch], baseline)
    expect(resolved?.categories).toEqual(categories)
  })

  it('falls back to baseline when pitch has no categories', () => {
    const emptyPitch = makeVersion([])
    const baselineCategories = [
      makeCategory([
        {
          id: 'svc-1',
          name: 'Design',
          subcategoryId: 'sub-1',
          subcategoryName: 'Design',
          customName: null,
          value: 100,
          clientMilestones: [],
          vendorMappings: [
            {
              id: 'vm-1',
              vendorId: 'v-1',
              vendorName: 'Acme',
              value: 40,
              percentage: 40,
              milestones: [],
              isMeasurable: false,
            },
          ],
          milestonesTotal: 0,
        },
      ]),
    ]
    const baseline = makeBaseline(baselineCategories)

    const resolved = resolveOfferVersionForProject(projectId, emptyPitch, [emptyPitch], baseline)
    expect(resolved?.categories).toEqual(baselineCategories)
    expect(buildVendorOfferRows(resolved)).toHaveLength(1)
  })

  it('maps baseline fields into pitch-shaped offer version', () => {
    const baseline = makeBaseline([makeCategory([])])
    const offer = baselineToOfferVersion(baseline)
    expect(offer.id).toBe(baseline.versionId)
    expect(offer.projectId).toBe(projectId)
    expect(offer.label).toBe('Version 1')
  })
})

describe('buildLiveVendorOfferRows', () => {
  it('lists Live Vendor POs only and ignores pitch/baseline vendorMappings', () => {
    const baseline = makeBaseline([
      makeCategory([
        {
          id: 'svc-1',
          name: 'Design',
          subcategoryId: 'sub-1',
          subcategoryName: 'Design',
          customName: null,
          value: 100,
          clientMilestones: [],
          vendorMappings: [
            {
              id: 'vm-pitch',
              vendorId: 'v-pitch',
              vendorName: 'Pitch Only Vendor',
              value: 999,
              percentage: 100,
              milestones: [],
              isMeasurable: false,
            },
          ],
          milestonesTotal: 0,
        },
      ]),
    ])

    const vendorPOs: VendorPO[] = [
      {
        id: 'vpo-1',
        projectId,
        vendorId: 'v-live',
        vendorName: 'Live Vendor',
        poNumber: 'PO-LIVE-1',
        poDate: '2026-01-01',
        poValue: 50000,
        executedValue: 48000,
        milestones: [],
        status: 'Draft',
        linkedBaselineServiceIds: ['svc-1'],
        fileName: 'offer.pdf',
      },
    ]

    const rows = buildLiveVendorOfferRows(vendorPOs, projectId, baseline)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.vendorName).toBe('Live Vendor')
    expect(rows[0]?.offerAmount).toBe(48000)
    expect(rows[0]?.categoryName).toBe('Build Services')
    expect(rows[0]?.serviceName).toBe('Design')
    expect(rows[0]?.notes).toBe('offer.pdf')
    expect(rows.every((r) => r.vendorName !== 'Pitch Only Vendor')).toBe(true)
  })

  it('returns empty when no Live Vendor POs exist', () => {
    const baseline = makeBaseline([
      makeCategory([
        {
          id: 'svc-1',
          name: 'Design',
          subcategoryId: 'sub-1',
          subcategoryName: 'Design',
          customName: null,
          value: 100,
          clientMilestones: [],
          vendorMappings: [
            {
              id: 'vm-1',
              vendorId: 'v-1',
              vendorName: 'Acme',
              value: 40,
              percentage: 40,
              milestones: [],
              isMeasurable: false,
            },
          ],
          milestonesTotal: 0,
        },
      ]),
    ])
    expect(buildLiveVendorOfferRows([], projectId, baseline)).toHaveLength(0)
  })
})

describe('resolvePitchServiceForMasterSelection', () => {
  it('resolves master service id via subcategoryId for Live VPO linking', () => {
    const version = makeVersion([
      makeCategory([
        {
          id: 'svc-1',
          name: 'Design',
          subcategoryId: 'master-svc-design',
          subcategoryName: 'Design',
          customName: null,
          value: 100,
          clientMilestones: [],
          vendorMappings: [],
          milestonesTotal: 0,
        },
      ]),
    ])

    const resolved = resolvePitchServiceForMasterSelection(version, {
      masterCategoryId: 'master-cat',
      masterServiceId: 'master-svc-design',
      masterCategoryName: 'Build Services',
      masterServiceName: 'Design',
    })

    expect(resolved?.service.id).toBe('svc-1')
  })

  it('matches service by id even when category id differs', () => {
    const version = makeVersion([
      {
        id: 'pitch-cat',
        categoryId: 'other-master',
        categoryName: 'Build Services',
        totalValue: 100,
        services: [
          {
            id: 'svc-1',
            name: 'Design',
            subcategoryId: 'master-svc-design',
            subcategoryName: 'Design',
            customName: null,
            value: 100,
            clientMilestones: [],
            vendorMappings: [],
            milestonesTotal: 0,
          },
        ],
      },
    ])

    const resolved = resolvePitchServiceForMasterSelection(version, {
      masterCategoryId: 'unrelated-master-cat',
      masterServiceId: 'master-svc-design',
      masterCategoryName: 'Different Label',
      masterServiceName: 'Design',
    })

    expect(resolved?.service.id).toBe('svc-1')
  })
})

describe('vendorOfferHasPo', () => {
  const offerRow = {
    categoryName: 'Build Services',
    categoryId: 'cat-1',
    serviceId: 'svc-1',
    serviceName: 'Design',
    mapping: {
      id: 'vm-1',
      vendorId: 'v-1',
      vendorName: 'Acme',
      value: 40,
      percentage: 40,
      milestones: [],
      isMeasurable: false,
    },
  }

  function makeVendorPo(linkedServiceIds: string[]): VendorPO {
    return {
      id: 'vpo-1',
      projectId,
      vendorId: 'v-1',
      vendorName: 'Acme',
      poNumber: 'PO-1',
      poDate: '2026-01-01',
      poValue: 40,
      milestones: [],
      status: 'Draft',
      linkedBaselineServiceIds: linkedServiceIds,
    }
  }

  it('returns true when a PO links the same vendor and service', () => {
    expect(vendorOfferHasPo(offerRow, [makeVendorPo(['svc-1'])], projectId)).toBe(true)
  })

  it('returns false when service is not linked', () => {
    expect(vendorOfferHasPo(offerRow, [makeVendorPo(['svc-other'])], projectId)).toBe(false)
  })

  it('returns false when vendor differs', () => {
    const po = makeVendorPo(['svc-1'])
    expect(vendorOfferHasPo(offerRow, [{ ...po, vendorId: 'v-2' }], projectId)).toBe(false)
  })

  it('returns true when PO links the vendor mapping id', () => {
    const po = makeVendorPo([])
    expect(
      vendorOfferHasPo(offerRow, [{ ...po, linkedVendorMappingId: 'vm-1' }], projectId),
    ).toBe(true)
  })

  it('returns true for alternate service id when pitch/baseline ids differ', () => {
    expect(
      vendorOfferHasPo(offerRow, [makeVendorPo(['svc-baseline'])], projectId, {
        alternateServiceIds: ['svc-baseline'],
      }),
    ).toBe(true)
  })
})

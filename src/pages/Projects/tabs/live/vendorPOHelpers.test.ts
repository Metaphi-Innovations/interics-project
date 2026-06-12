import { describe, expect, it } from 'vitest'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { PitchCategory, PitchVersion } from '@/slices/pitch/reducer'
import {
  baselineToOfferVersion,
  buildVendorOfferRows,
  resolveOfferVersionForProject,
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
})

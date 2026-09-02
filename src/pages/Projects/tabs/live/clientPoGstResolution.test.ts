import { describe, expect, it } from 'vitest'
import type { Baseline, ClientPO } from '@/slices/baseline/reducer'
import type { Service } from '@/slices/settings/reducer'
import {
  resolveClientPoMilestoneGstRate,
  resolveClientServiceGstRate,
} from './clientPoGstResolution'

const SETTINGS: Service[] = [
  {
    id: 'master-12',
    name: 'Service 12',
    categoryId: 'cat-1',
    gstRate: 12,
    status: 'active',
    sacCodeId: null,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: [],
  },
  {
    id: 'master-18',
    name: 'Service 18',
    categoryId: 'cat-1',
    gstRate: 18,
    status: 'active',
    sacCodeId: null,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: [],
  },
]

const BASELINE: Baseline = {
  id: 'bl-1',
  projectId: 'p-1',
  version: 1,
  versionId: 'v1',
  versionLabel: 'v1',
  basedOnPitchVersion: 'pv-1',
  pitchVersionNumber: 1,
  isActive: true,
  createdAt: '',
  lockedAt: '',
  status: 'Locked',
  clientPOId: 'cpo-1',
  categories: [
    {
      id: 'cat-1',
      categoryName: 'Build',
      services: [
        {
          id: 'pitch-1',
          name: 'Interior',
          subcategoryId: 'master-12',
          subcategoryName: 'Construction',
          customName: null,
          gstRate: 18,
          value: 1_000_000,
          clientMilestones: [],
          vendorMappings: [],
          milestonesTotal: 0,
        },
      ],
    },
  ],
  plannedExpenses: [],
  originalServiceValues: {},
  totalRevenue: 0,
  totalCost: 0,
  profitability: 0,
}

describe('clientPoGstResolution', () => {
  it('uses settings master GST when milestone serviceId is master id (not pitch 18%)', () => {
    expect(resolveClientServiceGstRate('master-12', BASELINE, SETTINGS)).toBe(12)
  })

  it('uses settings master GST via pitch subcategoryId when serviceId is pitch id', () => {
    expect(resolveClientServiceGstRate('pitch-1', BASELINE, SETTINGS)).toBe(12)
  })

  it('uses pitch GST when serviceId is pitch id and master mapping is absent', () => {
    expect(resolveClientServiceGstRate('pitch-1', BASELINE, [])).toBe(18)
  })

  it('uses mapped service GST 3% when configured in settings master', () => {
    const settings3: Service[] = [
      {
        id: 'master-3',
        name: 'Service 3',
        categoryId: 'cat-1',
        gstRate: 3,
        status: 'active',
        sacCodeId: null,
        allowGSTOverride: false,
        allowVendorMapping: false,
        tags: [],
      },
    ]
    expect(resolveClientServiceGstRate('master-3', null, settings3)).toBe(3)
  })

  it('returns PO snapshot gstRate for saved milestone', () => {
    const po: ClientPO = {
      id: 'po-1',
      projectId: 'p-1',
      poNumber: 'PO-1',
      poValue: 5000,
      executedValue: 5000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      milestones: [
        {
          id: 'ms-1',
          name: 'Advance',
          serviceId: 'master-12',
          serviceName: 'Service 12',
          value: 5000,
          percentage: 100,
          gstRate: 12,
          gstAmount: 600,
          tdsRate: 5,
          tdsAmount: 250,
          net: 5350,
        },
      ],
    }
    expect(
      resolveClientPoMilestoneGstRate(po, 'ms-1', {
        serviceId: 'master-18',
        baseline: BASELINE,
        settingsServices: SETTINGS,
      }),
    ).toBe(12)
  })

  it('resolves from service mapping when PO milestone has no snapshot', () => {
    const po: ClientPO = {
      id: 'po-1',
      projectId: 'p-1',
      poNumber: 'PO-1',
      poValue: 5000,
      executedValue: 5000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      milestones: [
        {
          id: 'ms-1',
          name: 'Advance',
          serviceId: 'master-12',
          serviceName: 'Service 12',
          value: 5000,
          percentage: 100,
        },
      ],
    }
    expect(
      resolveClientPoMilestoneGstRate(po, 'ms-1', {
        baseline: BASELINE,
        settingsServices: SETTINGS,
      }),
    ).toBe(12)
  })
})

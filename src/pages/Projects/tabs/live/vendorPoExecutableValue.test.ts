import { describe, expect, it } from 'vitest'
import {
  buildLiveVendorOfferRows,
  vendorPoEffectiveValue,
  vendorPoExecutableAmount,
} from './vendorPOHelpers'
import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import { computePayableSummaryKpis } from '@/pages/Finance/utils/payableSummary'

function vendorInvoice(
  partial: Partial<VendorInvoice> & Pick<VendorInvoice, 'id' | 'milestoneId' | 'netPayable'>,
): VendorInvoice {
  return {
    projectId: 'p1',
    vendorId: 'v1',
    vendorName: 'Vendor',
    serviceId: 'svc-1',
    serviceName: 'Service',
    milestoneName: 'Milestone',
    invoiceNumber: 'VI-1',
    invoiceDate: '2026-02-01',
    baseAmount: partial.netPayable,
    tdsRate: 0,
    tdsAmount: 0,
    status: 'pending',
    ...partial,
  }
}

describe('vendorPoExecutableAmount (invoice-aware payable totals)', () => {
  const po: VendorPO = {
    id: 'vpo-1',
    projectId: 'p1',
    vendorId: 'v1',
    vendorName: 'Vendor',
    poNumber: 'PO-1',
    poDate: '2026-01-01',
    poValue: 100000,
    executedValue: 100000,
    milestones: [
      {
        id: 'm1',
        name: 'A',
        percentage: 50,
        value: 50000,
        dueDate: null,
        kind: 'regular',
        status: 'Pending',
      },
      {
        id: 'm2',
        name: 'B',
        percentage: 50,
        value: 50000,
        dueDate: null,
        kind: 'regular',
        status: 'Pending',
      },
    ],
    status: 'Draft',
    linkedBaselineServiceIds: ['svc-1'],
  }

  it('no invoices → full milestone values', () => {
    expect(vendorPoExecutableAmount(po, [])).toBe(100000)
  })

  it('invoiced milestone uses netPayable + remaining uninvoiced portion', () => {
    expect(
      vendorPoExecutableAmount(po, [
        vendorInvoice({
          id: 'vi-1',
          milestoneId: 'm1',
          netPayable: 45000,
          baseAmount: 50000,
          vendorPoId: 'vpo-1',
        }),
      ]),
    ).toBe(95000)
  })
})

describe('buildLiveVendorOfferRows listing (Executed Value)', () => {
  const projectId = 'p1'
  const vendorPOs: VendorPO[] = [
    {
      id: 'vpo-1',
      projectId,
      vendorId: 'v1',
      vendorName: 'Vendor A',
      poNumber: 'PO-1',
      poDate: '2026-01-01',
      poValue: 100000,
      executedValue: 100000,
      milestones: [
        {
          id: 'm1',
          name: 'A',
          percentage: 40,
          value: 40000,
          dueDate: null,
          kind: 'regular',
          status: 'Pending',
        },
        {
          id: 'm2',
          name: 'B',
          percentage: 50,
          value: 50000,
          dueDate: null,
          kind: 'regular',
          status: 'Pending',
        },
        {
          id: 'ret',
          name: 'Retention',
          percentage: 10,
          value: 10000,
          dueDate: null,
          kind: 'retention',
          status: 'Pending',
        },
      ],
      status: 'Draft',
      linkedBaselineServiceIds: ['svc-1'],
    },
    {
      id: 'vpo-2',
      projectId,
      vendorId: 'v1',
      vendorName: 'Vendor A',
      poNumber: 'PO-2',
      poDate: '2026-02-01',
      poValue: 60000,
      executedValue: 120000,
      milestones: [
        {
          id: 'm3',
          name: 'C',
          percentage: 100,
          value: 60000,
          dueDate: null,
          kind: 'regular',
          status: 'Pending',
        },
      ],
      status: 'Draft',
      linkedBaselineServiceIds: ['svc-1'],
    },
  ]

  const vendorInvoices: VendorInvoice[] = [
    vendorInvoice({
      id: 'vi-1',
      milestoneId: 'm1',
      netPayable: 38000,
      baseAmount: 40000,
      vendorPoId: 'vpo-1',
    }),
  ]

  it('listing displays canonical Executed Value (executedValue ?? poValue)', () => {
    const rows = buildLiveVendorOfferRows(vendorPOs, projectId, null)
    expect(rows.find((r) => r.po.id === 'vpo-1')?.offerAmount).toBe(100000)
    expect(rows.find((r) => r.po.id === 'vpo-2')?.offerAmount).toBe(120000)
    for (const row of rows) {
      expect(row.offerAmount).toBe(vendorPoEffectiveValue(row.po))
    }
  })

  it('listing does not subtract invoiced or remaining amounts', () => {
    const rows = buildLiveVendorOfferRows(vendorPOs, projectId, null)
    const invoicedAware = vendorPoExecutableAmount(vendorPOs[0]!, vendorInvoices)
    expect(invoicedAware).toBeLessThan(100000)
    expect(rows.find((r) => r.po.id === 'vpo-1')?.offerAmount).toBe(100000)
  })

  it('executed value edit is reflected in listing', () => {
    const updated = vendorPOs.map((po) =>
      po.id === 'vpo-1' ? { ...po, executedValue: 120000 } : po,
    )
    const rows = buildLiveVendorOfferRows(updated, projectId, null)
    expect(rows.find((r) => r.po.id === 'vpo-1')?.offerAmount).toBe(120000)
  })

  it('partial invoice does not reduce listing Executed Value', () => {
    const partialInvoices: VendorInvoice[] = [
      vendorInvoice({
        id: 'vi-partial',
        milestoneId: 'm1',
        netPayable: 19000,
        baseAmount: 20000,
        vendorPoId: 'vpo-1',
      }),
    ]
    const rows = buildLiveVendorOfferRows(vendorPOs, projectId, null)
    expect(rows.find((r) => r.po.id === 'vpo-1')?.offerAmount).toBe(100000)
    expect(vendorPoExecutableAmount(vendorPOs[0]!, partialInvoices)).toBeLessThan(100000)
  })

  it('multiple Vendor POs remain independent', () => {
    const rows = buildLiveVendorOfferRows(vendorPOs, projectId, null)
    expect(rows).toHaveLength(2)
    expect(rows[0]?.offerAmount).not.toBe(rows[1]?.offerAmount)
  })
})

describe('computePayableSummaryKpis', () => {
  it('uses invoice-aware executable totals (distinct from listing Executed Value)', () => {
    const pos: VendorPO[] = [
      {
        id: 'vpo-1',
        projectId: 'p1',
        vendorId: 'v1',
        vendorName: 'Vendor',
        poNumber: 'PO-1',
        poDate: '2026-01-01',
        poValue: 100000,
        executedValue: 100000,
        milestones: [
          {
            id: 'm1',
            name: 'A',
            percentage: 100,
            value: 100000,
            dueDate: null,
            kind: 'regular',
            status: 'Pending',
          },
        ],
        status: 'Draft',
        linkedBaselineServiceIds: ['svc-1'],
      },
    ]
    const kpis = computePayableSummaryKpis(pos, [], [
      vendorInvoice({
        id: 'vi-1',
        milestoneId: 'm1',
        netPayable: 90000,
        baseAmount: 100000,
        vendorPoId: 'vpo-1',
      }),
    ])
    expect(kpis.totalVendorPoValue).toBe(90000)
    expect(buildLiveVendorOfferRows(pos, 'p1', null)[0]?.offerAmount).toBe(100000)
  })
})

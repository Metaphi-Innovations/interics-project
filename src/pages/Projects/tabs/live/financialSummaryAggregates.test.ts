import { describe, expect, it } from 'vitest'
import type { ClientPO } from '@/slices/baseline/reducer'
import type { ClientInvoice } from '@/slices/live/types'
import {
  buildFinancialSummaryGroups,
  buildFinancialSummaryTotal,
} from './financialSummaryAggregates'

const projectId = 'proj-1'

const clientPOs: ClientPO[] = [
  {
    id: 'po-1',
    projectId,
    poNumber: '1234',
    startDate: '',
    endDate: '',
    poValue: 100000,
    documentUrl: null,
    milestones: [
      {
        id: 'm1',
        serviceId: 'master-svc-construction',
        serviceName: 'Construction / Build Services',
        name: '1',
        percentage: 10,
        value: 10000,
        kind: 'regular',
      },
      {
        id: 'm1-ret',
        serviceId: 'master-svc-construction',
        serviceName: 'Construction / Build Services',
        name: 'Retention',
        percentage: 10,
        value: 10000,
        kind: 'retention',
      },
      {
        id: 'm2',
        serviceId: 'master-svc-test',
        serviceName: 'Test one',
        name: '2',
        percentage: 10,
        value: 10000,
        kind: 'regular',
      },
    ],
  },
]

const invoices: ClientInvoice[] = [
  {
    id: 'inv-paid',
    projectId,
    milestoneId: 'm1-ret',
    milestoneName: 'Retention',
    serviceId: 'master-svc-construction',
    serviceName: 'Construction / Build Services',
    lineItems: [
      {
        id: 'li-1',
        serviceId: 'master-svc-construction',
        serviceName: 'Construction / Build Services',
        sacCode: '—',
        amount: 10000,
        gstRate: 18,
        gstAmount: 1800,
        milestoneId: 'm1-ret',
      },
    ],
    baseAmount: 10000,
    gstAmount: 1800,
    grossAmount: 11800,
    tdsAmount: 0,
    netReceivable: 0,
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-08-08',
    dueDate: '2026-08-08',
    status: 'paid',
    payments: [
      {
        id: 'pay-1',
        date: '2026-08-08',
        amountReceived: 11800,
        tdsDeducted: 0,
        netReceived: 11800,
        paymentMode: 'bank_transfer',
        recordedAt: '2026-08-08T00:00:00.000Z',
      },
    ],
  },
]

describe('financialSummaryAggregates (live PO driven)', () => {
  it('uses live client PO amounts and paid invoice bank received for received/pending', () => {
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      clientPOs,
      [],
      invoices,
      [],
      [],
    )

    const total = buildFinancialSummaryTotal(groups)
    // 10k + 10k + 10k base @ 18% GST → 35400 gross
    expect(total.clientPOAmount).toBe(35400)
    // bank amountReceived, not milestone value
    expect(total.clientReceived).toBe(11800)
    // gross of unpaid milestones: m1 (11800) + m2 (11800); m1-ret is paid
    expect(total.pendingReceived).toBe(23600)

    const construction = groups
      .flatMap((g) => g.children)
      .find((r) => r.workstreamName === 'Construction / Build Services')
    expect(construction?.clientPOAmount).toBe(23600)
    expect(construction?.clientReceived).toBe(11800)
    expect(construction?.pendingReceived).toBe(11800)

    const testOne = groups
      .flatMap((g) => g.children)
      .find((r) => r.workstreamName === 'Test one')
    expect(testOne?.clientPOAmount).toBe(11800)
    expect(testOne?.clientReceived).toBe(0)
    expect(testOne?.pendingReceived).toBe(11800)
  })

  it('uses bank amountReceived not gross when TDS is present', () => {
    const withTds: ClientInvoice[] = [
      {
        ...invoices[0]!,
        grossAmount: 120000,
        tdsAmount: 2000,
        netReceivable: 0,
        status: 'paid',
        payments: [
          {
            id: 'pay-tds',
            date: '2026-08-08',
            amountReceived: 118000,
            tdsDeducted: 2000,
            netReceived: 118000,
            paymentMode: 'bank_transfer',
            recordedAt: '2026-08-08T00:00:00.000Z',
          },
        ],
      },
    ]
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      clientPOs,
      [],
      withTds,
      [],
      [],
    )
    const total = buildFinancialSummaryTotal(groups)
    expect(total.clientReceived).toBe(118000)
    expect(total.pendingReceived).toBe(23600)
  })

  it('treats invoice status paid as received even without payment rows', () => {
    const paidNoPayments: ClientInvoice[] = [
      {
        ...invoices[0]!,
        payments: [],
        status: 'paid',
        netReceivable: 0,
      },
    ]
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      clientPOs,
      [],
      paidNoPayments,
      [],
      [],
    )
    const total = buildFinancialSummaryTotal(groups)
    expect(total.clientReceived).toBe(11800)
    expect(total.pendingReceived).toBe(23600)
  })

  it('ignores pitch categories and still builds from live POs only', () => {
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      clientPOs,
      [],
      invoices,
      [],
      [],
      [],
      [{ id: 'ignored' }],
    )
    expect(groups[0]?.id).toBe('live-services')
    expect(groups[0]?.children).toHaveLength(2)
  })

  it('merges client PO and vendor offer into one row when category+service match by name/id alias', () => {
    const groups = buildFinancialSummaryGroups(
      {
        id: 'bl-1',
        projectId,
        version: 1,
        versionId: 'v1',
        versionLabel: 'V1',
        basedOnPitchVersion: 'V1',
        pitchVersionNumber: 1,
        isActive: true,
        createdAt: '',
        lockedAt: '',
        status: 'Locked',
        clientPOId: 'po-1',
        categories: [
          {
            id: 'cat-build',
            categoryId: 'cat-build',
            categoryName: 'Build',
            totalValue: 0,
            services: [
              {
                id: 'pitch-svc-row',
                name: 'Construction / Build Services',
                subcategoryId: 'master-svc-construction',
                subcategoryName: 'Construction / Build Services',
                customName: null,
                value: 0,
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
      },
      projectId,
      [
        {
          id: 'po-client',
          projectId,
          poNumber: 'C-1',
          startDate: '',
          endDate: '',
          poValue: 100000,
          documentUrl: null,
          milestones: [
            {
              id: 'cm1',
              serviceId: 'master-svc-construction',
              serviceName: 'Construction / Build Services',
              name: 'M1',
              percentage: 100,
              value: 100000,
              kind: 'regular',
            },
          ],
        },
      ],
      [
        {
          id: 'vpo-1',
          projectId,
          vendorId: 'vend-1',
          vendorName: 'Vendor A',
          poNumber: 'V-1',
          poDate: '2026-08-01',
          poValue: 100000,
          milestones: [],
          status: 'Draft',
          // Pitch row id (not master id) — should still merge via subcategory alias / name
          linkedBaselineServiceIds: ['pitch-svc-row'],
        },
      ],
      [],
      [],
      [],
    )

    const services = groups.find((g) => g.id === 'live-services')?.children ?? []
    const construction = services.filter(
      (r) => r.workstreamName === 'Construction / Build Services',
    )
    expect(construction).toHaveLength(1)
    expect(construction[0]?.clientPOAmount).toBe(118000)
    expect(construction[0]?.vendorPOAmount).toBe(100000)
    expect(construction[0]?.pendingReceived).toBe(118000)
    expect(construction[0]?.pendingPaid).toBe(0)
  })

  it('keeps separate rows when service names differ', () => {
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      [
        {
          id: 'po-client',
          projectId,
          poNumber: 'C-1',
          startDate: '',
          endDate: '',
          poValue: 100000,
          documentUrl: null,
          milestones: [
            {
              id: 'cm1',
              serviceId: 'master-svc-construction',
              serviceName: 'Construction / Build Services',
              name: 'M1',
              percentage: 100,
              value: 100000,
              kind: 'regular',
            },
          ],
        },
      ],
      [
        {
          id: 'vpo-1',
          projectId,
          vendorId: 'vend-1',
          vendorName: 'Vendor A',
          poNumber: 'V-1',
          poDate: '2026-08-01',
          poValue: 50000,
          milestones: [],
          status: 'Draft',
          linkedBaselineServiceIds: ['master-svc-design'],
        },
      ],
      [],
      [],
      [],
    )

    const services = groups.find((g) => g.id === 'live-services')?.children ?? []
    expect(services).toHaveLength(2)
  })

  it('does not overwrite service name with linked payable uuid', () => {
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      [
        {
          id: 'po-client',
          projectId,
          poNumber: 'C-1',
          startDate: '',
          endDate: '',
          poValue: 100000,
          documentUrl: null,
          milestones: [
            {
              id: 'cm1',
              serviceId: 'master-svc-construction',
              serviceName: 'Construction / Build Services',
              name: 'M1',
              percentage: 100,
              value: 100000,
              kind: 'regular',
            },
          ],
        },
      ],
      [
        {
          id: 'vpo-1',
          projectId,
          vendorId: 'vend-1',
          vendorName: 'Vendor A',
          poNumber: 'V-1',
          poDate: '2026-08-01',
          poValue: 100000,
          milestones: [],
          status: 'Draft',
          linkedBaselineServiceIds: ['master-svc-construction'],
        },
      ],
      [],
      [],
      [],
      undefined,
      undefined,
      [
        {
          id: 'master-svc-construction',
          name: 'Construction / Build Services',
          categoryName: 'Build',
        },
      ],
    )

    const services = groups.find((g) => g.id === 'live-services')?.children ?? []
    expect(services).toHaveLength(1)
    expect(services[0]?.workstreamName).toBe('Construction / Build Services')
    expect(services[0]?.workstreamName).not.toMatch(/[0-9a-f-]{36}/i)
  })

  it('resolves payable pitch-row id via catalog aliases without showing uuid', () => {
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      [
        {
          id: 'po-client',
          projectId,
          poNumber: 'C-1',
          startDate: '',
          endDate: '',
          poValue: 50000,
          documentUrl: null,
          milestones: [
            {
              id: 'cm1',
              serviceId: 'master-svc-construction',
              serviceName: 'Construction / Build Services',
              name: 'M1',
              percentage: 100,
              value: 50000,
              kind: 'regular',
            },
          ],
        },
      ],
      [
        {
          id: 'vpo-1',
          projectId,
          vendorId: 'vend-1',
          vendorName: 'Vendor A',
          poNumber: 'V-1',
          poDate: '2026-08-01',
          poValue: 50000,
          milestones: [],
          status: 'Draft',
          linkedBaselineServiceIds: ['1c776b1f-ebc0-4e9b-94a9-8e4758482b46'],
        },
      ],
      [],
      [],
      [],
      undefined,
      undefined,
      [
        {
          id: 'master-svc-construction',
          name: 'Construction / Build Services',
          categoryName: 'Build',
        },
        {
          id: '1c776b1f-ebc0-4e9b-94a9-8e4758482b46',
          name: 'Construction / Build Services',
          categoryName: 'Build',
        },
      ],
    )

    const services = groups.find((g) => g.id === 'live-services')?.children ?? []
    expect(services).toHaveLength(1)
    expect(services[0]?.workstreamName).toBe('Construction / Build Services')
    expect(services[0]?.clientPOAmount).toBe(59000)
    expect(services[0]?.vendorPOAmount).toBe(50000)
  })

  it('sums unpaid vendor milestone values per linked service for pending paid', () => {
    const groups = buildFinancialSummaryGroups(
      null,
      projectId,
      [],
      [
        {
          id: 'vpo-1',
          projectId,
          vendorId: 'vend-1',
          vendorName: 'Vendor A',
          poNumber: 'V-1',
          poDate: '2026-08-01',
          poValue: 100000,
          milestones: [
            { id: 'vm1', name: 'M1', percentage: 50, value: 50000, dueDate: null, status: 'Pending' },
            { id: 'vm2', name: 'M2', percentage: 50, value: 50000, dueDate: null, status: 'Pending' },
          ],
          status: 'Issued',
          linkedBaselineServiceIds: ['master-svc-construction'],
        },
      ],
      [],
      [
        {
          id: 'vinv-1',
          projectId,
          vendorId: 'vend-1',
          vendorName: 'Vendor A',
          serviceId: 'master-svc-construction',
          serviceName: 'Construction / Build Services',
          milestoneId: 'vm1',
          milestoneName: 'M1',
          invoiceNumber: 'VINV-1',
          invoiceDate: '2026-08-01',
          baseAmount: 50000,
          tdsRate: 10,
          tdsAmount: 5000,
          netPayable: 45000,
          status: 'paid',
        },
      ],
      [],
      undefined,
      undefined,
      [
        {
          id: 'master-svc-construction',
          name: 'Construction / Build Services',
          categoryName: 'Build',
        },
      ],
    )

    const services = groups.find((g) => g.id === 'live-services')?.children ?? []
    expect(services).toHaveLength(1)
    expect(services[0]?.pendingPaid).toBe(50000)
    expect(services[0]?.vendorPaid).toBe(45000)
  })
})

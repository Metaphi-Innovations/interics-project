import { describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/Finance/components/InvoiceLineItems', () => ({
  computeGst: (base: number, rate: number) => Math.round((base * rate) / 100),
}))

import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'
import type { Service } from '@/slices/settings/reducer'
import type { VendorPOMilestoneOverviewRow } from './vendorPOHelpers'
import {
  resolvePayableMilestoneAmounts,
  resolvePayableMilestoneDueDate,
  resolvePayableMilestonePaymentSummary,
} from './projectLivePayableMilestoneDisplay'

const GST_18_SERVICES: Service[] = [
  {
    id: 'master-svc',
    name: 'Construction',
    categoryId: 'cat-1',
    sacCodeId: null,
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: [],
    status: 'active',
  },
]

const baselineWithGst: Baseline = {
  id: 'bl-1',
  projectId: 'proj-1',
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
      categoryId: 'cat-1',
      categoryName: 'Build',
      totalValue: 100000,
      services: [
        {
          id: 'svc-1',
          name: 'Interior Design',
          subcategoryId: 'master-svc',
          subcategoryName: 'Construction',
          customName: null,
          value: 100000,
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

function overviewRow(
  partial: Partial<VendorPOMilestoneOverviewRow> &
    Pick<VendorPOMilestoneOverviewRow, 'milestoneId' | 'amount'>,
): VendorPOMilestoneOverviewRow {
  return {
    key: partial.key ?? `po-1-${partial.milestoneId}`,
    poId: partial.poId ?? 'po-1',
    poNumber: partial.poNumber ?? 'PO-001',
    vendorId: partial.vendorId ?? 'vendor-1',
    vendor: partial.vendor ?? 'Vendor',
    serviceId: partial.serviceId ?? 'svc-1',
    serviceName: partial.serviceName ?? 'Interior Design',
    service: partial.service ?? 'Interior Design',
    name: partial.name ?? 'Advance',
    pct: partial.pct ?? 40,
    milestoneType: partial.milestoneType ?? 'regular',
    isRetention: partial.isRetention ?? false,
    status: partial.status ?? 'Pending',
    ...partial,
  }
}

function vendorPo(partial: Partial<VendorPO> = {}): VendorPO {
  return {
    id: 'po-1',
    projectId: 'proj-1',
    vendorId: 'vendor-1',
    vendorName: 'Vendor',
    poNumber: 'PO-001',
    poDate: '2026-01-01',
    poValue: 100000,
    linkedBaselineServiceIds: ['svc-1'],
    milestones: [
      {
        id: 'm1',
        name: 'Advance',
        percentage: 40,
        value: 40000,
        dueDate: '2026-03-01',
        status: 'Pending',
      },
    ],
    status: 'Issued',
    tdsRate: 10,
    ...partial,
  }
}

function vendorInv(
  partial: Partial<VendorInvoice> & Pick<VendorInvoice, 'id'>,
): VendorInvoice {
  const baseAmount = partial.baseAmount ?? 40000
  const tdsRate = partial.tdsRate ?? 10
  const tdsAmount = partial.tdsAmount ?? Math.round(baseAmount * tdsRate) / 100
  const gstAmount = partial.lineItems?.[0]?.gstAmount ?? Math.round(baseAmount * 18) / 100
  const netPayable = partial.netPayable ?? baseAmount + gstAmount - tdsAmount
  const milestoneId = partial.milestoneId ?? 'm1'
  return {
    projectId: 'proj-1',
    vendorId: 'vendor-1',
    vendorName: 'Vendor',
    serviceId: 'svc-1',
    serviceName: 'Service',
    milestoneId,
    milestoneName: 'Advance',
    invoiceNumber: 'V-INV-1',
    invoiceDate: '2026-02-01',
    dueDate: '2026-03-15',
    baseAmount,
    tdsRate,
    tdsAmount,
    netPayable,
    status: 'approved',
    lineItems: [
      {
        serviceId: 'svc-1',
        serviceName: 'Service',
        amount: baseAmount,
        gstRate: 18,
        gstAmount,
        tdsAmount,
        netAmount: netPayable,
        milestoneId,
      },
    ],
    ...partial,
  }
}

describe('projectLivePayableMilestoneDisplay', () => {
  it('uninvoiced vendor PO uses base + GST only (no TDS)', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({
      tdsRate: 10,
      milestones: [
        {
          id: 'm1',
          name: 'Advance',
          percentage: 40,
          value: 10000,
          dueDate: '2026-03-01',
          status: 'Pending',
          gstRate: 18,
          gstAmount: 1800,
          net: 11800,
        },
      ],
    })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, po, baselineWithGst, GST_18_SERVICES),
    ).toEqual({
      base: 10000,
      gstRate: 18,
      gstAmount: 1800,
      tdsRate: null,
      tdsAmount: 0,
      net: 11800,
    })
  })

  it('legacy uninvoiced without snapshot uses base + GST (no invoice TDS)', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, po, baselineWithGst, GST_18_SERVICES),
    ).toEqual({
      base: 10000,
      gstRate: 18,
      gstAmount: 1800,
      tdsRate: null,
      tdsAmount: 0,
      net: 11800,
    })
  })

  it('zero GST uninvoiced milestone has no TDS', () => {
    const zeroGstBaseline: Baseline = {
      ...baselineWithGst,
      categories: [
        {
          id: 'cat-1',
          categoryId: 'cat-1',
          categoryName: 'Build',
          totalValue: 100000,
          services: [
            {
              id: 'svc-1',
              name: 'Interior Design',
              subcategoryId: 'master-svc',
              subcategoryName: 'Construction',
              customName: null,
              gstRate: 0,
              value: 100000,
              clientMilestones: [],
              vendorMappings: [],
              milestonesTotal: 0,
            },
          ],
        },
      ],
    }
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, po, zeroGstBaseline, GST_18_SERVICES),
    ).toEqual({
      base: 10000,
      gstRate: 0,
      gstAmount: 0,
      tdsRate: null,
      tdsAmount: 0,
      net: 10000,
    })
  })

  it('Base ₹10,000 + GST ₹1,800 + TDS ₹0 → Net ₹11,800', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 0 })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, po, baselineWithGst, GST_18_SERVICES),
    ).toEqual({
      base: 10000,
      gstRate: 18,
      gstAmount: 1800,
      tdsRate: null,
      tdsAmount: 0,
      net: 11800,
    })
  })

  it('uninvoiced milestone does not apply vendor PO TDS rate', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, po, baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({
      tdsRate: null,
      tdsAmount: 0,
      net: 11800,
    })
  })

  it('invoiced milestone uses invoice line base + GST - TDS', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })
    const invoice = vendorInv({
      id: 'inv-1',
      baseAmount: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      netPayable: 10800,
    })

    expect(
      resolvePayableMilestoneAmounts(row, invoice, po, baselineWithGst, GST_18_SERVICES),
    ).toEqual({
      base: 10000,
      gstRate: 18,
      gstAmount: 1800,
      tdsRate: 10,
      tdsAmount: 1000,
      net: 10800,
    })
  })

  it('paid invoice does not change amount breakdown net', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const invoice = vendorInv({
      id: 'inv-paid',
      baseAmount: 10000,
      tdsAmount: 1000,
      netPayable: 10800,
      status: 'paid',
    })

    expect(
      resolvePayableMilestoneAmounts(row, invoice, vendorPo(), baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({ net: 10800 })
  })

  it('retention uninvoiced uses base + GST only', () => {
    const row = overviewRow({
      milestoneId: 'ret-1',
      amount: 5000,
      name: 'Retention',
      milestoneType: 'retention',
      isRetention: true,
    })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, vendorPo(), baselineWithGst, GST_18_SERVICES),
    ).toEqual({
      base: 5000,
      gstRate: 18,
      gstAmount: 900,
      tdsRate: null,
      tdsAmount: 0,
      net: 5900,
    })
  })

  it('retention invoiced shows invoice line net with TDS', () => {
    const row = overviewRow({
      milestoneId: 'ret-1',
      amount: 5000,
      name: 'Retention',
      milestoneType: 'retention',
      isRetention: true,
    })
    const invoice = vendorInv({
      id: 'inv-ret',
      milestoneId: 'ret-1',
      milestoneName: 'Retention',
      baseAmount: 5000,
      tdsRate: 10,
      tdsAmount: 500,
      netPayable: 5400,
    })

    expect(
      resolvePayableMilestoneAmounts(row, invoice, vendorPo(), baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({ net: 5400, gstAmount: 900, tdsAmount: 500 })
  })

  it('invoiced milestone uses invoice line TDS rate from covering invoice', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 5 })
    const invoice = vendorInv({
      id: 'inv-historical',
      baseAmount: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      netPayable: 10800,
    })

    expect(
      resolvePayableMilestoneAmounts(row, invoice, po, baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({
      tdsRate: 10,
      tdsAmount: 1000,
      net: 10800,
    })
  })

  it('resolves due date from invoice first, then milestone', () => {
    const po = vendorPo()
    const invoice = vendorInv({ id: 'inv-1', dueDate: '2026-04-01' })

    expect(resolvePayableMilestoneDueDate(invoice, po, 'm1')).toBe('2026-04-01')
    expect(resolvePayableMilestoneDueDate(undefined, po, 'm1')).toBe('2026-03-01')
    expect(resolvePayableMilestoneDueDate(undefined, po, 'missing')).toBeNull()
  })

  it('builds payment summary from existing invoice and payment records', () => {
    const invoice = vendorInv({ id: 'inv-1', baseAmount: 40000, netPayable: 43200, tdsAmount: 4000 })
    const flatMilestone = {
      milestoneId: 'm1',
      milestoneName: 'Advance',
      serviceId: 'svc-1',
      serviceName: 'Service',
      value: 40000,
      kind: 'regular' as const,
      isRetention: false,
    }
    const payments: VendorPayment[] = [
      {
        id: 'pay-1',
        projectId: 'proj-1',
        vendorId: 'vendor-1',
        vendorName: 'Vendor',
        paymentDate: '2026-03-01',
        totalAmount: 20000,
        linkedInvoiceIds: ['inv-1'],
        linkedExpenseIds: [],
        linkedReimbursementIds: [],
        invoiceTotal: 20000,
        expenseDeductions: 0,
        reimbursementAdditions: 0,
        tdsDeducted: 0,
        netPaid: 20000,
        status: 'completed',
      },
    ]

    const rowAmounts = resolvePayableMilestoneAmounts(
      overviewRow({ milestoneId: 'm1', amount: 40000 }),
      invoice,
      vendorPo(),
      baselineWithGst,
      GST_18_SERVICES,
    )
    expect(resolvePayableMilestonePaymentSummary(invoice, payments, flatMilestone, undefined, rowAmounts)).toEqual({
      tds: 4000,
      paid: 20000,
      outstanding: 23200,
    })
    expect(resolvePayableMilestonePaymentSummary(undefined, payments)).toBeNull()
  })
})

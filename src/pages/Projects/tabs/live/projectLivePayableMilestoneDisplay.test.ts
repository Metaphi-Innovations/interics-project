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
  return {
    projectId: 'proj-1',
    vendorId: 'vendor-1',
    vendorName: 'Vendor',
    serviceId: 'svc-1',
    serviceName: 'Service',
    milestoneId: 'm1',
    milestoneName: 'Advance',
    invoiceNumber: 'V-INV-1',
    invoiceDate: '2026-02-01',
    dueDate: '2026-03-15',
    baseAmount: 40000,
    tdsRate: 10,
    tdsAmount: 4000,
    netPayable: 36000,
    status: 'approved',
    ...partial,
  }
}

describe('projectLivePayableMilestoneDisplay', () => {
  it('Base ₹10,000 + GST ₹1,800 + TDS ₹1,000 → Net ₹10,800', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, po, baselineWithGst, GST_18_SERVICES),
    ).toEqual({
      base: 10000,
      gstRate: 18,
      gstAmount: 1800,
      tdsRate: 10,
      tdsAmount: 1000,
      net: 10800,
    })
  })

  it('Base ₹10,000 + GST ₹0 + TDS ₹1,000 → Net ₹9,000', () => {
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
      tdsRate: 10,
      tdsAmount: 1000,
      net: 9000,
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
      tdsRate: 0,
      tdsAmount: 0,
      net: 11800,
    })
  })

  it('uninvoiced milestone uses PO vendor TDS and service GST', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })

    expect(
      resolvePayableMilestoneAmounts(row, undefined, po, baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({
      tdsRate: 10,
      tdsAmount: 1000,
      net: 10800,
    })
  })

  it('invoiced milestone uses same PO-based net (invoice status does not affect breakdown)', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })
    const invoice = vendorInv({
      id: 'inv-1',
      baseAmount: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      netPayable: 9000,
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
      netPayable: 9000,
      status: 'paid',
    })

    expect(
      resolvePayableMilestoneAmounts(row, invoice, vendorPo(), baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({ net: 10800 })
  })

  it('retention row uses the same GST + vendor TDS net formula', () => {
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
      tdsRate: 10,
      tdsAmount: 500,
      net: 5400,
    })
  })

  it('retention invoiced still shows PO-based net with GST', () => {
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
      netPayable: 4500,
    })

    expect(
      resolvePayableMilestoneAmounts(row, invoice, vendorPo(), baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({ net: 5400, gstAmount: 900 })
  })

  it('uses PO vendor TDS rate even when invoice TDS rate differs', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 5 })
    const invoice = vendorInv({
      id: 'inv-historical',
      baseAmount: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      netPayable: 9000,
    })

    expect(
      resolvePayableMilestoneAmounts(row, invoice, po, baselineWithGst, GST_18_SERVICES),
    ).toMatchObject({
      tdsRate: 5,
      tdsAmount: 500,
      net: 11300,
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
    const invoice = vendorInv({ id: 'inv-1', netPayable: 36000, tdsAmount: 4000 })
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

    expect(resolvePayableMilestonePaymentSummary(invoice, payments)).toEqual({
      tds: 4000,
      paid: 20000,
      outstanding: 16000,
    })
    expect(resolvePayableMilestonePaymentSummary(undefined, payments)).toBeNull()
  })
})

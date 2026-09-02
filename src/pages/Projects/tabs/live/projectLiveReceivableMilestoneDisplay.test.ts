import { describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/Finance/components/InvoiceLineItems', () => ({
  computeGst: (base: number, rate: number) => Math.round((base * rate) / 100),
}))

import type { Baseline, ClientPO } from '@/slices/baseline/reducer'
import type { ClientInvoice } from '@/slices/live/types'
import type { Service } from '@/slices/settings/reducer'
import type { BillableMilestone } from './billableMilestones'
import { resolveReceivableMilestoneAmounts } from './projectLiveReceivableMilestoneDisplay'

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
      totalValue: 300_000,
      services: [
        {
          id: 'svc-1',
          name: 'Interior Design',
          subcategoryId: 'master-svc',
          subcategoryName: 'Construction',
          customName: null,
          value: 300_000,
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

function billableRow(partial: Partial<BillableMilestone> = {}): BillableMilestone {
  return {
    milestoneId: 'm1',
    milestoneName: 'Advance',
    serviceId: 'svc-1',
    serviceName: 'Interior Design',
    baseAmount: 300_000,
    clientPoId: 'po-1',
    tdsRate: 2,
    poDocumentUrl: null,
    poFileName: null,
    ...partial,
  }
}

function clientPo(partial: Partial<ClientPO> = {}): ClientPO {
  return {
    id: 'po-1',
    projectId: 'proj-1',
    poNumber: 'PO-001',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    poValue: 300_000,
    documentUrl: null,
    tdsRate: 2,
    milestones: [
      {
        id: 'm1',
        serviceId: 'svc-1',
        serviceName: 'Interior Design',
        name: 'Advance',
        percentage: 100,
        value: 300_000,
        gstRate: 18,
        gstAmount: 54_000,
        tdsRate: 2,
        tdsAmount: 6_000,
        net: 348_000,
      },
    ],
    ...partial,
  }
}

function clientInvoice(partial: Partial<ClientInvoice> = {}): ClientInvoice {
  return {
    id: 'inv-1',
    projectId: 'proj-1',
    clientPoId: 'po-1',
    milestoneId: 'm1',
    milestoneName: 'Advance',
    serviceId: 'svc-1',
    serviceName: 'Interior Design',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-02-01',
    dueDate: '2026-03-01',
    baseAmount: 300_000,
    gstAmount: 54_540,
    labourCessAmount: 3_000,
    grossAmount: 357_540,
    tdsAmount: 6_000,
    tdsRate: 2,
    status: 'sent',
    lineItems: [
      {
        id: 'li-1',
        serviceId: 'svc-1',
        serviceName: 'Interior Design',
        sacCode: 'TEST-SAC',
        amount: 300_000,
        gstRate: 18,
        gstAmount: 54_540,
        labourCessRate: 1,
        labourCessAmount: 3_000,
        tdsAmount: 6_000,
        netAmount: 351_540,
        milestoneId: 'm1',
      },
    ],
    payments: [],
    ...partial,
    netReceivable: partial.netReceivable ?? 351_540,
  }
}

describe('projectLiveReceivableMilestoneDisplay', () => {
  it('uninvoiced uses Client PO snapshot net (base + GST - TDS)', () => {
    const amounts = resolveReceivableMilestoneAmounts(
      billableRow(),
      undefined,
      2,
      baselineWithGst,
      GST_18_SERVICES,
      clientPo(),
    )
    expect(amounts.base).toBe(300_000)
    expect(amounts.gstAmount).toBe(54_000)
    expect(amounts.tdsAmount).toBe(6_000)
    expect(amounts.labourCess).toBe(0)
    expect(amounts.net).toBe(348_000)
    expect(amounts.net).not.toBe(354_000)
  })

  it('invoiced uses invoice line netAmount', () => {
    const amounts = resolveReceivableMilestoneAmounts(
      billableRow(),
      clientInvoice(),
      2,
      baselineWithGst,
      GST_18_SERVICES,
      clientPo(),
    )
    expect(amounts.gstAmount).toBe(54_540)
    expect(amounts.labourCess).toBe(3_000)
    expect(amounts.tdsAmount).toBe(6_000)
    expect(amounts.net).toBe(351_540)
  })

  it('legacy PO without snapshot falls back to service GST + PO TDS', () => {
    const legacyPo = clientPo({
      milestones: [
        {
          id: 'm1',
          serviceId: 'svc-1',
          serviceName: 'Interior Design',
          name: 'Advance',
          percentage: 100,
          value: 300_000,
        },
      ],
    })
    const amounts = resolveReceivableMilestoneAmounts(
      billableRow(),
      undefined,
      2,
      baselineWithGst,
      GST_18_SERVICES,
      legacyPo,
    )
    expect(amounts.net).toBe(348_000)
  })

  it('breakdown includes base, gst, tds, labourCess, net fields', () => {
    const amounts = resolveReceivableMilestoneAmounts(
      billableRow(),
      clientInvoice(),
      2,
      baselineWithGst,
      GST_18_SERVICES,
      clientPo(),
    )
    expect(amounts).toMatchObject({
      base: 300_000,
      gstAmount: 54_540,
      tdsAmount: 6_000,
      labourCess: 3_000,
      net: 351_540,
    })
  })
})

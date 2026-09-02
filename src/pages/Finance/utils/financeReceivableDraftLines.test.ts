import { describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/Projects/tabs/live/clientInvoiceUtils', () => ({
  resolveClientPoMilestoneGstRate: () => 18,
  previewClientInvoiceLineTax: (remaining: number) => ({
    labourCessAmount: 0,
    taxableAmount: remaining,
    gstAmount: Math.round((remaining * 18) / 100),
    tdsAmount: 0,
    netAmount: remaining,
  }),
}))

import type { ClientPO } from '@/slices/baseline/reducer'
import type { Invoice } from '@/slices/receivables/reducer'
import { buildAutoDraftLines } from './financeReceivableDraftLines'
import {
  countSelectedMilestonesWithZeroRemaining,
  flattenClientPoMilestones,
} from './projectBillable'

const po: ClientPO = {
  id: 'po-1',
  projectId: 'p-1',
  poNumber: 'PO-001',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  poValue: 100000,
  documentUrl: null,
  tdsRate: 10,
  milestones: [
    {
      id: 'ms-a',
      serviceId: 'svc-1',
      serviceName: 'Interior Design',
      name: 'Milestone A',
      percentage: 50,
      value: 5000,
      kind: 'regular',
      gstRate: 18,
    },
    {
      id: 'ms-b',
      serviceId: 'svc-1',
      serviceName: 'Interior Design',
      name: 'Milestone B',
      percentage: 30,
      value: 3000,
      kind: 'regular',
      gstRate: 18,
    },
    {
      id: 'cli-ret-1',
      serviceId: 'svc-1',
      serviceName: 'Interior Design',
      name: 'Retention',
      percentage: 20,
      value: 2000,
      kind: 'retention',
      gstRate: 18,
    },
  ],
}

const flatMilestones = flattenClientPoMilestones(po)

describe('buildAutoDraftLines', () => {
  it('creates one line per selected milestone and retention (Test 7)', () => {
    const lines = buildAutoDraftLines(
      ['ms-a', 'ms-b', 'cli-ret-1'],
      flatMilestones,
      [],
      'p-1',
      [],
      [],
      po,
      po.tdsRate,
      null,
    )
    expect(lines).toHaveLength(3)
    expect(lines.map((l) => l.milestoneId)).toEqual(['ms-a', 'ms-b', 'cli-ret-1'])
  })

  it('skips milestones with zero remaining (Test 8)', () => {
    const invoices: Invoice[] = [
      {
        id: 'inv-1',
        invoiceNo: 'INV-1',
        clientId: 'c-1',
        clientName: 'Client',
        projectId: 'p-1',
        projectName: 'Project',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-31',
        lineItems: [
          {
            id: 'li-b',
            serviceId: 'svc-1',
            serviceName: 'Interior Design',
            sacCode: '',
            amount: 3000,
            gstRate: 18,
            gstAmount: 540,
            milestoneId: 'ms-b',
            baselineServiceId: 'svc-1',
            lineSource: 'milestone',
          },
        ],
        baseAmount: 3000,
        gstAmount: 540,
        totalAmount: 3540,
        tdsDeducted: 0,
        totalReceived: 0,
        balance: 3540,
        status: 'sent',
        payments: [],
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ]

    const lines = buildAutoDraftLines(
      ['ms-a', 'ms-b', 'cli-ret-1'],
      flatMilestones,
      invoices,
      'p-1',
      [],
      [],
      po,
      po.tdsRate,
      null,
    )
    expect(lines.map((l) => l.milestoneId)).toEqual(['ms-a', 'cli-ret-1'])
  })
})

describe('countSelectedMilestonesWithZeroRemaining', () => {
  it('counts selected milestones excluded from draft lines', () => {
    const billed = new Map([['ms-b', 3000]])
    expect(
      countSelectedMilestonesWithZeroRemaining(['ms-a', 'ms-b', 'cli-ret-1'], flatMilestones, billed),
    ).toBe(1)
  })
})

import { describe, expect, it, vi } from 'vitest'

vi.mock('./clientInvoiceUtils', () => ({
  isInvoiceFullyPaid: (inv: {
    status: string
    grossAmount?: number
    payments?: Array<{ netReceived: number }>
  }) => {
    if (inv.status === 'paid') return true
    const paid = (inv.payments ?? []).reduce((sum, payment) => sum + payment.netReceived, 0)
    return paid >= (inv.grossAmount ?? 0) - 0.01
  },
}))

import type { ClientInvoice } from '@/slices/live/types'
import {
  clientMilestoneIsLocked,
  clientRetentionIsLocked,
  findClientInvoiceForMilestone,
  clientRetentionPaymentStatus,
} from './milestonePaymentStatus'

function invoice(partial: Partial<ClientInvoice> & Pick<ClientInvoice, 'id'>): ClientInvoice {
  return {
    projectId: 'proj-1',
    milestoneId: '—',
    milestoneName: '—',
    serviceId: '',
    serviceName: '—',
    lineItems: [],
    baseAmount: 10000,
    gstAmount: 1800,
    grossAmount: 11800,
    tdsAmount: 0,
    netReceivable: 11800,
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-08-13',
    dueDate: '2026-09-13',
    status: 'sent',
    payments: [],
    ...partial,
  }
}

describe('findClientInvoiceForMilestone', () => {
  it('matches generated invoices by line milestone id even when service ids differ', () => {
    const inv = invoice({
      id: 'inv-1',
      milestoneId: 'cpm-1',
      milestoneName: 'Mobilization',
      serviceId: 'baseline-svc',
      serviceName: 'Interior Design',
      lineItems: [
        {
          id: 'li-1',
          serviceId: 'master-svc',
          serviceName: 'Mobilization — Interior Design',
          sacCode: '998391',
          amount: 10000,
          gstRate: 18,
          gstAmount: 1800,
          milestoneId: 'cpm-1',
          baselineServiceId: 'baseline-svc',
          lineSource: 'milestone',
        },
      ],
    })

    expect(findClientInvoiceForMilestone([inv], 'cpm-1', 'master-svc')).toEqual(inv)
    expect(findClientInvoiceForMilestone([inv], 'cpm-1', 'other-svc')).toEqual(inv)
  })

  it('falls back to milestone name when finance used a different milestone id', () => {
    const inv = invoice({
      id: 'inv-2',
      milestoneId: 'baseline-ms-1',
      milestoneName: 'Concept Design',
      serviceId: 'master-svc',
      serviceName: 'Interior Design',
      lineItems: [
        {
          id: 'li-2',
          serviceId: 'master-svc',
          serviceName: 'Concept Design — Interior Design',
          sacCode: '998391',
          amount: 10000,
          gstRate: 18,
          gstAmount: 1800,
          milestoneId: 'baseline-ms-1',
          lineSource: 'milestone',
        },
      ],
    })

    expect(
      findClientInvoiceForMilestone([inv], 'cpm-concept', 'master-svc', 'Concept Design'),
    ).toEqual(inv)
  })

  it('returns undefined when no invoice covers the milestone', () => {
    const inv = invoice({
      id: 'inv-3',
      milestoneId: 'cpm-other',
      milestoneName: 'Working Drawings',
      serviceId: 'master-svc',
      lineItems: [
        {
          id: 'li-3',
          serviceId: 'master-svc',
          serviceName: 'Working Drawings',
          sacCode: '998392',
          amount: 5000,
          gstRate: 18,
          gstAmount: 900,
          milestoneId: 'cpm-other',
          lineSource: 'milestone',
        },
      ],
    })

    expect(findClientInvoiceForMilestone([inv], 'cpm-missing', 'master-svc', 'Mobilization')).toBeUndefined()
  })
})

describe('clientRetentionPaymentStatus', () => {
  it('returns Unpaid when parent milestone is billed but retention is not', () => {
    const parentInv = invoice({
      id: 'inv-parent',
      milestoneId: 'cpm-1',
      milestoneName: 'Mobilization',
      serviceId: 'svc-1',
      lineItems: [
        {
          id: 'li-1',
          serviceId: 'svc-1',
          serviceName: 'Interior Design',
          sacCode: '998391',
          amount: 10000,
          gstRate: 18,
          gstAmount: 1800,
          milestoneId: 'cpm-1',
          lineSource: 'milestone',
        },
      ],
    })

    expect(clientRetentionPaymentStatus([parentInv], 'cpm-1')).toBe('Unpaid')
  })

  it('returns Billed when retention-specific invoice exists', () => {
    const retentionInv = invoice({
      id: 'inv-ret',
      milestoneId: 'cpm-1-retention',
      milestoneName: 'Mobilization — Retention',
      serviceId: 'svc-1',
      lineItems: [
        {
          id: 'li-ret',
          serviceId: 'svc-1',
          serviceName: 'Mobilization — Retention',
          sacCode: '998391',
          amount: 2000,
          gstRate: 18,
          gstAmount: 360,
          milestoneId: 'cpm-1-retention',
          lineSource: 'milestone',
        },
      ],
    })

    expect(clientRetentionPaymentStatus([retentionInv], 'cpm-1')).toBe('Billed')
  })

  it('returns Paid when retention invoice is fully paid', () => {
    const retentionInv = invoice({
      id: 'inv-ret-paid',
      milestoneId: 'cpm-1-retention',
      milestoneName: 'Mobilization — Retention',
      serviceId: 'svc-1',
      status: 'paid',
      grossAmount: 2360,
      payments: [{ id: 'p1', amountReceived: 2360, tdsDeducted: 0, netReceived: 2360, date: '2026-08-15', paymentMode: 'bank_transfer' as const, recordedAt: '2026-08-15' }],
      lineItems: [
        {
          id: 'li-ret2',
          serviceId: 'svc-1',
          serviceName: 'Mobilization — Retention',
          sacCode: '998391',
          amount: 2000,
          gstRate: 18,
          gstAmount: 360,
          milestoneId: 'cpm-1-retention',
          lineSource: 'milestone',
        },
      ],
    })

    expect(clientRetentionPaymentStatus([retentionInv], 'cpm-1')).toBe('Paid')
  })

  it('returns Unpaid when no invoices exist', () => {
    expect(clientRetentionPaymentStatus([], 'cpm-1')).toBe('Unpaid')
  })
})

describe('invoice coverage locks milestones and retention', () => {
  const statuses = [
    'draft',
    'uploaded',
    'sent',
    'tax',
    'partially_paid',
    'paid',
    'overdue',
  ] as const

  it.each(statuses)('locks milestone when a %s invoice covers it', (status) => {
    const inv = invoice({
      id: `inv-${status}`,
      status: status as ClientInvoice['status'],
      milestoneId: 'cpm-lock',
      lineItems: [
        {
          id: 'li-lock',
          serviceId: 'svc-1',
          serviceName: 'Mobilization',
          sacCode: '998391',
          amount: 1000,
          gstRate: 18,
          gstAmount: 180,
          milestoneId: 'cpm-lock',
          lineSource: 'milestone',
        },
      ],
    })
    expect(clientMilestoneIsLocked([inv], 'cpm-lock', 'svc-1', 'Mobilization')).toBe(true)
  })

  it.each(statuses)('locks retention when a %s invoice covers retention id', (status) => {
    const inv = invoice({
      id: `inv-ret-${status}`,
      status: status as ClientInvoice['status'],
      milestoneId: 'cpm-1-retention',
      lineItems: [
        {
          id: 'li-ret-lock',
          serviceId: 'svc-1',
          serviceName: 'Retention',
          sacCode: '998391',
          amount: 500,
          gstRate: 18,
          gstAmount: 90,
          milestoneId: 'cpm-1-retention',
          lineSource: 'milestone',
        },
      ],
    })
    expect(clientRetentionIsLocked([inv], 'cpm-1')).toBe(true)
  })

  it('unlocks milestone when covering invoice is removed', () => {
    expect(clientMilestoneIsLocked([], 'cpm-lock', 'svc-1', 'Mobilization')).toBe(false)
  })
})

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
  balancePending: (inv: { grossAmount?: number; payments?: Array<{ netReceived: number }> }) => {
    const paid = (inv.payments ?? []).reduce((sum, payment) => sum + payment.netReceived, 0)
    return Math.max(0, (inv.grossAmount ?? 0) - paid)
  },
  totalReceivedBank: (payments?: Array<{ netReceived: number }>) =>
    (payments ?? []).reduce((sum, payment) => sum + payment.netReceived, 0),
}))

import type { ClientInvoice } from '@/slices/live/types'
import {
  clientMilestoneIsLocked,
  clientRetentionIsLocked,
  findClientInvoiceForMilestone,
  clientRetentionPaymentStatus,
  findVendorInvoiceForMilestone,
  findVendorInvoicesForMilestone,
  vendorMilestoneIsLocked,
  vendorMilestonePaymentStatus,
} from './milestonePaymentStatus'
import {
  milestoneBillingPhase,
  milestonePaymentPhase,
} from './clientMilestoneBillingStatus'
import {
  vendorMilestoneBillingPhase,
  vendorMilestonePaymentPhase,
} from './vendorMilestoneBillingStatus'
import { vendorMilestoneNetPayable } from './vendorSettlement/utils'
import type { VendorInvoice } from '@/slices/live/types'

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

function vendorInv(
  partial: Partial<VendorInvoice> & Pick<VendorInvoice, 'id' | 'milestoneId'>,
): VendorInvoice {
  return {
    projectId: 'proj-1',
    vendorId: 'v1',
    vendorName: 'Vendor',
    serviceId: 'svc-1',
    serviceName: 'Carpentry',
    milestoneName: 'Advance',
    invoiceNumber: 'VIN-1',
    invoiceDate: '2026-08-01',
    baseAmount: 1000,
    tdsRate: 0,
    tdsAmount: 0,
    netPayable: 1000,
    status: 'pending',
    ...partial,
  }
}

describe('vendor invoice coverage', () => {
  it('locks by matching milestone id', () => {
    const inv = vendorInv({ id: 'v-inv-1', milestoneId: 'vm-1' })
    expect(vendorMilestoneIsLocked([inv], 'vm-1')).toBe(true)
    expect(vendorMilestonePaymentStatus([inv], 'vm-1')).toBe('Billed')
  })

  it('falls back to milestone name (+ service) when ids differ', () => {
    const inv = vendorInv({
      id: 'v-inv-2',
      milestoneId: 'finance-ms-1',
      milestoneName: 'Advance',
      serviceId: 'svc-1',
    })
    expect(findVendorInvoiceForMilestone([inv], 'vm-local', 'svc-1', 'Advance')).toEqual(inv)
    expect(vendorMilestoneIsLocked([inv], 'vm-local', undefined, 'svc-1', 'Advance')).toBe(true)
  })

  it('returns Unpaid when no covering invoice', () => {
    expect(vendorMilestonePaymentStatus([], 'vm-1')).toBe('Unpaid')
    expect(vendorMilestoneIsLocked([], 'vm-1')).toBe(false)
  })

  it('returns all covering invoices for partial billing', () => {
    const invA = vendorInv({ id: 'v-inv-a', milestoneId: 'vm-1', baseAmount: 400 })
    const invB = vendorInv({ id: 'v-inv-b', milestoneId: 'vm-1', baseAmount: 600 })
    expect(findVendorInvoicesForMilestone([invA, invB], 'vm-1')).toHaveLength(2)
  })

  it('covers via lineItems milestone id', () => {
    const inv = vendorInv({
      id: 'v-inv-3',
      milestoneId: 'header',
      lineItems: [{ milestoneId: 'vm-line', milestoneName: 'Progress', amount: 500 }],
    })
    expect(vendorMilestoneIsLocked([inv], 'vm-line')).toBe(true)
  })

  it('covers retention via lineItems when header is another milestone', () => {
    const inv = vendorInv({
      id: 'v-inv-ret',
      milestoneId: 'vm-1',
      status: 'not_paid',
      lineItems: [
        { milestoneId: 'vm-1', milestoneName: 'Advance', amount: 400 },
        { milestoneId: 'ret-1', milestoneName: 'Retention', amount: 100 },
      ],
    })
    expect(findVendorInvoicesForMilestone([inv], 'ret-1', 'svc-1', 'Retention')).toHaveLength(1)
    expect(vendorMilestonePaymentStatus([inv], 'ret-1', 'svc-1', 'Retention')).toBe('Billed')
    expect(vendorMilestonePaymentPhase(findVendorInvoicesForMilestone([inv], 'ret-1'))).toBe('unpaid')
  })

  it('invoice creation with not_paid status stays unpaid for payment phase', () => {
    const inv = vendorInv({ id: 'v-new', milestoneId: 'vm-1', status: 'not_paid' })
    expect(vendorMilestonePaymentPhase([inv])).toBe('unpaid')
    expect(vendorMilestonePaymentStatus([inv], 'vm-1')).toBe('Billed')
  })

  it.each(['pending', 'approved', 'paid', 'partially_paid', 'not_paid'] as const)(
    'locks when covering invoice status is %s',
    (status) => {
      const inv = vendorInv({ id: `v-${status}`, milestoneId: 'vm-1', status })
      expect(vendorMilestoneIsLocked([inv], 'vm-1')).toBe(true)
      expect(vendorMilestonePaymentStatus([inv], 'vm-1')).toBe(
        status === 'paid' ? 'Paid' : 'Billed',
      )
    },
  )

  it('unlocks after covering invoice is removed', () => {
    expect(vendorMilestoneIsLocked([], 'vm-1', undefined, '', 'Advance')).toBe(false)
  })

  it('does not lock from stored milestone.status=Paid without an invoice', () => {
    expect(vendorMilestoneIsLocked([], 'vm-1', 'Paid', '', 'Advance')).toBe(false)
  })
})

describe('milestone billing vs payment status', () => {
  it('any tax invoice is fully invoiced with unpaid payment state', () => {
    const tax = invoice({ id: 'inv-1', status: 'sent' })
    expect(milestoneBillingPhase([tax])).toBe('fully_invoiced')
    expect(milestonePaymentPhase([tax])).toBe('unpaid')
  })

  it('fully invoiced milestone with zero payments stays unpaid', () => {
    const a = invoice({ id: 'inv-a', status: 'sent' })
    expect(milestoneBillingPhase([a])).toBe('fully_invoiced')
    expect(milestonePaymentPhase([a])).toBe('unpaid')
  })

  it('fully invoiced + partial payment → partially paid', () => {
    const paid = invoice({
      id: 'inv-paid',
      status: 'partially_paid',
      payments: [{ id: 'p1', date: '2026-01-01', amountReceived: 200, tdsDeducted: 0, netReceived: 200, paymentMode: 'bank_transfer', recordedAt: '' }],
    })
    expect(milestoneBillingPhase([paid])).toBe('fully_invoiced')
    expect(milestonePaymentPhase([paid])).toBe('partially_paid')
  })

  it('fully paid → paid', () => {
    const paid = invoice({
      id: 'inv-paid',
      status: 'paid',
      payments: [
        {
          id: 'p1',
          date: '2026-01-01',
          amountReceived: 11800,
          tdsDeducted: 0,
          netReceived: 11800,
          paymentMode: 'bank_transfer',
          recordedAt: '',
        },
      ],
    })
    expect(milestonePaymentPhase([paid])).toBe('paid')
  })
})

describe('vendor milestone billing vs payment status', () => {
  it('any covering invoice is fully invoiced with unpaid payment state', () => {
    const inv = vendorInv({ id: 'v-1', milestoneId: 'vm-1', status: 'approved' })
    expect(vendorMilestoneBillingPhase([inv])).toBe('fully_invoiced')
    expect(vendorMilestonePaymentPhase([inv])).toBe('unpaid')
  })

  it('single invoice + zero payment → fully invoiced / unpaid', () => {
    const a = vendorInv({ id: 'v-a', milestoneId: 'vm-1', status: 'approved', invoiceNumber: 'V-1' })
    expect(vendorMilestoneBillingPhase([a])).toBe('fully_invoiced')
    expect(vendorMilestonePaymentPhase([a])).toBe('unpaid')
  })

  it('fully invoiced + partial vendor payment → partially paid', () => {
    const inv = vendorInv({ id: 'v-1', milestoneId: 'vm-1', status: 'partially_paid' })
    expect(vendorMilestoneBillingPhase([inv])).toBe('fully_invoiced')
    expect(vendorMilestonePaymentPhase([inv])).toBe('partially_paid')
  })

  it('all vendor invoices paid → paid', () => {
    const inv = vendorInv({ id: 'v-1', milestoneId: 'vm-1', status: 'paid' })
    expect(vendorMilestonePaymentPhase([inv])).toBe('paid')
  })

  it('net payable base ₹500 TDS 10% → ₹450 without GST', () => {
    expect(vendorMilestoneNetPayable(500, 10)).toBe(450)
  })
})

function receivableNet(base: number, gstRate: number, tdsRate: number): number {
  const gst = Math.round((base * gstRate) / 100)
  const tds = Math.round((base * tdsRate) / 100)
  return base + gst - tds
}

describe('receivable invoice net (generate draft display)', () => {
  it('base ₹500, GST 18%, TDS 10% → Net ₹540', () => {
    expect(receivableNet(500, 18, 10)).toBe(540)
  })

  it('base ₹9,000, GST 18%, TDS 10% → Net ₹9,720', () => {
    expect(receivableNet(9000, 18, 10)).toBe(9720)
  })

  it('remaining base ₹5,000 → Net ₹5,400 with same rates', () => {
    expect(receivableNet(5000, 18, 10)).toBe(5400)
  })

  it('service GST 12% differs from 18% default rate', () => {
    expect(receivableNet(9000, 12, 10)).not.toBe(receivableNet(9000, 18, 10))
  })
})

describe('vendorMilestoneNetPayable (payable)', () => {
  it('base ₹9,000, TDS 10% → Net ₹8,100 without GST', () => {
    expect(vendorMilestoneNetPayable(9000, 10)).toBe(8100)
  })
})

import { describe, expect, it } from 'vitest'
import type { ClientInvoice } from '@/slices/live/types'
import { findClientInvoiceForMilestone } from './milestonePaymentStatus'

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

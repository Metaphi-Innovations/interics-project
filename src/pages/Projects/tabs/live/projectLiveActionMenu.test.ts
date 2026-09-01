import { describe, expect, it } from 'vitest'
import type { ClientInvoice } from '@/slices/live/types'
import {
  findDraftInvoiceForMilestone,
  findTaxInvoiceEligibleForPayment,
  shouldShowReceivableConvertToTax,
  shouldShowReceivableRecordPayment,
} from './projectLiveReceivableActions'
import {
  payableListingMenuIncludesDelete,
  payableListingMenuLabels,
  shouldRenderProjectLiveActionMenuTrigger,
} from './projectLivePayableActions'

function invoice(partial: Partial<ClientInvoice> & Pick<ClientInvoice, 'id' | 'status'>): ClientInvoice {
  return {
    projectId: 'proj-1',
    milestoneId: 'cpm-1',
    milestoneName: 'Mobilization',
    serviceId: 'svc-1',
    serviceName: 'Interior Design',
    lineItems: [],
    baseAmount: 10000,
    gstAmount: 1800,
    grossAmount: 11800,
    tdsAmount: 0,
    netReceivable: 11800,
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-08-13',
    dueDate: '2026-09-13',
    payments: [],
    ...partial,
  }
}

const balancePending = (inv: ClientInvoice) => inv.netReceivable

describe('projectLiveReceivableActions', () => {
  it('shows Convert to Tax when a draft invoice exists', () => {
    const draft = invoice({ id: 'inv-draft', status: 'draft' })
    expect(shouldShowReceivableConvertToTax([draft])).toBe(true)
    expect(findDraftInvoiceForMilestone([draft])).toEqual(draft)
  })

  it('hides Record Payment when only a draft invoice exists', () => {
    const draft = invoice({ id: 'inv-draft', status: 'draft' })
    expect(shouldShowReceivableRecordPayment([draft], balancePending)).toBe(false)
    expect(findTaxInvoiceEligibleForPayment([draft], balancePending)).toBeUndefined()
  })

  it('shows Record Payment for a tax invoice with balance pending', () => {
    const tax = invoice({ id: 'inv-tax', status: 'sent', netReceivable: 5000 })
    expect(shouldShowReceivableRecordPayment([tax], balancePending)).toBe(true)
    expect(findTaxInvoiceEligibleForPayment([tax], balancePending)).toEqual(tax)
  })

  it('hides Record Payment when no invoice exists', () => {
    expect(shouldShowReceivableRecordPayment([], balancePending)).toBe(false)
    expect(shouldShowReceivableConvertToTax([])).toBe(false)
  })

  it('prefers draft for conversion and tax invoice for payment when both exist', () => {
    const draft = invoice({ id: 'inv-draft', status: 'draft' })
    const tax = invoice({ id: 'inv-tax', status: 'partially_paid', netReceivable: 2000 })
    const both = [draft, tax]
    expect(findDraftInvoiceForMilestone(both)?.id).toBe('inv-draft')
    expect(findTaxInvoiceEligibleForPayment(both, balancePending)?.id).toBe('inv-tax')
    expect(shouldShowReceivableConvertToTax(both)).toBe(true)
    expect(shouldShowReceivableRecordPayment(both, balancePending)).toBe(true)
  })
})

describe('projectLivePayableActions', () => {
  it('renders action-menu trigger for milestone rows even when menu items are hidden', () => {
    expect(shouldRenderProjectLiveActionMenuTrigger(0, true)).toBe(true)
    expect(shouldRenderProjectLiveActionMenuTrigger(0, false)).toBe(false)
    expect(shouldRenderProjectLiveActionMenuTrigger(1, false)).toBe(true)
  })

  it('exposes Upload Invoice only for unbilled milestones and omits Delete from listing', () => {
    expect(
      payableListingMenuLabels({
        isBilled: false,
        showViewInvoice: false,
        showRecordPayment: false,
      }),
    ).toEqual(['Upload Invoice'])
    expect(
      payableListingMenuLabels({
        isBilled: true,
        showViewInvoice: false,
        showRecordPayment: false,
      }),
    ).toEqual([])
    expect(payableListingMenuIncludesDelete()).toBe(false)
  })
})

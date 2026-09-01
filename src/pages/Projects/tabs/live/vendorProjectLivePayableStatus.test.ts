import { describe, expect, it } from 'vitest'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'
import {
  findPayableInvoiceEligibleForPayment,
  findPayableInvoiceForView,
  projectLivePayableBillingPhase,
  projectLivePayableBillingStatusBadge,
  projectLivePayablePaymentPhase,
  projectLivePayablePaymentStatusBadge,
} from './vendorProjectLivePayableStatus'
import {
  isPayableActionMenuTriggerDisabled,
  payableListingMenuIncludesDelete,
  payableListingMenuLabels,
  shouldRenderProjectLiveActionMenuTrigger,
  shouldShowPayableRecordPayment,
  shouldShowPayableViewInvoice,
} from './projectLivePayableActions'

function vendorInv(
  partial: Partial<VendorInvoice> & Pick<VendorInvoice, 'id'>,
): VendorInvoice {
  return {
    projectId: 'proj-1',
    vendorId: 'v-1',
    vendorName: 'Vendor',
    serviceId: 'svc-1',
    serviceName: 'Service',
    milestoneId: 'vm-1',
    milestoneName: 'Advance',
    invoiceNumber: 'V-1',
    invoiceDate: '2026-08-13',
    baseAmount: 10000,
    tdsRate: 10,
    tdsAmount: 1000,
    netPayable: 9000,
    status: 'approved',
    ...partial,
  }
}

function vendorPayment(
  partial: Partial<VendorPayment> & Pick<VendorPayment, 'id'>,
): VendorPayment {
  return {
    projectId: 'proj-1',
    vendorId: 'v-1',
    vendorName: 'Vendor',
    paymentDate: '2026-08-20',
    totalAmount: 9000,
    linkedInvoiceIds: [],
    linkedExpenseIds: [],
    linkedReimbursementIds: [],
    invoiceTotal: 9000,
    expenseDeductions: 0,
    reimbursementAdditions: 0,
    tdsDeducted: 0,
    netPaid: 9000,
    status: 'completed',
    ...partial,
  }
}

describe('vendorProjectLivePayableStatus', () => {
  it('uses only Not Invoiced / Invoiced billing labels', () => {
    expect(projectLivePayableBillingPhase([])).toBe('not_invoiced')
    expect(projectLivePayableBillingStatusBadge('not_invoiced').label).toBe('Not Invoiced')

    const inv = vendorInv({ id: 'v-1', status: 'pending' })
    expect(projectLivePayableBillingPhase([inv])).toBe('invoiced')
    expect(projectLivePayableBillingStatusBadge('invoiced').label).toBe('Invoiced')
  })

  it('does not expose Draft, Tax, or Partial billing labels', () => {
    const labels = [
      projectLivePayableBillingStatusBadge('not_invoiced').label,
      projectLivePayableBillingStatusBadge('invoiced').label,
    ]
    expect(labels).not.toContain('Draft')
    expect(labels).not.toContain('Tax')
    expect(labels).not.toContain('Partially Invoiced')
    expect(labels).not.toContain('Partial')
  })

  it('invoice with zero payment is Invoiced / Unpaid', () => {
    const inv = vendorInv({ id: 'v-1', netPayable: 9000, status: 'approved' })
    expect(projectLivePayableBillingPhase([inv])).toBe('invoiced')
    expect(projectLivePayablePaymentPhase([inv], [])).toBe('unpaid')
    expect(projectLivePayablePaymentStatusBadge('unpaid').label).toBe('Unpaid')
  })

  it('does not infer Paid from invoice status alone', () => {
    const inv = vendorInv({ id: 'v-1', status: 'paid', netPayable: 9000 })
    expect(projectLivePayablePaymentPhase([inv], [])).toBe('unpaid')
  })

  it('invoice with completed payment is Invoiced / Paid', () => {
    const inv = vendorInv({ id: 'v-1', netPayable: 9000 })
    const payment = vendorPayment({
      id: 'p-1',
      linkedInvoiceIds: ['v-1'],
      netPaid: 9000,
      status: 'completed',
    })
    expect(projectLivePayablePaymentPhase([inv], [payment])).toBe('paid')
    expect(projectLivePayablePaymentStatusBadge('paid').label).toBe('Paid')
  })

  it('partial settlement stays Unpaid until fully covered', () => {
    const inv = vendorInv({ id: 'v-1', netPayable: 9000 })
    const payment = vendorPayment({
      id: 'p-1',
      linkedInvoiceIds: ['v-1'],
      netPaid: 4000,
      status: 'partial',
    })
    expect(projectLivePayablePaymentPhase([inv], [payment])).toBe('unpaid')
  })

  it('retention with invoice and no payment is Invoiced / Unpaid', () => {
    const inv = vendorInv({
      id: 'v-ret',
      milestoneId: 'ret-1',
      milestoneName: 'Retention',
      status: 'approved',
    })
    expect(projectLivePayableBillingPhase([inv])).toBe('invoiced')
    expect(projectLivePayablePaymentPhase([inv], [])).toBe('unpaid')
  })

  it('does not expose Partially Paid payment label', () => {
    const labels = [
      projectLivePayablePaymentStatusBadge('unpaid').label,
      projectLivePayablePaymentStatusBadge('paid').label,
    ]
    expect(labels).not.toContain('Partially Paid')
    expect(labels).not.toContain('Partial')
    expect(labels).not.toContain('Billed')
  })

  it('finds unpaid invoice eligible for Record Payment', () => {
    const unpaid = vendorInv({ id: 'v-unpaid', netPayable: 9000 })
    const paid = vendorInv({ id: 'v-paid', netPayable: 5000 })
    const payment = vendorPayment({
      id: 'p-1',
      linkedInvoiceIds: ['v-paid'],
      netPaid: 5000,
      status: 'completed',
    })
    expect(findPayableInvoiceEligibleForPayment([unpaid, paid], [payment])?.id).toBe('v-unpaid')
    expect(findPayableInvoiceEligibleForPayment([paid], [payment])).toBeUndefined()
  })

  it('uses canonical first covering invoice for View Invoice', () => {
    const first = vendorInv({ id: 'v-first', invoiceNumber: 'V-1' })
    const second = vendorInv({ id: 'v-second', invoiceNumber: 'V-2' })
    expect(findPayableInvoiceForView([first, second])?.id).toBe('v-first')
    expect(findPayableInvoiceForView([])).toBeUndefined()
  })
})

describe('projectLivePayableActions', () => {
  it('keeps action-menu trigger clickable for all payable rows', () => {
    expect(shouldRenderProjectLiveActionMenuTrigger(0, true)).toBe(true)
    expect(isPayableActionMenuTriggerDisabled(0, true)).toBe(false)
    expect(isPayableActionMenuTriggerDisabled(0, false)).toBe(true)
  })

  it('supports clickable trigger for Not Invoiced, Invoiced, and Paid rows', () => {
    for (const visibleCount of [0, 1]) {
      expect(isPayableActionMenuTriggerDisabled(visibleCount, true)).toBe(false)
    }
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

  it('shows Record Payment only for Invoiced + Unpaid', () => {
    expect(shouldShowPayableRecordPayment('not_invoiced', 'unpaid')).toBe(false)
    expect(shouldShowPayableRecordPayment('invoiced', 'unpaid')).toBe(true)
    expect(shouldShowPayableRecordPayment('invoiced', 'paid')).toBe(false)
  })

  it('shows View Invoice whenever invoiced regardless of payment status', () => {
    expect(shouldShowPayableViewInvoice('not_invoiced')).toBe(false)
    expect(shouldShowPayableViewInvoice('invoiced')).toBe(true)
  })

  it('includes View Invoice and Record Payment in menu labels when eligible', () => {
    expect(
      payableListingMenuLabels({
        isBilled: true,
        showViewInvoice: true,
        showRecordPayment: true,
      }),
    ).toEqual(['View Invoice', 'Record Payment'])
    expect(
      payableListingMenuLabels({
        isBilled: true,
        showViewInvoice: true,
        showRecordPayment: false,
      }),
    ).toEqual(['View Invoice'])
  })

  it('does not use Draft/Tax conditions for Record Payment visibility', () => {
    expect(shouldShowPayableRecordPayment('invoiced', 'unpaid')).toBe(true)
    expect(shouldShowPayableRecordPayment('not_invoiced', 'unpaid')).toBe(false)
  })

  it('retention with invoice shows View Invoice independent of payment', () => {
    expect(shouldShowPayableViewInvoice('invoiced')).toBe(true)
    expect(shouldShowPayableRecordPayment('invoiced', 'paid')).toBe(false)
  })
})

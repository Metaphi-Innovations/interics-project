import { describe, expect, it } from 'vitest'
import type { VendorInvoice } from '@/slices/live/types'
import {
  getVendorInvoiceMilestoneAmount,
  remainingVendorMilestoneValue,
  sumBilledPerVendorMilestone,
  vendorMilestoneFullyInvoiced,
  vendorMilestoneIsSelectable,
  type FlatVendorMilestone,
} from './vendorBillable'

const M1: FlatVendorMilestone = {
  milestoneId: 'm1',
  milestoneName: 'Milestone 1',
  serviceId: 'svc-1',
  serviceName: 'svc-1',
  value: 100_000,
  isRetention: false,
}

const M2: FlatVendorMilestone = {
  milestoneId: 'm2',
  milestoneName: 'Milestone 2',
  serviceId: 'svc-1',
  serviceName: 'svc-1',
  value: 50_000,
  isRetention: false,
}

function inv(partial: Partial<VendorInvoice> & Pick<VendorInvoice, 'id'>): VendorInvoice {
  return {
    projectId: 'p-1',
    vendorId: 'v-1',
    vendorPoId: 'po-1',
    vendorName: 'Vendor',
    serviceId: 'svc-1',
    serviceName: 'svc-1',
    milestoneId: '',
    milestoneName: '',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-01-01',
    baseAmount: 0,
    tdsRate: 10,
    tdsAmount: 0,
    netPayable: 0,
    status: 'not_paid',
    ...partial,
  }
}

describe('vendorBillable monetary billing', () => {
  it('counts header + line item for same milestone only once', () => {
    const invoice = inv({
      id: 'inv-1',
      milestoneId: 'm1',
      baseAmount: 40_000,
      lineItems: [{ milestoneId: 'm1', amount: 40_000 }],
    })
    expect(getVendorInvoiceMilestoneAmount(invoice, M1, 'po-1')).toBe(40_000)
  })

  it('partial milestone remains selectable with 60k remaining', () => {
    const invoices = [
      inv({
        id: 'inv-1',
        milestoneId: 'm1',
        baseAmount: 40_000,
        lineItems: [{ milestoneId: 'm1', amount: 40_000 }],
      }),
    ]
    const billed = sumBilledPerVendorMilestone(
      invoices,
      'p-1',
      'po-1',
      'v-1',
      'svc-1',
      [M1],
    ).get('m1')!
    expect(billed).toBe(40_000)
    expect(remainingVendorMilestoneValue(billed, M1.value)).toBe(60_000)
    expect(vendorMilestoneIsSelectable(billed, M1.value)).toBe(true)
    expect(vendorMilestoneFullyInvoiced(M1.value, billed)).toBe(false)
  })

  it('fully invoiced milestone is not selectable', () => {
    const invoices = [
      inv({
        id: 'inv-1',
        milestoneId: 'm1',
        baseAmount: 100_000,
        lineItems: [{ milestoneId: 'm1', amount: 100_000 }],
      }),
    ]
    const billed = sumBilledPerVendorMilestone(
      invoices,
      'p-1',
      'po-1',
      'v-1',
      'svc-1',
      [M1],
    ).get('m1')!
    expect(vendorMilestoneIsSelectable(billed, M1.value)).toBe(false)
  })

  it('sums multiple invoices for same milestone', () => {
    const invoices = [
      inv({
        id: 'inv-a',
        milestoneId: 'm1',
        baseAmount: 30_000,
        lineItems: [{ milestoneId: 'm1', amount: 30_000 }],
      }),
      inv({
        id: 'inv-b',
        milestoneId: 'm1',
        baseAmount: 20_000,
        lineItems: [{ milestoneId: 'm1', amount: 20_000 }],
      }),
    ]
    const billed = sumBilledPerVendorMilestone(
      invoices,
      'p-1',
      'po-1',
      'v-1',
      'svc-1',
      [M1],
    ).get('m1')!
    expect(billed).toBe(50_000)
    expect(remainingVendorMilestoneValue(billed, M1.value)).toBe(50_000)
  })

  it('tracks M1 and M2 independently', () => {
    const invoices = [
      inv({
        id: 'inv-1',
        milestoneId: 'm1',
        baseAmount: 100_000,
        lineItems: [{ milestoneId: 'm1', amount: 100_000 }],
      }),
    ]
    const map = sumBilledPerVendorMilestone(
      invoices,
      'p-1',
      'po-1',
      'v-1',
      'svc-1',
      [M1, M2],
    )
    expect(map.get('m1')).toBe(100_000)
    expect(map.get('m2')).toBe(0)
    expect(vendorMilestoneIsSelectable(map.get('m1')!, M1.value)).toBe(false)
    expect(vendorMilestoneIsSelectable(map.get('m2')!, M2.value)).toBe(true)
  })

  it('Finance upload eligibility: partial milestone not fully invoiced', () => {
    expect(vendorMilestoneFullyInvoiced(M1.value, 40_000)).toBe(false)
    expect(vendorMilestoneIsSelectable(40_000, M1.value)).toBe(true)
  })

  it('Finance upload eligibility: fully invoiced milestone excluded', () => {
    expect(vendorMilestoneFullyInvoiced(M1.value, 100_000)).toBe(true)
    expect(vendorMilestoneIsSelectable(100_000, M1.value)).toBe(false)
  })
})

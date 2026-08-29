import { describe, expect, it } from 'vitest'
import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'
import type { VendorPOMilestoneOverviewRow } from './vendorPOHelpers'
import {
  resolvePayableMilestoneAmounts,
  resolvePayableMilestoneDueDate,
  resolvePayableMilestonePaymentSummary,
} from './projectLivePayableMilestoneDisplay'

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
  it('shows milestone base only when no invoice (no TDS deduction)', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 10 })

    expect(resolvePayableMilestoneAmounts(row, undefined, po)).toEqual({
      base: 10000,
      tdsRate: null,
      tdsAmount: 0,
      net: 10000,
    })
  })

  it('uses persisted invoice TDS/net when invoice exists', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo()
    const invoice = vendorInv({
      id: 'inv-1',
      baseAmount: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      netPayable: 9000,
    })

    expect(resolvePayableMilestoneAmounts(row, invoice, po)).toEqual({
      base: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      net: 9000,
    })
  })

  it('shows TDS for invoiced unpaid milestones (payment status does not affect breakdown)', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const invoice = vendorInv({
      id: 'inv-unpaid',
      baseAmount: 10000,
      tdsAmount: 1000,
      netPayable: 9000,
      status: 'pending',
    })

    expect(resolvePayableMilestoneAmounts(row, invoice, vendorPo())).toEqual({
      base: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      net: 9000,
    })
  })

  it('shows TDS for invoiced paid milestones', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const invoice = vendorInv({
      id: 'inv-paid',
      baseAmount: 10000,
      tdsAmount: 1000,
      netPayable: 9000,
      status: 'paid',
    })

    expect(resolvePayableMilestoneAmounts(row, invoice, vendorPo())).toEqual({
      base: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      net: 9000,
    })
  })

  it('retention not invoiced shows base only without TDS deduction', () => {
    const row = overviewRow({
      milestoneId: 'ret-1',
      amount: 5000,
      name: 'Retention',
      milestoneType: 'retention',
      isRetention: true,
    })

    expect(resolvePayableMilestoneAmounts(row, undefined, vendorPo())).toEqual({
      base: 5000,
      tdsRate: null,
      tdsAmount: 0,
      net: 5000,
    })
  })

  it('retention invoiced uses persisted invoice TDS/net values', () => {
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

    expect(resolvePayableMilestoneAmounts(row, invoice, vendorPo())).toEqual({
      base: 5000,
      tdsRate: 10,
      tdsAmount: 500,
      net: 4500,
    })
  })

  it('uses persisted invoice values when settings TDS would differ', () => {
    const row = overviewRow({ milestoneId: 'm1', amount: 10000 })
    const po = vendorPo({ tdsRate: 5 })
    const invoice = vendorInv({
      id: 'inv-historical',
      baseAmount: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      netPayable: 9000,
    })

    expect(resolvePayableMilestoneAmounts(row, invoice, po)).toEqual({
      base: 10000,
      tdsRate: 10,
      tdsAmount: 1000,
      net: 9000,
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

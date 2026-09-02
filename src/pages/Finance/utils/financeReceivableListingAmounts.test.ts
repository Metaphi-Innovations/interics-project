import { describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/Finance/components/InvoiceLineItems', () => ({
  computeGst: (base: number, rate: number) => Math.round((base * rate) / 100),
}))

import type { Invoice } from '@/slices/receivables/reducer'
import {
  balancePending,
  calcClientInvoiceTdsAmount,
  clientInvoiceAmountBreakdownNet,
  rollupsFromLineItems,
  totalReceivedBank,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import { invoiceToClientInvoice } from '@/pages/Projects/tabs/live/invoiceAdapters'
import {
  financeReceivableNetAmount,
  financeReceivableOutstanding,
} from './financeReceivableListingAmounts'

function buildInvoice(overrides: Partial<Invoice> & Pick<Invoice, 'id'>): Invoice {
  const baseAmount = overrides.baseAmount ?? 10000
  const gstRate = overrides.lineItems?.[0]?.gstRate ?? 18
  const gstAmount = overrides.gstAmount ?? Math.round(baseAmount * gstRate) / 100
  const totalAmount = overrides.totalAmount ?? baseAmount + gstAmount
  const tdsRate = overrides.tdsRate ?? 10
  const tdsDeducted = overrides.tdsDeducted ?? calcClientInvoiceTdsAmount(baseAmount, tdsRate)
  const labourCessAmount = overrides.lineItems?.[0]?.labourCessAmount ?? overrides.labourCessAmount ?? 0
  const lineNetAmount =
    overrides.lineItems?.[0]?.netAmount ??
    baseAmount + labourCessAmount + gstAmount - tdsDeducted
  const payments = overrides.payments ?? []
  const totalReceived =
    overrides.totalReceived ??
    payments.reduce((s, p) => s + p.amountReceived, 0)

  return {
    invoiceNo: 'INV-001',
    clientId: 'c1',
    clientName: 'Client',
    projectId: 'p1',
    projectName: 'Project',
    invoiceDate: '2026-08-01',
    dueDate: '2026-08-31',
    lineItems: [
      {
        id: 'li-1',
        serviceId: 's1',
        serviceName: 'Service',
        sacCode: '998314',
        amount: baseAmount,
        gstRate,
        gstAmount,
        labourCessAmount,
        tdsAmount: tdsDeducted,
        netAmount: lineNetAmount,
        milestoneId: 'm1',
      },
    ],
    baseAmount,
    gstAmount,
    totalAmount,
    tdsDeducted,
    tdsRate,
    totalReceived,
    balance: totalAmount - tdsDeducted - totalReceived,
    status: 'tax',
    payments,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

describe('financeReceivableListingAmounts', () => {
  it('Net Amount matches Project Live Amount Breakdown → Net', () => {
    const inv = buildInvoice({ id: 'inv-1', tdsRate: 10 })
    const clientInv = invoiceToClientInvoice(inv)
    expect(financeReceivableNetAmount(inv)).toBe(clientInvoiceAmountBreakdownNet(clientInv))
  })

  it('Pending Amount matches Project Live Payment Summary → Outstanding', () => {
    const inv = buildInvoice({
      id: 'inv-2',
      payments: [{ id: 'p1', date: '2026-08-10', amountReceived: 3000, tdsDeducted: 0, netReceived: 3000, paymentMode: 'bank_transfer', recordedAt: '2026-08-10T00:00:00Z' }],
      totalReceived: 3000,
    })
    const clientInv = invoiceToClientInvoice(inv)
    expect(financeReceivableOutstanding(inv)).toBe(balancePending(clientInv))
  })

  it('zero payment: Net = outstanding, Received = 0', () => {
    const inv = buildInvoice({ id: 'inv-3', baseAmount: 10000, gstAmount: 0, totalAmount: 10000, tdsRate: 10, tdsDeducted: 1000 })
    expect(financeReceivableNetAmount(inv)).toBe(9000)
    expect(financeReceivableOutstanding(inv)).toBe(9000)
  })

  it('partial payment', () => {
    const inv = buildInvoice({
      id: 'inv-4',
      baseAmount: 10000,
      gstAmount: 0,
      totalAmount: 10000,
      tdsRate: 10,
      tdsDeducted: 1000,
      payments: [{ id: 'p1', date: '2026-08-10', amountReceived: 3000, tdsDeducted: 0, netReceived: 3000, paymentMode: 'bank_transfer', recordedAt: '2026-08-10T00:00:00Z' }],
      totalReceived: 3000,
    })
    expect(financeReceivableNetAmount(inv)).toBe(9000)
    expect(financeReceivableOutstanding(inv)).toBe(6000)
  })

  it('multiple partial payments aggregate to correct outstanding', () => {
    const inv = buildInvoice({
      id: 'inv-5',
      baseAmount: 10000,
      gstAmount: 0,
      totalAmount: 10000,
      tdsRate: null,
      tdsDeducted: 0,
      payments: [
        { id: 'p1', date: '2026-08-01', amountReceived: 2000, tdsDeducted: 0, netReceived: 2000, paymentMode: 'bank_transfer', recordedAt: '2026-08-01T00:00:00Z' },
        { id: 'p2', date: '2026-08-05', amountReceived: 3000, tdsDeducted: 0, netReceived: 3000, paymentMode: 'bank_transfer', recordedAt: '2026-08-05T00:00:00Z' },
        { id: 'p3', date: '2026-08-08', amountReceived: 1000, tdsDeducted: 0, netReceived: 1000, paymentMode: 'bank_transfer', recordedAt: '2026-08-08T00:00:00Z' },
      ],
      totalReceived: 6000,
    })
    expect(financeReceivableNetAmount(inv)).toBe(10000)
    expect(financeReceivableOutstanding(inv)).toBe(4000)
    expect(totalReceivedBank(invoiceToClientInvoice(inv).payments)).toBe(6000)
  })

  it('full payment: outstanding = 0', () => {
    const inv = buildInvoice({
      id: 'inv-6',
      baseAmount: 10000,
      gstAmount: 0,
      totalAmount: 10000,
      tdsRate: 10,
      tdsDeducted: 1000,
      payments: [{ id: 'p1', date: '2026-08-10', amountReceived: 9000, tdsDeducted: 0, netReceived: 9000, paymentMode: 'bank_transfer', recordedAt: '2026-08-10T00:00:00Z' }],
      totalReceived: 9000,
      status: 'paid',
    })
    expect(financeReceivableNetAmount(inv)).toBe(9000)
    expect(financeReceivableOutstanding(inv)).toBe(0)
  })

  it('labour cess invoice net uses line netAmount (351540)', () => {
    const inv = buildInvoice({
      id: 'inv-cess',
      baseAmount: 300_000,
      gstAmount: 54_540,
      totalAmount: 357_540,
      tdsRate: 2,
      tdsDeducted: 6_000,
      lineItems: [
        {
          id: 'li-1',
          serviceId: 's1',
          serviceName: 'Service',
          sacCode: '998314',
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
    })
    expect(financeReceivableNetAmount(inv)).toBe(351_540)
    expect(financeReceivableNetAmount(inv)).not.toBe(354_540)
  })

  it('GST + TDS: uses persisted line items and invoice amounts', () => {
    const inv = buildInvoice({
      id: 'inv-7',
      baseAmount: 10000,
      labourCessAmount: 100,
      gstAmount: 1818,
      totalAmount: 11918,
      tdsRate: 10,
      tdsDeducted: 1000,
      lineItems: [
        {
          id: 'li-1',
          serviceId: 's1',
          serviceName: 'Service',
          sacCode: '998314',
          amount: 10000,
          gstRate: 18,
          gstAmount: 1818,
          labourCessAmount: 100,
          tdsAmount: 1000,
          netAmount: 10918,
          milestoneId: 'm1',
        },
      ],
    })
    expect(financeReceivableNetAmount(inv)).toBe(10918)
  })

  it('Net Amount != Pending Amount when payments exist', () => {
    const inv = buildInvoice({
      id: 'inv-8',
      baseAmount: 10000,
      gstAmount: 0,
      totalAmount: 10000,
      tdsRate: 10,
      tdsDeducted: 1000,
      payments: [{ id: 'p1', date: '2026-08-10', amountReceived: 3000, tdsDeducted: 0, netReceived: 3000, paymentMode: 'bank_transfer', recordedAt: '2026-08-10T00:00:00Z' }],
      totalReceived: 3000,
    })
    expect(financeReceivableNetAmount(inv)).toBe(9000)
    expect(financeReceivableOutstanding(inv)).toBe(6000)
    expect(financeReceivableNetAmount(inv)).not.toBe(financeReceivableOutstanding(inv))
  })
})

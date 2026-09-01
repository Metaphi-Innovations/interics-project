import { describe, expect, it } from 'vitest'
import type { Invoice } from '@/slices/receivables/reducer'
import { isPartiallyPaidInvoice, showPartialPaidAlongsideTabStatus } from './invoiceStatus'

function inv(partial: Partial<Invoice> & Pick<Invoice, 'id'>): Invoice {
  return {
    invoiceNo: 'INV-1',
    clientId: 'c1',
    clientName: 'Client',
    projectId: 'p1',
    projectName: 'Project',
    invoiceDate: '2026-01-01',
    dueDate: '2026-02-01',
    lineItems: [],
    baseAmount: 500,
    gstAmount: 90,
    totalAmount: 590,
    balance: 540,
    status: 'tax',
    payments: [],
    totalReceived: 0,
    tdsDeducted: 50,
    tdsRate: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('invoiceStatus payment vs billing', () => {
  it('does not treat invoice-level TDS as partial payment when no receipts', () => {
    expect(isPartiallyPaidInvoice(inv({ id: '1' }))).toBe(false)
    expect(showPartialPaidAlongsideTabStatus(inv({ id: '1' }))).toBe(false)
  })

  it('shows partially paid only after bank receipt', () => {
    const withPayment = inv({
      id: '2',
      totalReceived: 200,
      balance: 340,
      payments: [
        {
          id: 'pay-1',
          date: '2026-01-15',
          amountReceived: 200,
          tdsDeducted: 0,
          netReceived: 200,
          paymentMode: 'bank_transfer',
          recordedAt: '2026-01-15T00:00:00.000Z',
        },
      ],
    })
    expect(isPartiallyPaidInvoice(withPayment)).toBe(true)
    expect(showPartialPaidAlongsideTabStatus(withPayment)).toBe(true)
  })
})

import { describe, expect, it, vi } from 'vitest'

vi.mock('./clientInvoiceUtils', () => ({
  roundMoney: (n: number) => Math.round(n * 100) / 100,
  calcClientInvoiceTdsAmount: () => 0,
}))

vi.mock('./clientPoGstResolution', () => ({
  resolveClientServiceGstRate: () => 18,
}))

import type { VendorInvoice } from '@/slices/live/types'
import { vendorMilestoneTaxDisplay, vendorMilestoneTaxPreview } from './poTaxDisplay'

describe('vendorMilestoneTaxDisplay', () => {
  const milestone = {
    id: 'vm-1',
    name: 'Mobilisation',
    value: 100_000,
    gstRate: 18,
    gstAmount: 18_000,
    net: 118_000,
  }

  it('returns null when no invoice covers the milestone', () => {
    expect(
      vendorMilestoneTaxDisplay(milestone, { invoices: [], serviceId: 'svc-1' }),
    ).toBeNull()
  })

  it('returns null for PO tax snapshots without a linked invoice', () => {
    expect(
      vendorMilestoneTaxDisplay(milestone, {
        invoices: [
          {
            id: 'inv-other',
            projectId: 'proj-1',
            vendorId: 'vendor-1',
            vendorName: 'Vendor',
            serviceId: 'svc-1',
            serviceName: 'Service',
            milestoneId: 'vm-2',
            milestoneName: 'Other',
            invoiceNumber: 'VINV-1',
            invoiceDate: '2026-01-01',
            baseAmount: 50_000,
            gstRate: 18,
            gstAmount: 9_000,
            tdsRate: 2,
            tdsAmount: 1_000,
            netPayable: 58_000,
            status: 'pending',
          },
        ],
        serviceId: 'svc-1',
      }),
    ).toBeNull()
  })

  it('reads GST from invoice header when milestone matches', () => {
    const invoice: VendorInvoice = {
      id: 'inv-1',
      projectId: 'proj-1',
      vendorId: 'vendor-1',
      vendorName: 'Vendor',
      serviceId: 'svc-1',
      serviceName: 'Service',
      milestoneId: 'vm-1',
      milestoneName: 'Mobilisation',
      invoiceNumber: 'VINV-1',
      invoiceDate: '2026-01-01',
      baseAmount: 100_000,
      gstRate: 18,
      gstAmount: 18_000,
      tdsRate: 2,
      tdsAmount: 2_000,
      netPayable: 116_000,
      status: 'pending',
    }

    const tax = vendorMilestoneTaxDisplay(milestone, {
      invoices: [invoice],
      serviceId: 'svc-1',
    })

    expect(tax).toEqual({
      base: 100_000,
      gstRate: 18,
      gstAmount: 18_000,
      tdsRate: null,
      tdsAmount: null,
      net: 116_000,
      fromSnapshot: false,
      gstFromInvoice: true,
    })
  })

  it('reads GST from invoice line items when present', () => {
    const invoice: VendorInvoice = {
      id: 'inv-2',
      projectId: 'proj-1',
      vendorId: 'vendor-1',
      vendorName: 'Vendor',
      serviceId: 'svc-1',
      serviceName: 'Service',
      milestoneId: 'vm-header',
      milestoneName: 'Header',
      invoiceNumber: 'VINV-2',
      invoiceDate: '2026-01-01',
      baseAmount: 100_000,
      gstRate: 18,
      gstAmount: 18_000,
      tdsRate: 2,
      tdsAmount: 2_000,
      netPayable: 116_000,
      status: 'pending',
      lineItems: [
        {
          milestoneId: 'vm-1',
          serviceId: 'svc-1',
          amount: 100_000,
          gstRate: 12,
          gstAmount: 12_000,
          netAmount: 112_000,
        },
      ],
    }

    const tax = vendorMilestoneTaxDisplay(milestone, {
      invoices: [invoice],
      serviceId: 'svc-1',
    })

    expect(tax?.gstRate).toBe(12)
    expect(tax?.gstAmount).toBe(12_000)
    expect(tax?.gstFromInvoice).toBe(true)
  })
})

describe('vendorMilestoneTaxPreview', () => {
  it('previews GST from PO rate in editor contexts', () => {
    const tax = vendorMilestoneTaxPreview({ value: 100_000 }, 18)
    expect(tax?.gstAmount).toBe(18_000)
    expect(tax?.fromSnapshot).toBe(false)
    expect(tax?.gstFromInvoice).toBeUndefined()
  })
})

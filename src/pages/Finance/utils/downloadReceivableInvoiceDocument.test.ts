import { beforeEach, describe, expect, it, vi } from 'vitest'
import { financeApi } from '@/api/financeApi'
import {
  downloadReceivableInvoiceDocument,
  receivableInvoiceDocumentHeadingFromStatus,
} from './downloadReceivableInvoiceDocument'

vi.mock('@/api/financeApi', () => ({
  financeApi: {
    downloadInvoiceDocument: vi.fn(),
  },
}))

describe('receivableInvoiceDocumentHeadingFromStatus', () => {
  it('uses draft heading for draft and uploaded', () => {
    expect(receivableInvoiceDocumentHeadingFromStatus('draft')).toBe('draft')
    expect(receivableInvoiceDocumentHeadingFromStatus('uploaded')).toBe('draft')
  })

  it('uses tax heading for tax/sent/paid statuses', () => {
    expect(receivableInvoiceDocumentHeadingFromStatus('sent')).toBe('tax')
    expect(receivableInvoiceDocumentHeadingFromStatus('tax')).toBe('tax')
    expect(receivableInvoiceDocumentHeadingFromStatus('partially_paid')).toBe('tax')
    expect(receivableInvoiceDocumentHeadingFromStatus('paid')).toBe('tax')
  })
})

describe('downloadReceivableInvoiceDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    const click = vi.fn()
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        href: '',
        download: '',
        click,
      })),
    })
  })

  it('calls Finance GET /invoices/:id/document with tax heading and .xlsx filename', async () => {
    vi.mocked(financeApi.downloadInvoiceDocument).mockResolvedValue({
      data: new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    } as Awaited<ReturnType<typeof financeApi.downloadInvoiceDocument>>)

    await downloadReceivableInvoiceDocument({
      invoiceId: 'inv-1',
      invoiceNo: 'INV/2026/001',
      heading: 'tax',
    })

    expect(financeApi.downloadInvoiceDocument).toHaveBeenCalledWith('inv-1', { heading: 'tax' })
    const anchor = vi.mocked(document.createElement).mock.results[0]?.value as {
      download: string
      click: ReturnType<typeof vi.fn>
    }
    expect(anchor.download).toBe('INV_2026_001.xlsx')
    expect(anchor.click).toHaveBeenCalled()
  })

  it('omits heading query for draft (Finance default DRAFT INVOICE)', async () => {
    vi.mocked(financeApi.downloadInvoiceDocument).mockResolvedValue({
      data: new Blob(['xlsx']),
    } as Awaited<ReturnType<typeof financeApi.downloadInvoiceDocument>>)

    await downloadReceivableInvoiceDocument({
      invoiceId: 'inv-draft',
      invoiceNo: 'DRAFT-1',
      heading: 'draft',
    })

    expect(financeApi.downloadInvoiceDocument).toHaveBeenCalledWith('inv-draft', undefined)
  })
})

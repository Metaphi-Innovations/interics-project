import { financeApi } from '@/api/financeApi'

export type ReceivableInvoiceDocumentHeading = 'draft' | 'tax'

/** Draft/uploaded → DRAFT INVOICE; all other statuses → TAX INVOICE (Finance convention). */
export function receivableInvoiceDocumentHeadingFromStatus(
  status: string | null | undefined,
): ReceivableInvoiceDocumentHeading {
  if (status === 'draft' || status === 'uploaded') return 'draft'
  return 'tax'
}

/**
 * Download the golden-master Draft/Tax Invoice (.xlsx) via the Finance Receivables
 * document endpoint — same path as Finance → Receivables Download Invoice.
 */
export async function downloadReceivableInvoiceDocument(options: {
  invoiceId: string
  invoiceNo?: string | null
  heading: ReceivableInvoiceDocumentHeading
}): Promise<void> {
  const { invoiceId, invoiceNo, heading } = options
  const res = await financeApi.downloadInvoiceDocument(
    invoiceId,
    heading === 'tax' ? { heading: 'tax' } : undefined,
  )
  const blob = res.data as Blob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const fallback = heading === 'tax' ? 'Tax_Invoice' : 'Draft_Invoice'
  a.download = `${(invoiceNo || fallback).replace(/[^\w.\-]+/g, '_')}.xlsx`
  a.click()
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

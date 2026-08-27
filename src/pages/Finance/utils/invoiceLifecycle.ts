/** Matches backend isDraftEquivalentVendorInvoiceStatus in live.service.ts */
export function isDraftEquivalentVendorInvoiceStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '')
    .trim()
    .toLowerCase()
  return s === 'draft' || s === 'uploaded' || s === 'pending' || s === 'not_paid' || s === ''
}

/** Matches backend isDraftEquivalentInvoiceStatus in invoice.service.ts */
export function isDraftEquivalentClientInvoiceStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '')
    .trim()
    .toLowerCase()
  return s === 'draft' || s === 'uploaded'
}

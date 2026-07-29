import type { Invoice } from '@/slices/receivables/reducer'

export interface ReceivableSummaryProject {
  status: string
  totalClientPOValue?: number
  startDate?: string | null
  createdAt?: string
}

export interface ReceivableSummaryKpis {
  /** Sum of Client PO values on Live projects (approved POs). */
  totalPoValue: number
  /** Sum of recorded client payments across invoices. */
  receivedTillDate: number
  /** Remaining receivable: Total PO Value − Received Till Date. */
  pending: number
  /** Unpaid balance on tax (non-draft) invoices — subset of Pending. */
  taxInvoiceRaised: number
  /** Total of draft invoices not yet converted to tax — subset of Pending. */
  draftInvoiceSent: number
}

/** Inclusive calendar bounds for KPI period filtering. Null start/end = unbounded. */
export interface ReceivableKpiDateBounds {
  start: Date | null
  end: Date | null
}

function isDraftInvoice(inv: Invoice): boolean {
  return inv.status === 'draft' || inv.status === 'uploaded'
}

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function dateInReceivableKpiBounds(
  iso: string | null | undefined,
  bounds?: ReceivableKpiDateBounds | null,
): boolean {
  if (!bounds || (!bounds.start && !bounds.end)) return true
  const d = parseIsoDate(iso)
  if (!d) return false
  if (bounds.start && d < bounds.start) return false
  if (bounds.end && d > bounds.end) return false
  return true
}

/**
 * Receivable dashboard summary KPIs.
 * When `bounds` is set, invoice/payment/project dates must fall in range.
 * Tax Invoice Raised and Draft Invoice Sent use unpaid / draft amounts
 * so they remain subsets of Pending when invoice data is consistent with POs.
 */
export function computeReceivableSummaryKpis(
  invoices: Invoice[],
  projects: ReceivableSummaryProject[],
  bounds?: ReceivableKpiDateBounds | null,
): ReceivableSummaryKpis {
  const liveProjects = projects.filter((p) => {
    if (p.status !== 'Live') return false
    return dateInReceivableKpiBounds(p.startDate ?? p.createdAt ?? null, bounds)
  })
  const totalPoValue = liveProjects.reduce((s, p) => s + (p.totalClientPOValue ?? 0), 0)

  const receivedTillDate = invoices.reduce((sum, inv) => {
    const payments = inv.payments ?? []
    if (payments.length === 0) {
      if (!dateInReceivableKpiBounds(inv.invoiceDate, bounds)) return sum
      return sum + (inv.totalReceived ?? 0)
    }
    return (
      sum +
      payments.reduce((ps, p) => {
        if (!dateInReceivableKpiBounds(p.date, bounds)) return ps
        return ps + (p.amountReceived ?? 0)
      }, 0)
    )
  }, 0)

  const pending = Math.max(0, totalPoValue - receivedTillDate)

  const draftInvoiceSent = invoices
    .filter(isDraftInvoice)
    .filter((i) => dateInReceivableKpiBounds(i.invoiceDate, bounds))
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)

  const taxInvoiceRaised = invoices
    .filter((i) => !isDraftInvoice(i))
    .filter((i) => dateInReceivableKpiBounds(i.invoiceDate, bounds))
    .reduce((s, i) => s + Math.max(0, i.balance ?? 0), 0)

  return {
    totalPoValue,
    receivedTillDate,
    pending,
    taxInvoiceRaised,
    draftInvoiceSent,
  }
}

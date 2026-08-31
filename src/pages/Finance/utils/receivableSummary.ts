/** KPI payload from GET /finance/receivables/summary (server-computed). */
export interface ReceivableSummaryKpis {
  /**
   * Sum of Client PO values on Live projects (Live Overview semantics),
   * scoped by Client PO.startDate to the Receivable KPI Date Range.
   */
  totalPoValue: number
  /** Sum of recorded client payments (bank only) on invoices in the filtered population. */
  receivedTillDate: number
  /** Outstanding on tax (non-draft) invoices: sum of invoice net − received per invoice. */
  pending: number
  /** Net receivable on tax (non-draft) invoices: Base + GST + Labour Cess − Client TDS. */
  taxInvoiceRaised: number
  /** Net receivable on draft/uploaded invoices: Base + GST + Labour Cess − Client TDS. */
  draftInvoiceSent: number
}

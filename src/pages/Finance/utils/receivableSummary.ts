/** KPI payload from GET /finance/receivables/summary (server-computed). */
export interface ReceivableSummaryKpis {
  /**
   * Sum of Client PO values on Live projects (Live Overview semantics),
   * scoped by Client PO.startDate to the Receivable KPI Date Range.
   */
  totalPoValue: number
  /** Sum of recorded client payments across invoices in the selected invoiceDate range. */
  receivedTillDate: number
  /** Outstanding on tax (non-draft) invoices: Tax Invoice Amount − Received on the same population. */
  pending: number
  /** Gross totalAmount on tax (non-draft) invoices in the selected invoiceDate range. */
  taxInvoiceRaised: number
  /** Total of draft/uploaded invoices not yet converted to tax. */
  draftInvoiceSent: number
}

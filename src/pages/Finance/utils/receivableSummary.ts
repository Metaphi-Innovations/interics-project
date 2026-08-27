/** KPI payload from GET /finance/receivables/summary (server-computed). */
export interface ReceivableSummaryKpis {
  /** Sum of Client PO values on Live projects (Live Overview semantics). */
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

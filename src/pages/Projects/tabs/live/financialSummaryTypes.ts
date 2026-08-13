/** Shared display types for the Financial Summary / Live Overview tab. */

export interface FinancialSummaryMetrics {
  clientPOAmount: number
  clientReceived: number
  pendingReceived: number
  vendorPOAmount: number
  vendorPaid: number
  pendingPaid: number
  projectedProfitPct: number | null
  actualProfitPct: number | null
}

export interface FinancialSummaryWorkstreamRow extends FinancialSummaryMetrics {
  id: string
  workstreamName: string
  kind: 'service' | 'expense'
}

export interface FinancialSummaryCategoryGroup {
  id: string
  name: string
  kind: 'category' | 'expenses'
  children: FinancialSummaryWorkstreamRow[]
  subtotal: FinancialSummaryMetrics
}

export type FinancialSummarySortField =
  | 'workstream'
  | 'clientPOAmount'
  | 'clientReceived'
  | 'pendingReceived'
  | 'vendorPOAmount'
  | 'vendorPaid'
  | 'pendingPaid'
  | 'projectedProfitPct'
  | 'actualProfitPct'

export type ServiceCatalogEntry = {
  id: string
  name: string
  categoryId?: string
  categoryName?: string
}

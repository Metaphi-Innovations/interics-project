import type {
  ClientInvoice,
  Expense,
  Reimbursement,
  VendorPayment,
} from '@/slices/live/types'

export type { ClientInvoice, Expense, Reimbursement, VendorPayment }

export interface FinanceListFilters {
  projectId?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}

export interface FinanceComplianceFilters {
  projectId?: string
  month?: string
  year?: string
  quarter?: string
  type?: string
}

export interface GlobalGstSummaryByProject {
  projectId: string
  projectName: string
  clientName: string
  gstAmount: number
  percentage: number
  invoiceCount: number
  baseAmount: number
}

export interface GlobalGstSummaryByMonth {
  month: number
  year: number
  gstAmount: number
  invoiceCount: number
  baseAmount: number
}

export interface GlobalGstSummary {
  totalGst: number
  thisMonth: number
  invoiceCount: number
  byProject: GlobalGstSummaryByProject[]
  byMonth: GlobalGstSummaryByMonth[]
}

export interface GlobalGstEntry {
  invoiceId: string
  invoiceNumber: string
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  baseAmount: number
  gstRate: number
  gstAmount: number
  invoiceDate: string
  status: string
}

export interface GlobalGstResponse {
  summary: GlobalGstSummary
  entries: GlobalGstEntry[]
}

export interface GlobalTdsSummary {
  clientTdsTotal: number
  vendorTdsTotal: number
  total: number
  byMonth: { month: number; year: number; clientTds: number; vendorTds: number }[]
}

export interface GlobalTdsClientEntry {
  invoiceId: string
  invoiceNumber: string
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  /** Invoice gross amount (before TDS deduction), ₹ */
  grossAmount: number
  tdsRate: number
  tdsAmount: number
  invoiceDate: string
  status: string
}

export interface GlobalTdsVendorEntry {
  paymentId: string
  projectId: string
  projectName: string
  vendorId: string
  vendorName: string
  invoiceTotal: number
  tdsRate: number
  tdsAmount: number
  paymentDate: string
  /** Linked vendor invoice numbers, else payment reference */
  invoiceNumber?: string
  /** Bank / payment reference when present on vendor payment */
  referenceNumber?: string
  status: string
}

export interface GlobalTdsResponse {
  summary: GlobalTdsSummary
  clientEntries: GlobalTdsClientEntry[]
  vendorEntries: GlobalTdsVendorEntry[]
}

/** Global POST /api/expenses */
export type CreateExpenseBody = Omit<Expense, 'id'> & { projectId: string }

export type FillingSummaryListType = 'gst' | 'client_tds' | 'vendor_tds'

export interface FillingSummaryKpis {
  totalGst: number
  gstThisMonth: number
  gstInvoiceCount: number
  clientTdsTotal: number
  vendorTdsTotal: number
  tdsTotal: number
}

export interface FillingSummaryChartPoint {
  period: string
  gst: number
  tds: number
}

export interface FillingSummaryPeriodRow {
  month: number
  year: number
  period: string
  gst: number
  clientTds: number
  vendorTds: number
}

export interface FillingSummaryPeriodBreakdown {
  projectId?: string
  projectName?: string
  periods: FillingSummaryPeriodRow[]
}

export type FillingSummaryGstEntry = GlobalGstEntry
export type FillingSummaryClientTdsEntry = GlobalTdsClientEntry
export type FillingSummaryVendorTdsEntry = GlobalTdsVendorEntry

export interface FillingSummaryListParams {
  type: FillingSummaryListType
  projectId?: string
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type GstListType = 'invoice' | 'project' | 'month'

export interface GstSummary {
  totalGst: number
  thisMonth: number
  invoiceCount: number
}

export interface GstChartPoint {
  period: string
  gst: number
}

export interface GstPeriodBreakdown {
  byProject: Array<{
    projectId: string
    projectName: string
    gstAmount: number
    percentage: number
  }>
  fy: {
    label: string
    gstTotal: number
  }
}

export interface GstProjectRow {
  projectId: string
  projectName: string
  clientName: string
  gstAmount: number
  percentage: number
  invoiceCount: number
  baseAmount: number
}

export interface GstMonthRow {
  month: number
  year: number
  gstAmount: number
  invoiceCount: number
  baseAmount: number
  period: string
}

export interface GstListParams {
  type: GstListType
  projectId?: string
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type TdsListType = 'client' | 'vendor'

export interface TdsSummary {
  clientTdsTotal: number
  vendorTdsTotal: number
  total: number
}

export interface TdsChartPoint {
  period: string
  clientTds: number
  vendorTds: number
}

export interface TdsPeriodBreakdown {
  clientTdsTotal: number
  vendorTdsTotal: number
  total: number
  fy: {
    label: string
    clientTds: number
    vendorTds: number
    total: number
  }
}

export interface TdsListParams {
  type: TdsListType
  projectId?: string
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

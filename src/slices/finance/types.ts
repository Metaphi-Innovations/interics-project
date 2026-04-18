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
  /** Bank / payment reference when present on vendor payment */
  referenceNumber?: string
}

export interface GlobalTdsResponse {
  summary: GlobalTdsSummary
  clientEntries: GlobalTdsClientEntry[]
  vendorEntries: GlobalTdsVendorEntry[]
}

/** Global POST /api/expenses */
export type CreateExpenseBody = Omit<Expense, 'id'> & { projectId: string }

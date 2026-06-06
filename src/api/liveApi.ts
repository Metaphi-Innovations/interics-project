import client from './client'
import type { Invoice } from '@/slices/receivables/reducer'
import type {
  ClientInvoice,
  ClientInvoicePaymentMode,
  ComplianceData,
  Expense,
  Reimbursement,
  VendorInvoice,
  VendorPayableControl,
  VendorPayment,
} from '@/slices/live/types'

const root = (projectId: string) => `/projects/${projectId}`

export type CreateClientInvoiceBody = Omit<ClientInvoice, 'id' | 'projectId'>
export type UpdateClientInvoiceBody = Partial<ClientInvoice>

export type RecordClientInvoicePaymentBody = {
  date: string
  amountReceived: number
  tdsDeducted: number
  paymentMode: ClientInvoicePaymentMode
  reference?: string
}

export type CreateVendorInvoiceBody = Omit<VendorInvoice, 'id' | 'projectId'>
export type CreateExpenseBody = Omit<Expense, 'id' | 'projectId'>
export type CreateVendorPaymentBody = Omit<VendorPayment, 'id' | 'projectId'>
export type CreateReimbursementBody = Omit<Reimbursement, 'id' | 'projectId'>

/** Global B1 client invoices — same store as Finance → Billings. */
export const liveApi = {
  getInvoices: (projectId: string) =>
    client.get<{ items: Invoice[]; total: number }>('/invoices', {
      params: { projectId, pageSize: 500 },
    }),

  createInvoice: (body: Record<string, unknown>) =>
    client.post<Invoice>('/invoices', body),

  updateInvoice: (_projectId: string, invoiceId: string, data: Record<string, unknown>) =>
    client.put<Invoice>(`/invoices/${invoiceId}`, data),

  recordInvoicePayment: (
    _projectId: string,
    invoiceId: string,
    data: Record<string, unknown>,
  ) => client.post<Invoice>(`/invoices/${invoiceId}/payments`, data),

  getVendorInvoices: (projectId: string) =>
    client.get<VendorInvoice[]>(`${root(projectId)}/vendor-invoices`),

  uploadVendorInvoice: (projectId: string, data: CreateVendorInvoiceBody) =>
    client.post<VendorInvoice>(`${root(projectId)}/vendor-invoices`, data),

  getVendorPayableControls: (projectId: string) =>
    client.get<VendorPayableControl[]>(`${root(projectId)}/vendor-payable-controls`),

  updateVendorPayableControl: (projectId: string, data: VendorPayableControl) =>
    client.put<VendorPayableControl>(`${root(projectId)}/vendor-payable-controls`, data),

  getPayments: (projectId: string) =>
    client.get<VendorPayment[]>(`${root(projectId)}/payments`),

  createPayment: (projectId: string, data: CreateVendorPaymentBody) =>
    client.post<VendorPayment>(`${root(projectId)}/payments`, data),

  getExpenses: (projectId: string) =>
    client.get<Expense[]>(`${root(projectId)}/expenses`),

  createExpense: (projectId: string, data: CreateExpenseBody) =>
    client.post<Expense>(`${root(projectId)}/expenses`, data),

  deleteExpense: (projectId: string, expenseId: string) =>
    client.delete<void>(`${root(projectId)}/expenses/${expenseId}`),

  getReimbursements: (projectId: string) =>
    client.get<Reimbursement[]>(`${root(projectId)}/reimbursements`),

  createReimbursement: (projectId: string, data: CreateReimbursementBody) =>
    client.post<Reimbursement>(`${root(projectId)}/reimbursements`, data),

  getCompliance: (projectId: string) =>
    client.get<ComplianceData>(`${root(projectId)}/compliance`),
}

import client from './client'
import type {
  ClientInvoice,
  CreateExpenseBody,
  Expense,
  GlobalGstResponse,
  GlobalTdsResponse,
  Reimbursement,
  VendorPayment,
} from '@/slices/finance/types'
import type { CreateClientInvoiceBody } from '@/api/liveApi'

export type FinanceCreateInvoiceBody = CreateClientInvoiceBody & { projectId: string }

export const financeApi = {
  getInvoices: (params?: Record<string, string | undefined>) =>
    client.get<ClientInvoice[]>('/invoices', { params }),

  createInvoice: (data: FinanceCreateInvoiceBody) =>
    client.post<ClientInvoice>('/invoices', data),

  getExpenses: (params?: Record<string, string | undefined>) =>
    client.get<Expense[]>('/expenses', { params }),

  createExpense: (data: CreateExpenseBody) => client.post<Expense>('/expenses', data),

  getPayments: (params?: Record<string, string | undefined>) =>
    client.get<VendorPayment[]>('/payments', { params }),

  getReimbursements: (params?: Record<string, string | undefined>) =>
    client.get<Reimbursement[]>('/reimbursements', { params }),

  getGstData: (params?: Record<string, string | undefined>) =>
    client.get<GlobalGstResponse>('/compliance/gst', { params }),

  getTdsData: (params?: Record<string, string | undefined>) =>
    client.get<GlobalTdsResponse>('/compliance/tds', { params }),
}

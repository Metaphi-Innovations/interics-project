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
    client.get('/finance/expenses', { params }),

  getExpenseFilters: () => client.get('/finance/expenses/filters'),

  getExpensesSummary: (params?: Record<string, string | undefined>) =>
    client.get('/finance/expenses/summary', { params }),

  createExpense: (data: CreateExpenseBody) => client.post<Expense>('/expenses', data),

  getPayments: (params?: Record<string, string | undefined>) =>
    client.get<VendorPayment[]>('/payments', { params }),

  getPayables: (params?: Record<string, string | number | undefined>) =>
    client.get('/finance/payables', { params }),

  getPayableFilters: () => client.get('/finance/payables/filters'),

  getReimbursements: (params?: Record<string, string | undefined>) =>
    client.get<Reimbursement[]>('/reimbursements', { params }),

  getGstData: (params?: Record<string, string | undefined>) =>
    client.get<GlobalGstResponse>('/finance/compliance/gst', { params }),

  getTdsData: (params?: Record<string, string | undefined>) =>
    client.get<GlobalTdsResponse>('/finance/compliance/tds', { params }),

  getComplianceSummary: (params?: Record<string, string | undefined>) =>
    client.get('/finance/compliance/summary', { params }),

  getReceivablesSummary: (params?: Record<string, string | undefined>) =>
    client.get('/finance/receivables/summary', { params }),

  getProjectsSummary: () => client.get('/projects/summary'),

  getTeamSummary: () => client.get('/teams/summary'),
}

import client from './client'
import type { RecordPaymentPayload } from '@/slices/receivables/paymentTypes'

export interface ReceivablesListParams extends Record<string, unknown> {
  page?: number
  pageSize?: number
  status?: string
  clientId?: string
  projectId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: string
  amountMax?: string
}

export const receivablesApi = {
  getAll: (params?: ReceivablesListParams) => client.get('/invoices', { params }),
  getById: (id: string) => client.get(`/invoices/${id}`),
  create: (data: Record<string, unknown>) => client.post('/invoices', data),
  update: (id: string, data: Record<string, unknown>) => client.put(`/invoices/${id}`, data),
  recordPayment: (id: string, data: RecordPaymentPayload) =>
    client.post(`/invoices/${id}/payments`, data),
  patchStatus: (id: string, data: { status: string }) =>
    client.patch(`/invoices/${id}/status`, data),
}

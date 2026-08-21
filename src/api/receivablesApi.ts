import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type { RecordPaymentPayload } from '@/slices/receivables/paymentTypes'
import type { Invoice } from '@/slices/receivables/reducer'

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
  invoiceNo?: string
  invoiceDate?: string
  dueDate?: string
  baseAmount?: number
  gstAmount?: number
  totalAmount?: number
  received?: number
  netReceivable?: number
  columns?: string[] | string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const receivablesApi = {
  getAll: async (params?: ReceivablesListParams) => {
    const { columns, ...rest } = params ?? {}
    const res = await client.get('/invoices', {
      params: {
        ...rest,
        ...(columns
          ? { columns: Array.isArray(columns) ? columns.join(',') : columns }
          : {}),
      },
    })
    return unwrapApiData<{ items: Invoice[]; total: number }>(res.data)
  },
  getFilters: async () => {
    const res = await client.get('/invoices/filters')
    return unwrapApiData<Record<string, Array<{ value: string; label: string }>>>(res.data)
  },
  getById: async (id: string) => {
    const res = await client.get(`/invoices/${id}`)
    return unwrapApiData<Invoice>(res.data)
  },
  create: async (data: Record<string, unknown>) => {
    const res = await client.post('/invoices', data)
    return unwrapApiData<Invoice>(res.data)
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const res = await client.put(`/invoices/${id}`, data)
    return unwrapApiData<Invoice>(res.data)
  },
  recordPayment: async (id: string, data: RecordPaymentPayload) => {
    const res = await client.post(`/invoices/${id}/payments`, data)
    return unwrapApiData<Invoice>(res.data)
  },
  patchStatus: async (id: string, data: { status: string }) => {
    const res = await client.patch(`/invoices/${id}/status`, data)
    return unwrapApiData<Invoice>(res.data)
  },
  convertDraftToTax: async (id: string) => {
    const res = await client.post(`/invoices/${id}/convert-to-tax`)
    return unwrapApiData<Invoice>(res.data)
  },
  delete: async (id: string) => {
    const res = await client.delete(`/invoices/${id}`)
    return unwrapApiData<null>(res.data)
  },
}

import client from './client'
import type { RecordVendorPaymentPayload } from '@/slices/payables/paymentTypes'

export interface PayablesListParams extends Record<string, unknown> {
  page?: number
  pageSize?: number
  status?: string
  vendorId?: string
  projectId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: string
  amountMax?: string
}

export const payablesApi = {
  getPOs: (params?: PayablesListParams) => client.get('/vendor-pos', { params }),
  getPOById: (id: string) => client.get(`/vendor-pos/${id}`),
  createPO: (data: Record<string, unknown>) => client.post('/vendor-pos', data),
  updatePO: (id: string, data: Record<string, unknown>) => client.put(`/vendor-pos/${id}`, data),
  issuePO: (id: string) => client.patch(`/vendor-pos/${id}/status`, { status: 'issued' }),

  getVendorInvoices: (params?: PayablesListParams) => client.get('/vendor-invoices', { params }),
  getVendorInvoiceById: (id: string) => client.get(`/vendor-invoices/${id}`),
  createVendorInvoice: (data: Record<string, unknown>) => client.post('/vendor-invoices', data),
  updateVendorInvoice: (id: string, data: Record<string, unknown>) =>
    client.put(`/vendor-invoices/${id}`, data),
  recordVendorPayment: (id: string, data: RecordVendorPaymentPayload) =>
    client.post(`/vendor-invoices/${id}/payments`, data),
}

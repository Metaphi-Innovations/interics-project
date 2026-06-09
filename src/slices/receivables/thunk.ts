import { createAsyncThunk } from '@reduxjs/toolkit'
import { receivablesApi } from '../../api/receivablesApi'
import { normalizeListResponse } from '@/utils/normalizeListResponse'
import type { Invoice } from './reducer'
import type { RecordPaymentPayload } from './paymentTypes'

export interface FetchInvoicesParams {
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

export const fetchInvoices = createAsyncThunk(
  'receivables/fetchAll',
  async (params: FetchInvoicesParams = {}, { rejectWithValue }) => {
    try {
      const response = await receivablesApi.getAll(params as Record<string, unknown>)
      return normalizeListResponse<Invoice>(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch invoices')
    }
  },
)

export const fetchInvoiceById = createAsyncThunk(
  'receivables/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await receivablesApi.getById(id)
      return response.data as Invoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch invoice')
    }
  },
)

export const createInvoice = createAsyncThunk(
  'receivables/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await receivablesApi.create(data)
      return response.data as Invoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create invoice')
    }
  },
)

export const updateInvoice = createAsyncThunk(
  'receivables/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await receivablesApi.update(id, data)
      return response.data as Invoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update invoice')
    }
  },
)

export const recordPayment = createAsyncThunk(
  'receivables/recordPayment',
  async (
    { invoiceId, payment }: { invoiceId: string; payment: RecordPaymentPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await receivablesApi.recordPayment(invoiceId, payment)
      return response.data as Invoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to record payment')
    }
  },
)

export const sendInvoice = createAsyncThunk(
  'receivables/send',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await receivablesApi.patchStatus(id, { status: 'tax' })
      return response.data as Invoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to send invoice')
    }
  },
)

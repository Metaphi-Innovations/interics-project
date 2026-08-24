import { createAsyncThunk } from '@reduxjs/toolkit'
import { receivablesApi } from '../../api/receivablesApi'
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
  invoiceNo?: string
  invoiceDate?: string
  dueDate?: string
  baseAmount?: number
  gstAmount?: number
  totalAmount?: number
  received?: number
  netReceivable?: number
  columns?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const fetchInvoices = createAsyncThunk(
  'receivables/fetchAll',
  async (params: FetchInvoicesParams = {}, { rejectWithValue }) => {
    try {
      const data = await receivablesApi.getAll(params as Record<string, unknown>)
      return { items: data.items ?? [], total: data.total ?? data.items?.length ?? 0 }
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
      return await receivablesApi.getById(id)
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
      return await receivablesApi.create(data)
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
      return await receivablesApi.update(id, data)
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
      return await receivablesApi.recordPayment(invoiceId, payment)
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
      return await receivablesApi.patchStatus(id, { status: 'sent' })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to send invoice')
    }
  },
)

export const convertDraftToTax = createAsyncThunk(
  'receivables/convertDraftToTax',
  async (id: string, { rejectWithValue }) => {
    try {
      return await receivablesApi.convertDraftToTax(id)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to convert draft invoice')
    }
  },
)

export const deleteInvoice = createAsyncThunk(
  'receivables/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await receivablesApi.delete(id)
      return id
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to delete invoice')
    }
  },
)

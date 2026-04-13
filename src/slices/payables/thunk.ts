import { createAsyncThunk } from '@reduxjs/toolkit'
import { payablesApi } from '@/api/payablesApi'
import type { VendorPO, VendorInvoice } from './reducer'
import type { RecordVendorPaymentPayload } from './paymentTypes'

export interface FetchListParams {
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

export const fetchPOs = createAsyncThunk(
  'payables/fetchPOs',
  async (params: FetchListParams = {}, { rejectWithValue }) => {
    try {
      const response = await payablesApi.getPOs(params as Record<string, unknown>)
      return response.data as { items: VendorPO[]; total: number }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch vendor POs')
    }
  },
)

export const fetchVendorInvoices = createAsyncThunk(
  'payables/fetchVendorInvoices',
  async (params: FetchListParams = {}, { rejectWithValue }) => {
    try {
      const response = await payablesApi.getVendorInvoices(params as Record<string, unknown>)
      return response.data as { items: VendorInvoice[]; total: number }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch vendor invoices')
    }
  },
)

export const fetchVendorPOById = createAsyncThunk(
  'payables/fetchVendorPOById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await payablesApi.getPOById(id)
      return response.data as VendorPO
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch PO')
    }
  },
)

export const fetchVendorInvoiceById = createAsyncThunk(
  'payables/fetchVendorInvoiceById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await payablesApi.getVendorInvoiceById(id)
      return response.data as VendorInvoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch vendor invoice')
    }
  },
)

export const createPO = createAsyncThunk(
  'payables/createPO',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await payablesApi.createPO(data)
      return response.data as VendorPO
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create PO')
    }
  },
)

export const updateVendorPO = createAsyncThunk(
  'payables/updateVendorPO',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await payablesApi.updatePO(id, data)
      return response.data as VendorPO
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update PO')
    }
  },
)

export const issueVendorPO = createAsyncThunk(
  'payables/issueVendorPO',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await payablesApi.issuePO(id)
      return response.data as VendorPO
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to issue PO')
    }
  },
)

export const createVendorInvoice = createAsyncThunk(
  'payables/createVendorInvoice',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await payablesApi.createVendorInvoice(data)
      return response.data as VendorInvoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create vendor invoice')
    }
  },
)

export const updateVendorInvoice = createAsyncThunk(
  'payables/updateVendorInvoice',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await payablesApi.updateVendorInvoice(id, data)
      return response.data as VendorInvoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update vendor invoice')
    }
  },
)

export const recordVendorPayment = createAsyncThunk(
  'payables/recordVendorPayment',
  async (
    { invoiceId, payment }: { invoiceId: string; payment: RecordVendorPaymentPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await payablesApi.recordVendorPayment(invoiceId, payment)
      return response.data as VendorInvoice
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to record payment')
    }
  },
)

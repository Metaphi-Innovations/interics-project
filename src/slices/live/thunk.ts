import { createAsyncThunk } from '@reduxjs/toolkit'
import { liveApi, type RecordClientInvoicePaymentBody } from '@/api/liveApi'
import type { Invoice } from '@/slices/receivables/reducer'
import {
  clientInvoiceDraftToReceivablesPost,
  invoiceToClientInvoice,
} from '@/pages/Projects/tabs/live/invoiceAdapters'
import type {
  ClientInvoice,
  Expense,
  Reimbursement,
  VendorInvoice,
  VendorPayableControl,
  VendorPayment,
} from './types'

function errMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e.response?.data?.message ?? e.message ?? fallback
}

export const fetchInvoices = createAsyncThunk<
  ClientInvoice[],
  string,
  { rejectValue: string }
>('live/fetchInvoices', async (projectId, { rejectWithValue }) => {
  try {
    const res = await liveApi.getInvoices(projectId)
    const rows = res.data.items ?? []
    return rows.map(invoiceToClientInvoice)
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch invoices'))
  }
})

export const createInvoice = createAsyncThunk<
  ClientInvoice,
  {
    projectId: string
    projectName: string
    clientId: string
    clientName: string
    data: Omit<ClientInvoice, 'id' | 'projectId'>
    sendNow?: boolean
  },
  { rejectValue: string }
>(
  'live/createInvoice',
  async (
    { projectId, projectName, clientId, clientName, data, sendNow = true },
    { rejectWithValue },
  ) => {
    try {
      const body = clientInvoiceDraftToReceivablesPost(
        projectId,
        projectName,
        clientId,
        clientName,
        data,
        { sendNow },
      )
      const res = await liveApi.createInvoice(body)
      return invoiceToClientInvoice(res.data)
    } catch (err) {
      return rejectWithValue(errMessage(err, 'Failed to create invoice'))
    }
  },
)

export const updateInvoice = createAsyncThunk<
  ClientInvoice,
  { projectId: string; invoiceId: string; data: Partial<ClientInvoice> },
  { rejectValue: string }
>('live/updateInvoice', async ({ projectId, invoiceId, data }, { rejectWithValue }) => {
  try {
    const res = await liveApi.updateInvoice(projectId, invoiceId, data as unknown as Record<string, unknown>)
    return invoiceToClientInvoice(res.data as Invoice)
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to update invoice'))
  }
})

export const recordInvoicePayment = createAsyncThunk<
  ClientInvoice,
  { projectId: string; invoiceId: string; data: RecordClientInvoicePaymentBody },
  { rejectValue: string }
>('live/recordInvoicePayment', async ({ projectId, invoiceId, data }, { rejectWithValue }) => {
  try {
    const payload: Record<string, unknown> = {
      date: data.date,
      amountReceived: data.amountReceived,
      tdsDeducted: data.tdsDeducted ?? 0,
      paymentMode: data.paymentMode === 'cash' ? 'other' : data.paymentMode,
      reference: data.reference,
    }
    const res = await liveApi.recordInvoicePayment(projectId, invoiceId, payload)
    return invoiceToClientInvoice(res.data)
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to record payment'))
  }
})

export const fetchVendorInvoices = createAsyncThunk<
  VendorInvoice[],
  string,
  { rejectValue: string }
>('live/fetchVendorInvoices', async (projectId, { rejectWithValue }) => {
  try {
    const res = await liveApi.getVendorInvoices(projectId)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch vendor invoices'))
  }
})

export const uploadVendorInvoice = createAsyncThunk<
  VendorInvoice,
  { projectId: string; data: Omit<VendorInvoice, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/uploadVendorInvoice', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const res = await liveApi.uploadVendorInvoice(projectId, data)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to upload vendor invoice'))
  }
})

export const fetchVendorPayableControls = createAsyncThunk<
  VendorPayableControl[],
  string,
  { rejectValue: string }
>('live/fetchVendorPayableControls', async (projectId, { rejectWithValue }) => {
  try {
    const res = await liveApi.getVendorPayableControls(projectId)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch payable controls'))
  }
})

export const updateVendorPayableControl = createAsyncThunk<
  VendorPayableControl,
  { projectId: string; data: VendorPayableControl },
  { rejectValue: string }
>('live/updateVendorPayableControl', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const res = await liveApi.updateVendorPayableControl(projectId, data)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to update payable controls'))
  }
})

export const fetchPayments = createAsyncThunk<
  VendorPayment[],
  string,
  { rejectValue: string }
>('live/fetchPayments', async (projectId, { rejectWithValue }) => {
  try {
    const res = await liveApi.getPayments(projectId)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch payments'))
  }
})

export const createPayment = createAsyncThunk<
  VendorPayment,
  { projectId: string; data: Omit<VendorPayment, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createPayment', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const res = await liveApi.createPayment(projectId, data)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to create payment'))
  }
})

export const fetchExpenses = createAsyncThunk<
  Expense[],
  string,
  { rejectValue: string }
>('live/fetchExpenses', async (projectId, { rejectWithValue }) => {
  try {
    const res = await liveApi.getExpenses(projectId)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch expenses'))
  }
})

export const createExpense = createAsyncThunk<
  Expense,
  { projectId: string; data: Omit<Expense, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createExpense', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const res = await liveApi.createExpense(projectId, data)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to create expense'))
  }
})

export const deleteExpense = createAsyncThunk<
  { projectId: string; expenseId: string },
  { projectId: string; expenseId: string },
  { rejectValue: string }
>('live/deleteExpense', async ({ projectId, expenseId }, { rejectWithValue }) => {
  try {
    await liveApi.deleteExpense(projectId, expenseId)
    return { projectId, expenseId }
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to delete expense'))
  }
})

export const fetchReimbursements = createAsyncThunk<
  Reimbursement[],
  string,
  { rejectValue: string }
>('live/fetchReimbursements', async (projectId, { rejectWithValue }) => {
  try {
    const res = await liveApi.getReimbursements(projectId)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch reimbursements'))
  }
})

export const createReimbursement = createAsyncThunk<
  Reimbursement,
  { projectId: string; data: Omit<Reimbursement, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createReimbursement', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const res = await liveApi.createReimbursement(projectId, data)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to create reimbursement'))
  }
})

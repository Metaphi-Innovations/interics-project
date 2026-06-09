import { createAsyncThunk } from '@reduxjs/toolkit'
import { liveApi, type RecordClientInvoicePaymentBody } from '@/api/liveApi'
import { normalizeArrayResponse } from '@/utils/normalizeListResponse'
import type { Invoice } from '@/slices/receivables/reducer'
import {
  clientInvoiceDraftToReceivablesPost,
  invoiceToClientInvoice,
} from '@/pages/Projects/tabs/live/invoiceAdapters'
import {
  findReimbursementForExpense,
  findReimbursementForPlannedExpense,
  isReimbursableExpenseType,
  reimbursableExpenseToReimbursementBody,
} from '@/utils/reimbursableSync'
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
    return normalizeArrayResponse<VendorInvoice>(res.data)
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
    return normalizeArrayResponse<VendorPayableControl>(res.data)
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
    return normalizeArrayResponse<VendorPayment>(res.data)
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
    return normalizeArrayResponse<Expense>(res.data)
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch expenses'))
  }
})

export const createExpense = createAsyncThunk<
  Expense,
  { projectId: string; data: Omit<Expense, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createExpense', async ({ projectId, data }, { rejectWithValue, dispatch }) => {
  try {
    const res = await liveApi.createExpense(projectId, data)
    const expense = res.data
    if (isReimbursableExpenseType(data.type)) {
      await dispatch(
        createReimbursement({
          projectId,
          data: reimbursableExpenseToReimbursementBody(expense),
        }),
      ).unwrap()
    }
    return expense
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to create expense'))
  }
})

export const deleteExpense = createAsyncThunk<
  { projectId: string; expenseId: string; linkedReimbursementId?: string },
  { projectId: string; expenseId: string },
  { rejectValue: string; state: { live: { expenses: Expense[]; reimbursements: Reimbursement[] } } }
>('live/deleteExpense', async ({ projectId, expenseId }, { rejectWithValue, getState, dispatch }) => {
  try {
    const expense = getState().live.expenses.find((e) => e.id === expenseId)
    const linked =
      expense && isReimbursableExpenseType(expense.type)
        ? findReimbursementForExpense(getState().live.reimbursements, expenseId)
        : undefined
    await liveApi.deleteExpense(projectId, expenseId)
    if (linked) {
      await dispatch(deleteReimbursement({ projectId, reimbursementId: linked.id })).unwrap()
    }
    return { projectId, expenseId, linkedReimbursementId: linked?.id }
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
    return normalizeArrayResponse<Reimbursement>(res.data)
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

export const deleteReimbursement = createAsyncThunk<
  { projectId: string; reimbursementId: string },
  { projectId: string; reimbursementId: string },
  { rejectValue: string }
>('live/deleteReimbursement', async ({ projectId, reimbursementId }, { rejectWithValue }) => {
  try {
    await liveApi.deleteReimbursement(projectId, reimbursementId)
    return { projectId, reimbursementId }
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to delete reimbursement'))
  }
})

export const deleteReimbursementForPlannedExpense = createAsyncThunk<
  { projectId: string; plannedExpenseId: string; deletedId?: string },
  { projectId: string; plannedExpenseId: string },
  { rejectValue: string; state: { live: { reimbursements: Reimbursement[] } } }
>(
  'live/deleteReimbursementForPlannedExpense',
  async ({ projectId, plannedExpenseId }, { rejectWithValue, getState, dispatch }) => {
    try {
      const linked = findReimbursementForPlannedExpense(
        getState().live.reimbursements,
        plannedExpenseId,
      )
      if (!linked) return { projectId, plannedExpenseId }
      await dispatch(deleteReimbursement({ projectId, reimbursementId: linked.id })).unwrap()
      return { projectId, plannedExpenseId, deletedId: linked.id }
    } catch (err) {
      return rejectWithValue(errMessage(err, 'Failed to delete linked reimbursement'))
    }
  },
)

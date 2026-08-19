import { createAsyncThunk } from '@reduxjs/toolkit'
import { financeApi } from '@/api/financeApi'
import type {
  ClientInvoice,
  CreateExpenseBody,
  Expense,
  Reimbursement,
  VendorPayment,
} from './types'
import type { FinanceCreateInvoiceBody } from '@/api/financeApi'

function errMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e.response?.data?.message ?? e.message ?? fallback
}

function cleanParams(
  p?: Record<string, string | undefined>,
): Record<string, string> | undefined {
  if (!p) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== '') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

export const fetchFinanceInvoices = createAsyncThunk<
  ClientInvoice[],
  Record<string, string | undefined> | undefined,
  { rejectValue: string }
>('finance/fetchInvoices', async (params, { rejectWithValue }) => {
  try {
    const res = await financeApi.getInvoices(cleanParams(params))
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch invoices'))
  }
})

export const createFinanceInvoice = createAsyncThunk<
  ClientInvoice,
  FinanceCreateInvoiceBody,
  { rejectValue: string }
>('finance/createInvoice', async (data, { rejectWithValue }) => {
  try {
    const res = await financeApi.createInvoice(data)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to create invoice'))
  }
})

export const fetchFinanceExpenses = createAsyncThunk<
  Expense[],
  Record<string, string | undefined> | undefined,
  { rejectValue: string }
>('finance/fetchExpenses', async (params, { rejectWithValue }) => {
  try {
    const res = await financeApi.getExpenses(cleanParams(params))
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch expenses'))
  }
})

export const createFinanceExpense = createAsyncThunk<
  Expense,
  CreateExpenseBody,
  { rejectValue: string }
>('finance/createExpense', async (data, { rejectWithValue }) => {
  try {
    const res = await financeApi.createExpense(data)
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to create expense'))
  }
})

export const fetchFinancePayments = createAsyncThunk<
  VendorPayment[],
  Record<string, string | undefined> | undefined,
  { rejectValue: string }
>('finance/fetchPayments', async (params, { rejectWithValue }) => {
  try {
    const res = await financeApi.getPayments(cleanParams(params))
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch payments'))
  }
})

export const fetchFinanceReimbursements = createAsyncThunk<
  Reimbursement[],
  Record<string, string | undefined> | undefined,
  { rejectValue: string }
>('finance/fetchReimbursements', async (params, { rejectWithValue }) => {
  try {
    const res = await financeApi.getReimbursements(cleanParams(params))
    return res.data
  } catch (err) {
    return rejectWithValue(errMessage(err, 'Failed to fetch reimbursements'))
  }
})

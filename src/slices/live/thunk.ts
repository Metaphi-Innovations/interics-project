import { createAsyncThunk } from '@reduxjs/toolkit'
import type { Invoice, VendorInvoice, Expense, ChangeRequest, ComplianceData } from './reducer'

const BASE = '/api/projects'

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const fetchInvoices = createAsyncThunk<
  Invoice[],
  string,
  { rejectValue: string }
>('live/fetchInvoices', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/invoices`)
  if (!res.ok) return rejectWithValue('Failed to fetch invoices')
  return res.json() as Promise<Invoice[]>
})

export const createInvoice = createAsyncThunk<
  Invoice,
  { projectId: string; data: Omit<Invoice, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createInvoice', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to create invoice')
  return res.json() as Promise<Invoice>
})

export const updateInvoice = createAsyncThunk<
  Invoice,
  { projectId: string; invoiceId: string; data: Partial<Invoice> },
  { rejectValue: string }
>('live/updateInvoice', async ({ projectId, invoiceId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to update invoice')
  return res.json() as Promise<Invoice>
})

export const recordReceipt = createAsyncThunk<
  Invoice,
  { projectId: string; invoiceId: string; data: { paidAmount: number; paidDate: string; receiptReference: string; paymentMode: string } },
  { rejectValue: string }
>('live/recordReceipt', async ({ projectId, invoiceId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/invoices/${invoiceId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Paid', ...data }),
  })
  if (!res.ok) return rejectWithValue('Failed to record receipt')
  return res.json() as Promise<Invoice>
})

// ─── Vendor Invoices ──────────────────────────────────────────────────────────

export const fetchVendorInvoices = createAsyncThunk<
  VendorInvoice[],
  string,
  { rejectValue: string }
>('live/fetchVendorInvoices', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/vendor-invoices`)
  if (!res.ok) return rejectWithValue('Failed to fetch vendor invoices')
  return res.json() as Promise<VendorInvoice[]>
})

export const createVendorInvoice = createAsyncThunk<
  VendorInvoice,
  { projectId: string; data: Omit<VendorInvoice, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createVendorInvoice', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/vendor-invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to create vendor invoice')
  return res.json() as Promise<VendorInvoice>
})

export const payVendorInvoice = createAsyncThunk<
  VendorInvoice,
  { projectId: string; id: string; data: { paidAmount: number; paidDate: string; paymentReference: string; paymentMode: string } },
  { rejectValue: string }
>('live/payVendorInvoice', async ({ projectId, id, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/vendor-invoices/${id}/pay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to pay vendor invoice')
  return res.json() as Promise<VendorInvoice>
})

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const fetchExpenses = createAsyncThunk<
  Expense[],
  string,
  { rejectValue: string }
>('live/fetchExpenses', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/expenses`)
  if (!res.ok) return rejectWithValue('Failed to fetch expenses')
  return res.json() as Promise<Expense[]>
})

export const createExpense = createAsyncThunk<
  Expense,
  { projectId: string; data: Omit<Expense, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createExpense', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to create expense')
  return res.json() as Promise<Expense>
})

export const approveExpense = createAsyncThunk<
  Expense,
  { projectId: string; id: string },
  { rejectValue: string }
>('live/approveExpense', async ({ projectId, id }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/expenses/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Approved' }),
  })
  if (!res.ok) return rejectWithValue('Failed to approve expense')
  return res.json() as Promise<Expense>
})

export const rejectExpense = createAsyncThunk<
  Expense,
  { projectId: string; id: string },
  { rejectValue: string }
>('live/rejectExpense', async ({ projectId, id }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/expenses/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Rejected' }),
  })
  if (!res.ok) return rejectWithValue('Failed to reject expense')
  return res.json() as Promise<Expense>
})

// ─── Change Requests ──────────────────────────────────────────────────────────

export const fetchChangeRequests = createAsyncThunk<
  ChangeRequest[],
  string,
  { rejectValue: string }
>('live/fetchChangeRequests', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/change-requests`)
  if (!res.ok) return rejectWithValue('Failed to fetch change requests')
  return res.json() as Promise<ChangeRequest[]>
})

export const createChangeRequest = createAsyncThunk<
  ChangeRequest,
  { projectId: string; data: Omit<ChangeRequest, 'id' | 'projectId'> },
  { rejectValue: string }
>('live/createChangeRequest', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/change-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to create change request')
  return res.json() as Promise<ChangeRequest>
})

export const approveChangeRequest = createAsyncThunk<
  ChangeRequest,
  { projectId: string; id: string; notes: string },
  { rejectValue: string }
>('live/approveChangeRequest', async ({ projectId, id, notes }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/change-requests/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Approved', notes }),
  })
  if (!res.ok) return rejectWithValue('Failed to approve change request')
  return res.json() as Promise<ChangeRequest>
})

export const rejectChangeRequest = createAsyncThunk<
  ChangeRequest,
  { projectId: string; id: string },
  { rejectValue: string }
>('live/rejectChangeRequest', async ({ projectId, id }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/change-requests/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Rejected' }),
  })
  if (!res.ok) return rejectWithValue('Failed to reject change request')
  return res.json() as Promise<ChangeRequest>
})

// ─── Compliance ───────────────────────────────────────────────────────────────

export const fetchComplianceData = createAsyncThunk<
  ComplianceData,
  string,
  { rejectValue: string }
>('live/fetchCompliance', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/compliance`)
  if (!res.ok) return rejectWithValue('Failed to fetch compliance data')
  return res.json() as Promise<ComplianceData>
})

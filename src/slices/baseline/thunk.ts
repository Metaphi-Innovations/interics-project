import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ClientPO, Baseline, VendorPO } from './reducer'

const BASE = '/api/projects'

// ─── Fetch client POs ─────────────────────────────────────────────────────────

export const fetchClientPO = createAsyncThunk<
  ClientPO[],
  string,
  { rejectValue: string }
>('baseline/fetchClientPO', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/po`)
  if (res.status === 404) return []
  if (!res.ok) return rejectWithValue('Failed to fetch client POs')
  return res.json() as Promise<ClientPO[]>
})

// ─── Upload client PO ─────────────────────────────────────────────────────────

export const uploadClientPO = createAsyncThunk<
  ClientPO,
  { projectId: string; data: Omit<ClientPO, 'id' | 'projectId'> },
  { rejectValue: string }
>('baseline/uploadClientPO', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/po`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to upload client PO')
  return res.json() as Promise<ClientPO>
})

// ─── Update client PO ─────────────────────────────────────────────────────────

export const updateClientPO = createAsyncThunk<
  ClientPO,
  { projectId: string; poId: string; data: Partial<ClientPO> },
  { rejectValue: string }
>('baseline/updateClientPO', async ({ projectId, poId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/po/${poId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to update client PO')
  return res.json() as Promise<ClientPO>
})

// ─── Delete client PO ─────────────────────────────────────────────────────────

export const deleteClientPO = createAsyncThunk<
  string,
  { projectId: string; poId: string },
  { rejectValue: string }
>('baseline/deleteClientPO', async ({ projectId, poId }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/po/${poId}`, {
    method: 'DELETE',
  })
  if (!res.ok) return rejectWithValue('Failed to delete client PO')
  return poId
})

// ─── Fetch baseline ───────────────────────────────────────────────────────────

export const fetchBaseline = createAsyncThunk<
  Baseline | null,
  string,
  { rejectValue: string }
>('baseline/fetchBaseline', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/baseline`)
  if (res.status === 404) return null
  if (!res.ok) return rejectWithValue('Failed to fetch baseline')
  return res.json() as Promise<Baseline | null>
})

export const fetchBaselineHistory = createAsyncThunk<
  Baseline[],
  string,
  { rejectValue: string }
>('baseline/fetchBaselineHistory', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/baseline/history`)
  if (res.status === 404) return []
  if (!res.ok) return rejectWithValue('Failed to fetch baseline history')
  return res.json() as Promise<Baseline[]>
})

// ─── Create baseline ──────────────────────────────────────────────────────────

export const createBaseline = createAsyncThunk<
  Baseline,
  { projectId: string; data: Partial<Baseline> },
  { rejectValue: string }
>('baseline/createBaseline', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/baseline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to create baseline')
  return res.json() as Promise<Baseline>
})

// ─── Fetch vendor POs ─────────────────────────────────────────────────────────

export const fetchVendorPOs = createAsyncThunk<
  VendorPO[],
  string,
  { rejectValue: string }
>('baseline/fetchVendorPOs', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/vendor-pos`)
  if (!res.ok) return rejectWithValue('Failed to fetch vendor POs')
  return res.json() as Promise<VendorPO[]>
})

// ─── Create vendor PO ─────────────────────────────────────────────────────────

export const createVendorPO = createAsyncThunk<
  VendorPO,
  { projectId: string; data: Omit<VendorPO, 'id' | 'projectId' | 'milestones'> },
  { rejectValue: string }
>('baseline/createVendorPO', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/vendor-pos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to create vendor PO')
  return res.json() as Promise<VendorPO>
})

// ─── Update vendor PO ─────────────────────────────────────────────────────────

export const updateVendorPO = createAsyncThunk<
  VendorPO,
  { projectId: string; poId: string; data: Partial<VendorPO> },
  { rejectValue: string }
>('baseline/updateVendorPO', async ({ projectId, poId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/vendor-pos/${poId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to update vendor PO')
  return res.json() as Promise<VendorPO>
})

// ─── Update baseline ──────────────────────────────────────────────────────────

export const updateBaseline = createAsyncThunk<
  Baseline,
  { projectId: string; baselineId: string; data: Partial<Baseline> },
  { rejectValue: string }
>('baseline/updateBaseline', async ({ projectId, baselineId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/baseline/${baselineId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to update baseline')
  return res.json() as Promise<Baseline>
})

import { createAsyncThunk } from '@reduxjs/toolkit'
import { baselineReject, baselineService } from '@/modules/projects/baseline.service'
import type { ClientPO, Baseline, VendorPO } from './reducer'

export const fetchClientPO = createAsyncThunk<ClientPO[], string, { rejectValue: string }>(
  'baseline/fetchClientPO',
  async (projectId, { rejectWithValue }) => {
    try {
      return await baselineService.listClientPos(projectId)
    } catch (err) {
      return rejectWithValue(baselineReject(err, 'Failed to fetch client POs'))
    }
  },
)

export const fetchClientPoById = createAsyncThunk<
  ClientPO,
  { projectId: string; poId: string },
  { rejectValue: string }
>('baseline/fetchClientPoById', async ({ projectId, poId }, { rejectWithValue }) => {
  try {
    return await baselineService.getClientPo(projectId, poId)
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to fetch client PO'))
  }
})

export const uploadClientPO = createAsyncThunk<
  ClientPO,
  { projectId: string; data: Omit<ClientPO, 'id' | 'projectId'> },
  { rejectValue: string }
>('baseline/uploadClientPO', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    return await baselineService.createClientPo(projectId, data)
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to upload client PO'))
  }
})

export const updateClientPO = createAsyncThunk<
  ClientPO,
  { projectId: string; poId: string; data: Partial<ClientPO> },
  { rejectValue: string }
>('baseline/updateClientPO', async ({ projectId, poId, data }, { rejectWithValue }) => {
  try {
    return await baselineService.updateClientPo(projectId, poId, data)
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to update client PO'))
  }
})

export const deleteClientPO = createAsyncThunk<
  string,
  { projectId: string; poId: string },
  { rejectValue: string }
>('baseline/deleteClientPO', async ({ projectId, poId }, { rejectWithValue }) => {
  try {
    await baselineService.deleteClientPo(projectId, poId)
    return poId
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to delete client PO'))
  }
})

export const fetchBaseline = createAsyncThunk<Baseline | null, string, { rejectValue: string }>(
  'baseline/fetchBaseline',
  async (projectId, { rejectWithValue }) => {
    try {
      return await baselineService.getBaseline(projectId)
    } catch (err) {
      return rejectWithValue(baselineReject(err, 'Failed to fetch baseline'))
    }
  },
)

export const fetchBaselineHistory = createAsyncThunk<Baseline[], string, { rejectValue: string }>(
  'baseline/fetchBaselineHistory',
  async (projectId, { rejectWithValue }) => {
    try {
      return await baselineService.listBaselineHistory(projectId)
    } catch (err) {
      return rejectWithValue(baselineReject(err, 'Failed to fetch baseline history'))
    }
  },
)

export const createBaseline = createAsyncThunk<
  Baseline,
  { projectId: string; data: Partial<Baseline> },
  { rejectValue: string }
>('baseline/createBaseline', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    return await baselineService.createBaseline(projectId, data)
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to create baseline'))
  }
})

export const fetchVendorPOs = createAsyncThunk<VendorPO[], string, { rejectValue: string }>(
  'baseline/fetchVendorPOs',
  async (projectId, { rejectWithValue }) => {
    try {
      return await baselineService.listVendorPos(projectId)
    } catch (err) {
      return rejectWithValue(baselineReject(err, 'Failed to fetch vendor POs'))
    }
  },
)

export const createVendorPO = createAsyncThunk<
  VendorPO,
  { projectId: string; data: Omit<VendorPO, 'id' | 'projectId'> },
  { rejectValue: string }
>('baseline/createVendorPO', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    return await baselineService.createVendorPo(projectId, data)
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to create vendor PO'))
  }
})

export const updateVendorPO = createAsyncThunk<
  VendorPO,
  { projectId: string; poId: string; data: Partial<VendorPO> },
  { rejectValue: string }
>('baseline/updateVendorPO', async ({ projectId, poId, data }, { rejectWithValue }) => {
  try {
    return await baselineService.updateVendorPo(projectId, poId, data)
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to update vendor PO'))
  }
})

export const deleteVendorPO = createAsyncThunk<
  string,
  { projectId: string; poId: string },
  { rejectValue: string }
>('baseline/deleteVendorPO', async ({ projectId, poId }, { rejectWithValue }) => {
  try {
    await baselineService.deleteVendorPo(projectId, poId)
    return poId
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to delete vendor PO'))
  }
})

export const updateBaseline = createAsyncThunk<
  Baseline,
  { projectId: string; baselineId: string; data: Partial<Baseline> },
  { rejectValue: string }
>('baseline/updateBaseline', async ({ projectId, baselineId, data }, { rejectWithValue }) => {
  try {
    return await baselineService.updateBaseline(projectId, baselineId, data)
  } catch (err) {
    return rejectWithValue(baselineReject(err, 'Failed to update baseline'))
  }
})

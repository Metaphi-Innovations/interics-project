import { createAsyncThunk } from '@reduxjs/toolkit'
import { complianceApi } from '@/api/complianceApi'
import type { FilingItem, GSTReturn, GSTSummary, TDSDeduction, TDSSummary, TDSChallan } from './reducer'
import type { AddChallanBody, MarkReturnFiledBody } from '@/api/complianceApi'

export const fetchFilingItems = createAsyncThunk(
  'compliance/fetchFiling',
  async (
    { period, type }: { period: string; type?: 'all' | 'gst' | 'tds' },
    { rejectWithValue },
  ) => {
    try {
      const t = type === 'all' ? undefined : type
      const res = await complianceApi.getFiling({ period, type: t })
      return res.data.items as FilingItem[]
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch filing items')
    }
  },
)

export const fetchGSTData = createAsyncThunk(
  'compliance/fetchGST',
  async ({ period }: { period: string }, { rejectWithValue }) => {
    try {
      const res = await complianceApi.getGst({ period })
      return {
        summary: res.data.summary as GSTSummary | null,
        returns: res.data.returns as GSTReturn[],
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch GST data')
    }
  },
)

export const fetchTDSData = createAsyncThunk(
  'compliance/fetchTDS',
  async ({ period }: { period: string }, { rejectWithValue }) => {
    try {
      const res = await complianceApi.getTds({ period })
      return {
        summary: res.data.summary as TDSSummary | null,
        deductions: res.data.deductions as TDSDeduction[],
        challans: res.data.challans as TDSChallan[],
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch TDS data')
    }
  },
)

export const markReturnFiled = createAsyncThunk(
  'compliance/markReturnFiled',
  async (
    payload: { returnId: string; filedDate: string; notes?: string },
    { rejectWithValue },
  ) => {
    try {
      const body: MarkReturnFiledBody = {
        filedDate: payload.filedDate,
        notes: payload.notes,
      }
      const res = await complianceApi.markReturnFiled(payload.returnId, body)
      return {
        filingItems: res.data.filingItems,
        gstReturns: res.data.gstReturns,
        gstSummary: res.data.gstSummary,
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to mark return as filed')
    }
  },
)

export const addChallan = createAsyncThunk(
  'compliance/addChallan',
  async (data: AddChallanBody, { rejectWithValue }) => {
    try {
      const res = await complianceApi.addChallan(data)
      return { challans: res.data.challans, summary: res.data.summary }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to add challan')
    }
  },
)

export const mapDeductionToChallan = createAsyncThunk(
  'compliance/mapDeduction',
  async (
    { deductionId, challanId }: { deductionId: string; challanId: string },
    { rejectWithValue },
  ) => {
    try {
      const res = await complianceApi.mapDeductionToChallan(deductionId, { challanId })
      return {
        deductions: res.data.deductions,
        challans: res.data.challans,
        summary: res.data.summary,
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to map deduction')
    }
  },
)

export const deleteChallan = createAsyncThunk(
  'compliance/deleteChallan',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await complianceApi.deleteChallan(id)
      return { challans: res.data.challans, summary: res.data.summary }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to delete challan')
    }
  },
)

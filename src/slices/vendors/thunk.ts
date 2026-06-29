import { createAsyncThunk } from '@reduxjs/toolkit'
import { vendorsApi } from '../../api/vendorsApi'
import { normalizeListResponse } from '@/utils/normalizeListResponse'
import type { Contact } from '../customers/reducer'
import type { Vendor } from './reducer'

interface FetchVendorsParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  gstStatus?: string
  state?: string
}

export const fetchVendors = createAsyncThunk(
  'vendors/fetchAll',
  async (params: FetchVendorsParams = {}, { rejectWithValue }) => {
    try {
      const response = await vendorsApi.getAll(
        params as Record<string, unknown>
      )
      return normalizeListResponse<Vendor>(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch vendors')
    }
  }
)

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await vendorsApi.getById(id)
      return response.data as Vendor
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch vendor')
    }
  }
)

export const createVendor = createAsyncThunk(
  'vendors/create',
  async (data: Omit<Vendor, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const response = await vendorsApi.create(
        data as unknown as Record<string, unknown>
      )
      return response.data as Vendor
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create vendor')
    }
  }
)

export const updateVendor = createAsyncThunk(
  'vendors/update',
  async (
    { id, data }: { id: string; data: Partial<Vendor> },
    { rejectWithValue }
  ) => {
    try {
      const response = await vendorsApi.update(
        id,
        data as Record<string, unknown>
      )
      return response.data as Vendor
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update vendor')
    }
  }
)

export const deleteVendor = createAsyncThunk(
  'vendors/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await vendorsApi.delete(id)
      return id
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to delete vendor')
    }
  }
)

export const createVendorContact = createAsyncThunk(
  'vendors/createContact',
  async (
    {
      vendorId,
      data,
    }: { vendorId: string; data: Omit<Contact, 'id'> },
    { rejectWithValue },
  ) => {
    try {
      const response = await vendorsApi.createContact(vendorId, data)
      return {
        vendorId,
        contact: response.data as Contact,
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        error.response?.data?.message ?? 'Failed to create vendor contact',
      )
    }
  },
)

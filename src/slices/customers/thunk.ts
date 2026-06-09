import { createAsyncThunk } from '@reduxjs/toolkit'
import { customersApi } from '../../api/customersApi'
import { normalizeListResponse } from '@/utils/normalizeListResponse'
import type { Customer } from './reducer'

interface FetchCustomersParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}

export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  async (params: FetchCustomersParams = {}, { rejectWithValue }) => {
    try {
      const response = await customersApi.getAll(
        params as Record<string, unknown>
      )
      return normalizeListResponse<Customer>(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch customers')
    }
  }
)

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await customersApi.getById(id)
      return response.data as Customer
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch customer')
    }
  }
)

export const createCustomer = createAsyncThunk(
  'customers/create',
  async (data: Omit<Customer, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const response = await customersApi.create(
        data as unknown as Record<string, unknown>
      )
      return response.data as Customer
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create customer')
    }
  }
)

export const updateCustomer = createAsyncThunk(
  'customers/update',
  async (
    { id, data }: { id: string; data: Partial<Customer> },
    { rejectWithValue }
  ) => {
    try {
      const response = await customersApi.update(
        id,
        data as Record<string, unknown>
      )
      return response.data as Customer
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update customer')
    }
  }
)

export const deleteCustomer = createAsyncThunk(
  'customers/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await customersApi.delete(id)
      return id
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to delete customer')
    }
  }
)

import { createAsyncThunk } from '@reduxjs/toolkit'
import { usersApi } from '../../api/usersApi'
import { normalizeArrayResponse } from '@/utils/normalizeListResponse'
import type { User } from './reducer'

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await usersApi.getAll(params)
      return normalizeArrayResponse<User>(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch users')
    }
  }
)

export const createUser = createAsyncThunk(
  'users/create',
  async (data: Omit<User, 'id' | 'createdAt' | 'lastLogin'>, { rejectWithValue }) => {
    try {
      const response = await usersApi.create(data as unknown as Record<string, unknown>)
      return response.data as User
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create user')
    }
  }
)

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }: { id: string; data: Partial<User> }, { rejectWithValue }) => {
    try {
      const response = await usersApi.update(id, data as Record<string, unknown>)
      return response.data as User
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update user')
    }
  }
)

export const toggleUserStatus = createAsyncThunk(
  'users/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await usersApi.toggleStatus(id)
      return response.data as User
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to toggle status')
    }
  }
)

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await usersApi.delete(id)
      return id
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to delete user')
    }
  }
)

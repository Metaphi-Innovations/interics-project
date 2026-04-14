import { createAsyncThunk } from '@reduxjs/toolkit'
import { rolesApi } from '../../api/rolesApi'
import type { Role } from '../../types/permissions'

export const fetchRoles = createAsyncThunk(
  'roles/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await rolesApi.getAll()
      return response.data as Role[]
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch roles')
    }
  }
)

export const createRole = createAsyncThunk(
  'roles/create',
  async (data: Omit<Role, 'id' | 'userCount'>, { rejectWithValue }) => {
    try {
      const response = await rolesApi.create(data as unknown as Record<string, unknown>)
      return response.data as Role
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create role')
    }
  }
)

export const updateRole = createAsyncThunk(
  'roles/update',
  async ({ id, data }: { id: string; data: Partial<Role> }, { rejectWithValue }) => {
    try {
      const response = await rolesApi.update(id, data as unknown as Record<string, unknown>)
      return response.data as Role
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update role')
    }
  }
)

export const deleteRole = createAsyncThunk(
  'roles/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await rolesApi.remove(id)
      return id
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to delete role')
    }
  }
)

export const cloneRole = createAsyncThunk(
  'roles/clone',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await rolesApi.clone(id)
      return response.data as Role
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to clone role')
    }
  }
)

import { createAsyncThunk } from '@reduxjs/toolkit'
import { rolesApi } from '../../api/rolesApi'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { normalizeArrayResponse } from '@/utils/normalizeListResponse'
import type { Role } from '../../types/permissions'

type ApiRole = {
  id: string
  name: string
  description?: string | null
  level?: 0 | 1 | 2 | 3
  userCount?: number
  isSystem?: boolean
  status?: string
}

export interface FetchRolesParams {
  page?: number
  limit?: number
  search?: string
  name?: string
  level?: string
  type?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FetchRolesResult {
  items: Role[]
  total: number
}

function normalizeRoleLevel(level: ApiRole['level']): 0 | 1 | 2 | 3 {
  return level === 0 || level === 1 || level === 2 || level === 3 ? level : 2
}

function toUiRole(api: ApiRole): Role {
  const inactive = api.status === 'INACTIVE' || api.status === 'inactive'
  return {
    id: api.id,
    name: api.name,
    level: normalizeRoleLevel(api.level),
    description: api.description ?? undefined,
    userCount: api.userCount ?? 0,
    isSystem: Boolean(api.isSystem),
    status: inactive ? 'inactive' : 'active',
  }
}

export const fetchRoles = createAsyncThunk(
  'roles/fetchAll',
  async (params: FetchRolesParams | void | undefined, { rejectWithValue }) => {
    try {
      const response = await rolesApi.getAll((params ?? { limit: 100 }) as Record<string, unknown>)
      const envelope = response.data as { data?: unknown; meta?: { total?: number } }
      const raw = normalizeArrayResponse<ApiRole>(unwrapApiData(envelope) ?? envelope)
      return {
        items: raw.map(toUiRole),
        total: envelope.meta?.total ?? raw.length,
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch roles')
    }
  },
)

export const toggleRoleStatus = createAsyncThunk(
  'roles/toggleStatus',
  async ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }, { rejectWithValue }) => {
    try {
      const response = await rolesApi.toggleStatus(id, status)
      return toUiRole(unwrapApiData<ApiRole>(response.data))
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to toggle role status')
    }
  },
)

export const createRole = createAsyncThunk(
  'roles/create',
  async (data: Omit<Role, 'id' | 'userCount'>, { rejectWithValue }) => {
    try {
      const response = await rolesApi.create({
        name: data.name,
        level: data.level,
        description: data.description,
        status: data.status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
      })
      return toUiRole(unwrapApiData<ApiRole>(response.data))
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create role')
    }
  },
)

export const updateRole = createAsyncThunk(
  'roles/update',
  async ({ id, data }: { id: string; data: Partial<Role> }, { rejectWithValue }) => {
    try {
      const response = await rolesApi.update(id, data as Record<string, unknown>)
      return toUiRole(unwrapApiData<ApiRole>(response.data))
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update role')
    }
  },
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
  },
)

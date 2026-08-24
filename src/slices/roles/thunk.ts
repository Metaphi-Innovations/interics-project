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
  type?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const SYSTEM_ROLE_LEVEL: Record<string, 0 | 1 | 2 | 3> = {
  SUPER_ADMIN: 0,
  ADMIN: 0,
  MANAGER: 1,
  OPERATIONS: 1,
  SALES: 2,
  ACCOUNTANT: 2,
  VIEWER: 3,
  Admin: 0,
  'Power User': 1,
  'Project User': 2,
  Viewer: 3,
}

function toUiRole(api: ApiRole): Role {
  const inactive = api.status === 'INACTIVE' || api.status === 'inactive'
  return {
    id: api.id,
    name: api.name,
    level: api.level ?? SYSTEM_ROLE_LEVEL[api.name] ?? 2,
    description: api.description ?? undefined,
    userCount: api.userCount ?? 0,
    isSystem: api.isSystem ?? ['SUPER_ADMIN', 'ADMIN'].includes(api.name),
    status: inactive ? 'inactive' : 'active',
  }
}

export const fetchRoles = createAsyncThunk(
  'roles/fetchAll',
  async (params: FetchRolesParams | void | undefined, { rejectWithValue }) => {
    try {
      const response = await rolesApi.getAll((params ?? { limit: 100 }) as Record<string, unknown>)
      const raw = normalizeArrayResponse<ApiRole>(unwrapApiData(response.data) ?? response.data)
      return raw.map(toUiRole)
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

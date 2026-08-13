import { createAsyncThunk } from '@reduxjs/toolkit'
import { usersApi } from '../../api/usersApi'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { normalizeArrayResponse } from '@/utils/normalizeListResponse'
import { makeEmptyUserPermissions } from '@/types/permissions'
import type { User } from './reducer'

type ApiUser = {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string | null
  employeeId?: string
  employeeCode?: string
  role?: string | { id?: string; name?: string } | null
  roleId?: string
  permissions?: User['permissions']
  projectAccess?: User['projectAccess']
  assignedProjects?: string[]
  status?: string
  isActive?: boolean
  lastLogin?: string | null
  lastLoginAt?: string | null
  createdAt?: string
}

function toUiUser(api: ApiUser): User {
  const name =
    api.name?.trim() ||
    `${api.firstName ?? ''} ${api.lastName ?? ''}`.trim() ||
    api.email ||
    'User'
  const roleId =
    typeof api.role === 'object' && api.role
      ? api.role.id ?? ''
      : api.roleId ?? (typeof api.role === 'string' ? api.role : '')

  const inactive =
    api.isActive === false ||
    api.status === 'INACTIVE' ||
    api.status === 'inactive'

  return {
    id: api.id,
    name,
    email: api.email ?? '',
    phone: api.phone ?? undefined,
    employeeId: api.employeeCode ?? api.employeeId,
    role: roleId,
    permissions: api.permissions ?? makeEmptyUserPermissions(),
    projectAccess: api.projectAccess ?? 'all',
    assignedProjects: api.assignedProjects ?? [],
    status: inactive ? 'inactive' : 'active',
    lastLogin: api.lastLoginAt ?? api.lastLogin ?? null,
    createdAt: api.createdAt ?? new Date().toISOString(),
  }
}

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await usersApi.getAll(params)
      const raw = normalizeArrayResponse<ApiUser>(unwrapApiData(response.data) ?? response.data)
      return raw.map(toUiUser)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch users')
    }
  },
)

export const createUser = createAsyncThunk(
  'users/create',
  async (data: Omit<User, 'id' | 'createdAt' | 'lastLogin'>, { rejectWithValue }) => {
    try {
      const response = await usersApi.create(data as unknown as Record<string, unknown>)
      return toUiUser(unwrapApiData<ApiUser>(response.data))
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create user')
    }
  },
)

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }: { id: string; data: Partial<User> }, { rejectWithValue }) => {
    try {
      const response = await usersApi.update(id, data as Record<string, unknown>)
      return toUiUser(unwrapApiData<ApiUser>(response.data))
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update user')
    }
  },
)

export const toggleUserStatus = createAsyncThunk(
  'users/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await usersApi.toggleStatus(id)
      return toUiUser(unwrapApiData<ApiUser>(response.data))
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to toggle status')
    }
  },
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
  },
)

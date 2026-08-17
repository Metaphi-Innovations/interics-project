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

export interface FetchUsersParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  role?: string
  name?: string
  phone?: string
  projectAccess?: string
  lastLogin?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function toUiUser(api: ApiUser): User {
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
  async (params: FetchUsersParams = {}, { rejectWithValue }) => {
    try {
      const response = await usersApi.getAll(params as Record<string, unknown>)
      const envelope = response.data as { data?: unknown; meta?: { total?: number } }
      const raw = normalizeArrayResponse<ApiUser>(unwrapApiData(envelope) ?? envelope)
      return {
        items: raw.map(toUiUser),
        total: envelope.meta?.total ?? raw.length,
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch users')
    }
  },
)

function toApiUserPayload(
  data: Omit<User, 'id' | 'createdAt' | 'lastLogin'> & { password?: string },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    firstName: data.name.trim(),
    email: data.email.trim(),
    roleId: data.role,
    status: data.status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
  }
  if (data.phone?.trim()) payload.phone = data.phone.trim()
  if (data.employeeId?.trim()) payload.employeeCode = data.employeeId.trim()
  if (data.password) payload.password = data.password
  return payload
}

export const createUser = createAsyncThunk(
  'users/create',
  async (
    data: Omit<User, 'id' | 'createdAt' | 'lastLogin'> & { password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await usersApi.create(toApiUserPayload(data))
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
      const payload = toApiUserPayload({
        name: data.name ?? '',
        email: data.email ?? '',
        phone: data.phone,
        employeeId: data.employeeId,
        role: data.role ?? '',
        permissions: data.permissions ?? makeEmptyUserPermissions(),
        projectAccess: data.projectAccess ?? 'all',
        assignedProjects: data.assignedProjects ?? [],
        status: data.status ?? 'active',
      })
      delete payload.password
      const response = await usersApi.update(id, payload)
      return toUiUser(unwrapApiData<ApiUser>(response.data))
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update user')
    }
  },
)

export const toggleUserStatus = createAsyncThunk(
  'users/toggleStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      const response = await usersApi.toggleStatus(id, isActive)
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

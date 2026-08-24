import type { AuthUser } from '@/slices/auth/reducer'
import {
  backendAccessToUserPermissions,
  makeEmptyUserPermissions,
  makeFullUserPermissions,
  type BackendAccessResponse,
  type UserPermissions,
} from '@/types/permissions'

/** Unwrap `{ success, data }` envelopes while accepting flat payloads. */
export function unwrapApiData<T>(payload: unknown): T {
  if (payload != null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if ('success' in record && 'data' in record) {
      return record.data as T
    }
  }
  return payload as T
}

type BackendRole = string | { id?: string; name?: string } | null | undefined

type BackendUser = {
  id?: string
  email?: string
  firstName?: string
  lastName?: string
  name?: string
  avatar?: string | null
  role?: BackendRole
  roleId?: string
  access?: BackendAccessResponse
}

type BackendLoginData = {
  accessToken?: string
  refreshToken?: string
  token?: string
  user?: BackendUser
}

function resolveRole(role: BackendRole, roleId?: string): string {
  if (typeof role === 'string' && role.length > 0) return role
  if (role && typeof role === 'object') {
    if (typeof role.name === 'string' && role.name.length > 0) return role.name
    if (typeof role.id === 'string' && role.id.length > 0) return role.id
  }
  if (typeof roleId === 'string' && roleId.length > 0) return roleId
  return ''
}

function resolvePermissions(role: string, access?: BackendAccessResponse): UserPermissions {
  if (access) return backendAccessToUserPermissions(access)
  return role === 'SUPER_ADMIN' ? makeFullUserPermissions() : makeEmptyUserPermissions()
}

export function mapBackendUserToAuthUser(user: BackendUser | null | undefined): AuthUser {
  const firstName = user?.firstName?.trim() ?? ''
  const lastName = user?.lastName?.trim() ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  const role = resolveRole(user?.role, user?.roleId)

  return {
    id: user?.id ?? '',
    name: user?.name?.trim() || fullName || user?.email || 'User',
    email: user?.email ?? '',
    role,
    avatar: user?.avatar ?? null,
    permissions: resolvePermissions(role, user?.access),
  }
}

export function mapBackendLoginResponse(
  payload: unknown,
): { token: string; refreshToken: string | null; user: AuthUser } {
  const data = unwrapApiData<BackendLoginData>(payload)
  const token = data.accessToken ?? data.token
  if (!token) {
    throw new Error('Login response did not include an access token')
  }
  return {
    token,
    refreshToken: data.refreshToken ?? null,
    user: mapBackendUserToAuthUser(data.user),
  }
}

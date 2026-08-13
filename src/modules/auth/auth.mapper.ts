import type { AuthUser } from '@/slices/auth/reducer'
import { makeFullUserPermissions } from '@/types/permissions'

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
}

type BackendLoginData = {
  accessToken?: string
  token?: string
  user?: BackendUser
}

function resolveRole(role: BackendRole, roleId?: string): string {
  if (typeof role === 'string' && role.length > 0) return role
  if (role && typeof role === 'object') {
    if (typeof role.id === 'string' && role.id.length > 0) return role.id
    if (typeof role.name === 'string' && role.name.length > 0) return role.name
  }
  if (typeof roleId === 'string' && roleId.length > 0) return roleId
  return ''
}

export function mapBackendUserToAuthUser(user: BackendUser | null | undefined): AuthUser {
  const firstName = user?.firstName?.trim() ?? ''
  const lastName = user?.lastName?.trim() ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  return {
    id: user?.id ?? '',
    name: user?.name?.trim() || fullName || user?.email || 'User',
    email: user?.email ?? '',
    role: resolveRole(user?.role, user?.roleId),
    avatar: user?.avatar ?? null,
    // Frontend permission model is not fully wired to backend access yet.
    permissions: makeFullUserPermissions(),
  }
}

export function mapBackendLoginResponse(payload: unknown): { token: string; user: AuthUser } {
  const data = unwrapApiData<BackendLoginData>(payload)
  const token = data.accessToken ?? data.token
  if (!token) {
    throw new Error('Login response did not include an access token')
  }
  return {
    token,
    user: mapBackendUserToAuthUser(data.user),
  }
}

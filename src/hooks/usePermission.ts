import { useAppSelector } from '../store/hooks'
import type { PermissionKey } from '../types/permissions'

const ADMIN_ROLE_ID = 'r-001'

export function usePermission(key: PermissionKey): boolean {
  const user = useAppSelector((s) => s.auth.user)
  const roles = useAppSelector((s) => s.roles.items)

  if (!user) return false
  if (user.role === ADMIN_ROLE_ID) return true

  const role = roles.find((r) => r.id === user.role)
  if (!role) return false

  return role.permissions[key] === true
}

export function useHasAnyPermission(keys: PermissionKey[]): boolean {
  const user = useAppSelector((s) => s.auth.user)
  const roles = useAppSelector((s) => s.roles.items)

  if (!user) return false
  if (user.role === ADMIN_ROLE_ID) return true

  const role = roles.find((r) => r.id === user.role)
  if (!role) return false

  return keys.some((key) => role.permissions[key] === true)
}

export function useIsAdmin(): boolean {
  const user = useAppSelector((s) => s.auth.user)
  return user?.role === ADMIN_ROLE_ID
}

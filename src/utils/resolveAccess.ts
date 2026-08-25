import type { ModuleCrudAction, UserPermissions, UserPermissionModuleKey } from '@/types/permissions'

export interface UserLikeForAccess {
  role: string
  permissions?: UserPermissions
}

/**
 * Resolve boolean access for a module + CRUD action.
 * Only Super Admin bypasses user-level checks; Admin must use assigned permissions.
 */
export function resolveAccess(
  user: UserLikeForAccess,
  module: UserPermissionModuleKey,
  action: ModuleCrudAction,
): boolean {
  if (user.role === 'SUPER_ADMIN') return true
  const mod = user.permissions?.[module]
  if (!mod) return false
  return mod[action] === true
}

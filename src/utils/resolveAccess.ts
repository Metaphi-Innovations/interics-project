import type { ModuleCrudAction, UserPermissions, UserPermissionModuleKey } from '@/types/permissions'

const ADMIN_ROLE_ID = 'r-001'

export interface UserLikeForAccess {
  role: string
  permissions?: UserPermissions
}

/**
 * Resolve boolean access for a module + CRUD action.
 * Admin role (r-001) bypasses all checks.
 */
export function resolveAccess(
  user: UserLikeForAccess,
  module: UserPermissionModuleKey,
  action: ModuleCrudAction,
): boolean {
  if (user.role === ADMIN_ROLE_ID) return true
  const mod = user.permissions?.[module]
  if (!mod) return false
  return mod[action] === true
}

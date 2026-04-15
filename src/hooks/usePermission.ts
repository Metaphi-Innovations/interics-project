import { useAppSelector } from '../store/hooks'
import type { ModuleCrudAction, UserPermissionModuleKey } from '../types/permissions'
import { resolveAccess } from '@/utils/resolveAccess'

const ADMIN_ROLE_ID = 'r-001'

/**
 * Check permission from the logged-in user's user-level permissions (V2).
 * @param module — e.g. `userManagement`, `projects`
 * @param action — `view` | `create` | `edit` | `delete`
 */
export function usePermission(module: UserPermissionModuleKey, action: ModuleCrudAction): boolean {
  const user = useAppSelector((s) => s.auth.user)
  if (!user) return false
  return resolveAccess(user, module, action)
}

export function useIsAdmin(): boolean {
  const user = useAppSelector((s) => s.auth.user)
  return user?.role === ADMIN_ROLE_ID
}

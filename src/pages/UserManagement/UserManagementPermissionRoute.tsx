import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'
import { useHasAnyPermission } from '@/hooks/usePermission'

const KEYS = ['users.view', 'roles.view'] as const

/**
 * Allows User Management when the user can view users or roles (Admin bypass in hook).
 */
export function UserManagementPermissionRoute({ children }: { children: JSX.Element }) {
  const allowed = useHasAnyPermission([...KEYS])
  if (!allowed) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

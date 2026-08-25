import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'

/**
 * Allows User Management when the user can view the User Management module.
 */
export function UserManagementPermissionRoute({ children }: { children: JSX.Element }) {
  const allowed =
    usePermission('userManagement', 'view') ||
    usePermission('userManagementUsers', 'view') ||
    usePermission('userManagementRoles', 'view') ||
    usePermission('userManagementTemplates', 'view')
  if (!allowed) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

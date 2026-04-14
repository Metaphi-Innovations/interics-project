export type PermissionKey =
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'projects.assign'
  | 'projects.approve'
  | 'financial.view'
  | 'financial.create'
  | 'financial.edit'
  | 'financial.delete'
  | 'financial.approve'
  | 'compliance.view'
  | 'compliance.create'
  | 'compliance.approve'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'roles.view'
  | 'roles.create'
  | 'roles.edit'
  | 'roles.delete'
  | 'settings.manage'

export type DataScope = 'all' | 'assigned' | 'own'

export type RolePermissions = Record<PermissionKey, boolean> & {
  projects_dataScope: DataScope
  financial_dataScope: DataScope
  compliance_dataScope: DataScope
}

export interface Role {
  id: string
  name: string
  description?: string
  isSystem: boolean
  userCount: number
  permissions: RolePermissions
}

export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
  'projects.assign', 'projects.approve',
  'financial.view', 'financial.create', 'financial.edit', 'financial.delete',
  'financial.approve',
  'compliance.view', 'compliance.create', 'compliance.approve',
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
  'settings.manage',
]

export function makeFullPermissions(): RolePermissions {
  const base = Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true])) as Record<PermissionKey, boolean>
  return {
    ...base,
    projects_dataScope: 'all',
    financial_dataScope: 'all',
    compliance_dataScope: 'all',
  }
}

export function makeEmptyPermissions(): RolePermissions {
  const base = Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>
  return {
    ...base,
    projects_dataScope: 'assigned',
    financial_dataScope: 'assigned',
    compliance_dataScope: 'assigned',
  }
}

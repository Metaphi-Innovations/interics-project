/** Output of resolveDataAccess — not stored on UserPermissions. */
export type DataScope = 'all' | 'assigned' | 'own'

export type UserPermissionModuleKey =
  | 'projects'
  | 'financial'
  | 'compliance'
  | 'userManagement'
  | 'settings'

export interface ModuleCrudPermissions {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export type ModuleCrudAction = keyof ModuleCrudPermissions

export const MODULE_CRUD_ACTIONS: ModuleCrudAction[] = ['view', 'create', 'edit', 'delete']

export interface UserPermissions {
  projects: ModuleCrudPermissions
  financial: ModuleCrudPermissions
  compliance: ModuleCrudPermissions
  userManagement: ModuleCrudPermissions
  settings: ModuleCrudPermissions
}

/** Simple role — label + level only (V2). */
export interface Role {
  id: string
  name: string
  level: 0 | 1 | 2 | 3
  description?: string
  userCount: number
  isSystem: boolean
}

function emptyModule(): ModuleCrudPermissions {
  return { view: false, create: false, edit: false, delete: false }
}

function fullModule(): ModuleCrudPermissions {
  return { view: true, create: true, edit: true, delete: true }
}

export function makeEmptyUserPermissions(): UserPermissions {
  return {
    projects: emptyModule(),
    financial: emptyModule(),
    compliance: emptyModule(),
    userManagement: emptyModule(),
    settings: emptyModule(),
  }
}

export function makeFullUserPermissions(): UserPermissions {
  return {
    projects: fullModule(),
    financial: fullModule(),
    compliance: fullModule(),
    userManagement: fullModule(),
    settings: fullModule(),
  }
}

/** Sarah / Priya pattern: projects+financial+compliance full; user mgmt view-only; settings off. */
export function makePowerUserStylePermissions(): UserPermissions {
  return {
    projects: fullModule(),
    financial: fullModule(),
    compliance: fullModule(),
    userManagement: { view: true, create: false, edit: false, delete: false },
    settings: emptyModule(),
  }
}

/** Project user: projects create/edit/view; financial view. */
export function makeProjectUserPermissions(): UserPermissions {
  return {
    projects: { view: true, create: true, edit: true, delete: false },
    financial: { view: true, create: false, edit: false, delete: false },
    compliance: emptyModule(),
    userManagement: emptyModule(),
    settings: emptyModule(),
  }
}

/** Viewer: projects view only. */
export function makeViewerUserPermissions(): UserPermissions {
  return {
    projects: { view: true, create: false, edit: false, delete: false },
    financial: emptyModule(),
    compliance: emptyModule(),
    userManagement: emptyModule(),
    settings: emptyModule(),
  }
}

export function cloneUserPermissions(p: UserPermissions): UserPermissions {
  return {
    projects: { ...p.projects },
    financial: { ...p.financial },
    compliance: { ...p.compliance },
    userManagement: { ...p.userManagement },
    settings: { ...p.settings },
  }
}

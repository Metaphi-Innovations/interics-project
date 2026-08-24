/** Output of resolveDataAccess, not stored on UserPermissions. */
export type DataScope = 'all' | 'assigned' | 'own'

export type UserPermissionModuleKey =
  | 'dashboard'
  | 'projects'
  | 'projectOverview'
  | 'projectPitch'
  | 'projectLive'
  | 'projectFinancials'
  | 'projectDocuments'
  | 'projectActivity'
  | 'projectManagement'
  | 'customers'
  | 'vendors'
  | 'team'
  | 'receivables'
  | 'payables'
  | 'expenses'
  | 'compliance'
  | 'userManagement'
  | 'userManagementUsers'
  | 'userManagementRoles'
  | 'userManagementTemplates'
  | 'settings'

export interface ModuleCrudPermissions {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export type ModuleCrudAction = keyof ModuleCrudPermissions

export const MODULE_CRUD_ACTIONS: ModuleCrudAction[] = ['view', 'create', 'edit', 'delete']

export type UserPermissions = Record<UserPermissionModuleKey, ModuleCrudPermissions>

/** Simple role, label + level only. */
export interface Role {
  id: string
  name: string
  level: 0 | 1 | 2 | 3
  description?: string
  userCount: number
  isSystem: boolean
  status: 'active' | 'inactive'
}

export interface PermissionModuleTree {
  modules: Array<{
    id: string
    name: string
    code: string
    subModules: Array<{
      id: string
      name: string
      code: string
    }>
  }>
}

export interface BackendPermissionFlags {
  view?: boolean
  create?: boolean
  update?: boolean
  delete?: boolean
}

export interface BackendModuleAccessInput {
  moduleId: string
  permissions: BackendPermissionFlags
  subModules?: Array<{
    subModuleId: string
    permissions: BackendPermissionFlags
  }>
}

export interface BackendAccessResponse {
  modules?: Array<{
    moduleId?: string
    name?: string
    code: string
    permissions?: BackendPermissionFlags
    subModules?: Array<{
      subModuleId?: string
      name?: string
      code: string
      permissions?: BackendPermissionFlags
    }>
  }>
}

export interface PermissionBinding {
  key: UserPermissionModuleKey
  moduleCode: string
  subModuleCode?: string
}

export const PERMISSION_BINDINGS: PermissionBinding[] = [
  { key: 'dashboard', moduleCode: 'DASHBOARD' },
  { key: 'projects', moduleCode: 'PROJECTS' },
  { key: 'projectOverview', moduleCode: 'PROJECTS', subModuleCode: 'PROJECT_OVERVIEW' },
  { key: 'projectPitch', moduleCode: 'PROJECTS', subModuleCode: 'PROJECT_PITCH' },
  { key: 'projectLive', moduleCode: 'PROJECTS', subModuleCode: 'PROJECT_LIVE' },
  { key: 'projectFinancials', moduleCode: 'PROJECTS', subModuleCode: 'PROJECT_FINANCIALS' },
  { key: 'projectDocuments', moduleCode: 'PROJECTS', subModuleCode: 'PROJECT_DOCUMENTS' },
  { key: 'projectActivity', moduleCode: 'PROJECTS', subModuleCode: 'PROJECT_ACTIVITY' },
  { key: 'projectManagement', moduleCode: 'PROJECTS', subModuleCode: 'PROJECT_MANAGEMENT' },
  { key: 'customers', moduleCode: 'CUSTOMERS' },
  { key: 'vendors', moduleCode: 'PURCHASES', subModuleCode: 'VENDORS' },
  { key: 'team', moduleCode: 'TEAMS' },
  { key: 'receivables', moduleCode: 'FINANCE', subModuleCode: 'RECEIVABLES' },
  { key: 'payables', moduleCode: 'FINANCE', subModuleCode: 'PAYABLES' },
  { key: 'expenses', moduleCode: 'FINANCE', subModuleCode: 'EXPENSES' },
  { key: 'compliance', moduleCode: 'TAX' },
  { key: 'userManagement', moduleCode: 'USERS' },
  { key: 'userManagementUsers', moduleCode: 'USERS', subModuleCode: 'USER_MANAGEMENT' },
  { key: 'userManagementRoles', moduleCode: 'USERS', subModuleCode: 'ROLE_MANAGEMENT' },
  { key: 'userManagementTemplates', moduleCode: 'USERS', subModuleCode: 'TEMPLATES' },
  { key: 'settings', moduleCode: 'SETTINGS' },
]

function emptyModule(): ModuleCrudPermissions {
  return { view: false, create: false, edit: false, delete: false }
}

function fullModule(): ModuleCrudPermissions {
  return { view: true, create: true, edit: true, delete: true }
}

export function makeEmptyUserPermissions(): UserPermissions {
  return Object.fromEntries(
    PERMISSION_BINDINGS.map((binding) => [binding.key, emptyModule()]),
  ) as UserPermissions
}

export function makeFullUserPermissions(): UserPermissions {
  return Object.fromEntries(
    PERMISSION_BINDINGS.map((binding) => [binding.key, fullModule()]),
  ) as UserPermissions
}

/** Sarah / Priya pattern: operations modules full; user management view-only; settings off. */
export function makePowerUserStylePermissions(): UserPermissions {
  const next = makeEmptyUserPermissions()
  for (const key of [
    'dashboard',
    'projects',
    'projectOverview',
    'projectPitch',
    'projectLive',
    'projectFinancials',
    'projectDocuments',
    'projectActivity',
    'projectManagement',
    'customers',
    'vendors',
    'team',
    'receivables',
    'payables',
    'expenses',
    'compliance',
  ] as UserPermissionModuleKey[]) {
    next[key] = fullModule()
  }
  next.userManagement = { view: true, create: false, edit: false, delete: false }
  next.userManagementUsers = { view: true, create: false, edit: false, delete: false }
  return next
}

/** Project user: project list + all project tabs, customers/vendors view, finance view. */
export function makeProjectUserPermissions(): UserPermissions {
  const next = makeEmptyUserPermissions()
  next.dashboard = { view: true, create: false, edit: false, delete: false }
  for (const key of [
    'projects',
    'projectOverview',
    'projectPitch',
    'projectLive',
    'projectFinancials',
    'projectDocuments',
    'projectActivity',
    'projectManagement',
  ] as UserPermissionModuleKey[]) {
    next[key] = { view: true, create: true, edit: true, delete: false }
  }
  next.customers = { view: true, create: false, edit: false, delete: false }
  next.vendors = { view: true, create: false, edit: false, delete: false }
  next.receivables = { view: true, create: false, edit: false, delete: false }
  next.payables = { view: true, create: false, edit: false, delete: false }
  next.expenses = { view: true, create: false, edit: false, delete: false }
  return next
}

/** Viewer: project list and overview only. */
export function makeViewerUserPermissions(): UserPermissions {
  const next = makeEmptyUserPermissions()
  next.dashboard = { view: true, create: false, edit: false, delete: false }
  next.projects = { view: true, create: false, edit: false, delete: false }
  next.projectOverview = { view: true, create: false, edit: false, delete: false }
  return next
}

export function cloneUserPermissions(p?: Partial<UserPermissions> | null): UserPermissions {
  const base = makeEmptyUserPermissions()
  if (!p) return base
  return Object.fromEntries(
    PERMISSION_BINDINGS.map((binding) => [
      binding.key,
      { ...base[binding.key], ...(p[binding.key] ?? {}) },
    ]),
  ) as UserPermissions
}

function fromBackendFlags(flags?: BackendPermissionFlags): ModuleCrudPermissions {
  return {
    view: flags?.view === true,
    create: flags?.create === true,
    edit: flags?.update === true,
    delete: flags?.delete === true,
  }
}

function toBackendFlags(flags: ModuleCrudPermissions): BackendPermissionFlags {
  return {
    view: flags.view,
    create: flags.create,
    update: flags.edit,
    delete: flags.delete,
  }
}

export function backendAccessToUserPermissions(access?: BackendAccessResponse | null): UserPermissions {
  const next = makeEmptyUserPermissions()
  if (!access?.modules) return next

  for (const binding of PERMISSION_BINDINGS) {
    const moduleAccess = access.modules.find((mod) => mod.code === binding.moduleCode)
    if (!moduleAccess) continue
    if (binding.subModuleCode) {
      const subAccess = moduleAccess.subModules?.find((sub) => sub.code === binding.subModuleCode)
      if (subAccess) next[binding.key] = fromBackendFlags(subAccess.permissions)
    } else {
      next[binding.key] = fromBackendFlags(moduleAccess.permissions)
    }
  }

  return next
}

export function accessInputToUserPermissions(
  access: BackendModuleAccessInput[] | undefined | null,
  tree: PermissionModuleTree | undefined | null,
): UserPermissions {
  const next = makeEmptyUserPermissions()
  if (!access || !tree) return next

  for (const binding of PERMISSION_BINDINGS) {
    const moduleRecord = tree.modules.find((mod) => mod.code === binding.moduleCode)
    if (!moduleRecord) continue
    const moduleAccess = access.find((item) => item.moduleId === moduleRecord.id)
    if (!moduleAccess) continue
    if (binding.subModuleCode) {
      const subRecord = moduleRecord.subModules.find((sub) => sub.code === binding.subModuleCode)
      if (!subRecord) continue
      const subAccess = moduleAccess.subModules?.find((item) => item.subModuleId === subRecord.id)
      if (subAccess) next[binding.key] = fromBackendFlags(subAccess.permissions)
    } else {
      next[binding.key] = fromBackendFlags(moduleAccess.permissions)
    }
  }

  return next
}

export function userPermissionsToAccessInput(
  permissions: UserPermissions,
  tree: PermissionModuleTree | undefined | null,
): BackendModuleAccessInput[] {
  if (!tree) return []
  const byModule = new Map<string, BackendModuleAccessInput>()

  for (const binding of PERMISSION_BINDINGS) {
    const moduleRecord = tree.modules.find((mod) => mod.code === binding.moduleCode)
    if (!moduleRecord) continue

    const existing =
      byModule.get(moduleRecord.id) ??
      {
        moduleId: moduleRecord.id,
        permissions: {},
        subModules: [],
      }

    if (binding.subModuleCode) {
      const subRecord = moduleRecord.subModules.find((sub) => sub.code === binding.subModuleCode)
      if (!subRecord) continue
      existing.subModules = [
        ...(existing.subModules ?? []).filter((item) => item.subModuleId !== subRecord.id),
        {
          subModuleId: subRecord.id,
          permissions: toBackendFlags(permissions[binding.key]),
        },
      ]
    } else {
      existing.permissions = toBackendFlags(permissions[binding.key])
    }

    byModule.set(moduleRecord.id, existing)
  }

  return Array.from(byModule.values()).map((item) => ({
    ...item,
    subModules: item.subModules?.length ? item.subModules : undefined,
  }))
}

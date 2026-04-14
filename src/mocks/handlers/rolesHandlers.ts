import { http, HttpResponse } from 'msw'
import type { Role, RolePermissions } from '../../types/permissions'
import { makeFullPermissions, makeEmptyPermissions } from '../../types/permissions'

// ─── Mock Roles ───────────────────────────────────────────────────────────────

const powerUserPerms: RolePermissions = {
  ...makeEmptyPermissions(),
  'projects.view': true, 'projects.create': true, 'projects.edit': true,
  'projects.delete': true, 'projects.assign': true, 'projects.approve': true,
  'financial.view': true, 'financial.create': true, 'financial.edit': true,
  'financial.delete': true, 'financial.approve': true,
  'compliance.view': true, 'compliance.create': true, 'compliance.approve': true,
  'users.view': false, 'users.create': false, 'users.edit': false, 'users.delete': false,
  'roles.view': false, 'roles.create': false, 'roles.edit': false, 'roles.delete': false,
  'settings.manage': false,
  projects_dataScope: 'all',
  financial_dataScope: 'all',
  compliance_dataScope: 'all',
}

const projectUserPerms: RolePermissions = {
  ...makeEmptyPermissions(),
  'projects.view': true, 'projects.create': true, 'projects.edit': true,
  'financial.view': true,
  projects_dataScope: 'assigned',
  financial_dataScope: 'assigned',
  compliance_dataScope: 'assigned',
}

const viewerPerms: RolePermissions = {
  ...makeEmptyPermissions(),
  'projects.view': true,
  'financial.view': true,
  projects_dataScope: 'assigned',
  financial_dataScope: 'assigned',
  compliance_dataScope: 'assigned',
}

let mockRoles: Role[] = [
  {
    id: 'r-001',
    name: 'Admin',
    description: 'Full system access including settings and user management',
    isSystem: true,
    userCount: 1,
    permissions: makeFullPermissions(),
  },
  {
    id: 'r-002',
    name: 'Power User',
    description: 'Full access across all modules and projects',
    isSystem: true,
    userCount: 2,
    permissions: powerUserPerms,
  },
  {
    id: 'r-003',
    name: 'Project User',
    description: 'Access to assigned projects only',
    isSystem: true,
    userCount: 2,
    permissions: projectUserPerms,
  },
  {
    id: 'r-004',
    name: 'Viewer',
    description: 'Read-only access across assigned projects',
    isSystem: true,
    userCount: 1,
    permissions: viewerPerms,
  },
]

let roleIdCounter = 5

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const rolesHandlers = [
  http.get('/api/roles', () => {
    return HttpResponse.json(mockRoles)
  }),

  http.get('/api/roles/:id', ({ params }) => {
    const role = mockRoles.find((r) => r.id === params.id)
    if (!role) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    return HttpResponse.json(role)
  }),

  http.post('/api/roles', async ({ request }) => {
    const data = (await request.json()) as Omit<Role, 'id' | 'userCount'>
    const newRole: Role = {
      ...data,
      id: `r-${String(roleIdCounter++).padStart(3, '0')}`,
      userCount: 0,
      isSystem: false,
    }
    mockRoles.push(newRole)
    return HttpResponse.json(newRole, { status: 201 })
  }),

  http.put('/api/roles/:id', async ({ params, request }) => {
    const idx = mockRoles.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    const data = (await request.json()) as Partial<Role>
    mockRoles[idx] = { ...mockRoles[idx], ...data }
    return HttpResponse.json(mockRoles[idx])
  }),

  http.delete('/api/roles/:id', ({ params }) => {
    const role = mockRoles.find((r) => r.id === params.id)
    if (!role) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    if (role.userCount > 0) {
      return HttpResponse.json(
        { message: 'Cannot delete role with assigned users. Reassign users first.' },
        { status: 400 }
      )
    }
    if (role.isSystem) {
      return HttpResponse.json({ message: 'System roles cannot be deleted' }, { status: 400 })
    }
    mockRoles = mockRoles.filter((r) => r.id !== params.id)
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/roles/:id/clone', ({ params }) => {
    const role = mockRoles.find((r) => r.id === params.id)
    if (!role) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    const cloned: Role = {
      ...role,
      id: `r-${String(roleIdCounter++).padStart(3, '0')}`,
      name: `Copy of ${role.name}`,
      isSystem: false,
      userCount: 0,
    }
    mockRoles.push(cloned)
    return HttpResponse.json(cloned, { status: 201 })
  }),
]

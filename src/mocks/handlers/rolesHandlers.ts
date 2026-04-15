import { http, HttpResponse } from 'msw'
import type { Role } from '../../types/permissions'

let mockRoles: Role[] = [
  {
    id: 'r-001',
    name: 'Admin',
    level: 0,
    description: 'Full system access including settings and user management',
    isSystem: true,
    userCount: 1,
  },
  {
    id: 'r-002',
    name: 'Power User',
    level: 1,
    description: 'Full access across all modules and projects',
    isSystem: true,
    userCount: 2,
  },
  {
    id: 'r-003',
    name: 'Project User',
    level: 2,
    description: 'Access to assigned projects only',
    isSystem: true,
    userCount: 2,
  },
  {
    id: 'r-004',
    name: 'Viewer',
    level: 3,
    description: 'Read-only access across assigned projects',
    isSystem: true,
    userCount: 1,
  },
]

let roleIdCounter = 5

/** Keep role.userCount aligned with the users mock list. */
export function recalculateRoleUserCountsFromUsers(users: { role: string }[]) {
  const counts: Record<string, number> = {}
  for (const u of users) {
    counts[u.role] = (counts[u.role] ?? 0) + 1
  }
  mockRoles = mockRoles.map((r) => ({ ...r, userCount: counts[r.id] ?? 0 }))
}

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
    const data = (await request.json()) as Pick<Role, 'name' | 'level' | 'description'>
    const newRole: Role = {
      id: `r-${String(roleIdCounter++).padStart(3, '0')}`,
      name: data.name,
      level: data.level,
      description: data.description,
      userCount: 0,
      isSystem: false,
    }
    mockRoles.push(newRole)
    return HttpResponse.json(newRole, { status: 201 })
  }),

  http.put('/api/roles/:id', async ({ params, request }) => {
    const idx = mockRoles.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    const data = (await request.json()) as Partial<Pick<Role, 'name' | 'level' | 'description'>>
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
]

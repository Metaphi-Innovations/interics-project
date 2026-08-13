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
    status: 'active',
  },
  {
    id: 'r-002',
    name: 'Power User',
    level: 1,
    description: 'Full access across all modules and projects',
    isSystem: true,
    userCount: 2,
    status: 'active',
  },
  {
    id: 'r-003',
    name: 'Project User',
    level: 2,
    description: 'Access to assigned projects only',
    isSystem: true,
    userCount: 2,
    status: 'active',
  },
  {
    id: 'r-004',
    name: 'Viewer',
    level: 3,
    description: 'Read-only access across assigned projects',
    isSystem: true,
    userCount: 1,
    status: 'active',
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
  http.get('/api/v1/roles', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const name = url.searchParams.get('name')?.toLowerCase() ?? ''
    const type = url.searchParams.get('type') ?? ''
    const status = url.searchParams.get('status')?.toLowerCase() ?? ''

    let filtered = mockRoles

    if (search) {
      filtered = filtered.filter(
        (role) =>
          role.name.toLowerCase().includes(search) ||
          (role.description ?? '').toLowerCase().includes(search),
      )
    }
    if (name) {
      filtered = filtered.filter((role) => role.name.toLowerCase() === name)
    }
    if (type) {
      filtered = filtered.filter((role) => (type === 'SYSTEM' ? role.isSystem : !role.isSystem))
    }
    if (status) {
      filtered = filtered.filter((role) => role.status === status)
    }

    return HttpResponse.json(filtered)
  }),

  http.get('/api/v1/roles/filters', () => {
    const names = Array.from(new Set(mockRoles.map((role) => role.name))).map((value) => ({
      value,
      label: value,
    }))
    return HttpResponse.json({
      name: names,
      type: [
        { value: 'SYSTEM', label: 'System' },
        { value: 'CUSTOM', label: 'Custom' },
      ],
      statuses: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
      level: [],
    })
  }),

  http.get('/api/v1/roles/:id', ({ params }) => {
    const role = mockRoles.find((r) => r.id === params.id)
    if (!role) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    return HttpResponse.json(role)
  }),

  http.post('/api/v1/roles', async ({ request }) => {
    const data = (await request.json()) as Pick<Role, 'name' | 'level' | 'description' | 'status'>
    const newRole: Role = {
      id: `r-${String(roleIdCounter++).padStart(3, '0')}`,
      name: data.name,
      level: data.level,
      description: data.description,
      userCount: 0,
      isSystem: false,
      status: data.status ?? 'active',
    }
    mockRoles.push(newRole)
    return HttpResponse.json(newRole, { status: 201 })
  }),

  http.put('/api/v1/roles/:id', async ({ params, request }) => {
    const idx = mockRoles.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    const data = (await request.json()) as Partial<Pick<Role, 'name' | 'level' | 'description'>>
    mockRoles[idx] = { ...mockRoles[idx], ...data }
    return HttpResponse.json(mockRoles[idx])
  }),

  http.patch('/api/v1/roles/:id/status', async ({ params, request }) => {
    const idx = mockRoles.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as { status?: 'ACTIVE' | 'INACTIVE' }
    if (!body.status) {
      return HttpResponse.json({ message: 'Status is required' }, { status: 400 })
    }
    if (mockRoles[idx].isSystem) {
      return HttpResponse.json({ message: 'System roles cannot be updated' }, { status: 400 })
    }
    if (body.status === 'INACTIVE' && mockRoles[idx].userCount > 0) {
      return HttpResponse.json({ message: 'Cannot deactivate role assigned to active users' }, { status: 400 })
    }

    mockRoles[idx] = {
      ...mockRoles[idx],
      status: body.status === 'ACTIVE' ? 'active' : 'inactive',
    }
    return HttpResponse.json(mockRoles[idx])
  }),

  http.delete('/api/v1/roles/:id', ({ params }) => {
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

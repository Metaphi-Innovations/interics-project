import { http, HttpResponse } from 'msw'
import type { UserPermissions } from '@/types/permissions'
import {
  makeEmptyUserPermissions,
  makeFullUserPermissions,
  makePowerUserStylePermissions,
  makeProjectUserPermissions,
  makeViewerUserPermissions,
} from '@/types/permissions'
import { recalculateRoleUserCountsFromUsers } from './rolesHandlers'
import { demoProjectListOptions } from '@/mocks/data/canonicalEntities'

interface MockUser {
  id: string
  name: string
  email: string
  phone?: string
  employeeId?: string
  role: string
  permissions: UserPermissions
  projectAccess: 'all' | 'selected'
  assignedProjects: string[]
  status: 'active' | 'inactive'
  lastLogin: string | null
  createdAt: string
}

interface MockProject {
  id: string
  name: string
  clientName: string
}

/** Same projects as `/api/v1/projects` — not a parallel infrastructure demo set. */
const mockProjects: MockProject[] = demoProjectListOptions()

let mockUsers: MockUser[] = [
  {
    id: 'u-001',
    name: 'Rajan Mehta',
    email: 'admin@interics.com',
    phone: '+91 98200 00001',
    employeeId: 'EMP-001',
    role: 'r-001',
    permissions: makeFullUserPermissions(),
    projectAccess: 'all',
    assignedProjects: [],
    status: 'active',
    lastLogin: '2026-04-13T09:30:00Z',
    createdAt: '2023-06-01',
  },
  {
    id: 'u-002',
    name: 'Sarah Kapoor',
    email: 'sarah@interics.com',
    phone: '+91 98200 00002',
    employeeId: 'EMP-002',
    role: 'r-002',
    permissions: makePowerUserStylePermissions(),
    projectAccess: 'all',
    assignedProjects: [],
    status: 'active',
    lastLogin: '2026-04-12T08:15:00Z',
    createdAt: '2023-07-15',
  },
  {
    id: 'u-003',
    name: 'Arjun Nair',
    email: 'arjun@interics.com',
    phone: '+91 98200 00003',
    employeeId: 'EMP-003',
    role: 'r-003',
    permissions: makeProjectUserPermissions(),
    projectAccess: 'selected',
    assignedProjects: ['p-001', 'p-002'],
    status: 'active',
    lastLogin: '2026-04-11T17:45:00Z',
    createdAt: '2023-09-01',
  },
  {
    id: 'u-004',
    name: 'Meera Iyer',
    email: 'meera@interics.com',
    phone: '+91 98200 00004',
    employeeId: 'EMP-004',
    role: 'r-003',
    permissions: makeProjectUserPermissions(),
    projectAccess: 'selected',
    assignedProjects: ['p-001'],
    status: 'active',
    lastLogin: '2026-04-10T11:20:00Z',
    createdAt: '2024-01-10',
  },
  {
    id: 'u-005',
    name: 'Vikram Shah',
    email: 'vikram@interics.com',
    phone: '+91 98200 00005',
    employeeId: 'EMP-005',
    role: 'r-004',
    permissions: makeViewerUserPermissions(),
    projectAccess: 'selected',
    assignedProjects: ['p-003'],
    status: 'active',
    lastLogin: null,
    createdAt: '2024-03-20',
  },
  {
    id: 'u-006',
    name: 'Priya Rajan',
    email: 'priya@interics.com',
    phone: '+91 98200 00006',
    employeeId: 'EMP-006',
    role: 'r-002',
    permissions: makePowerUserStylePermissions(),
    projectAccess: 'all',
    assignedProjects: [],
    status: 'inactive',
    lastLogin: null,
    createdAt: '2023-11-05',
  },
]

let idCounter = 7

const ROLE_LABEL_BY_ID: Record<string, string> = {
  'r-001': 'Admin',
  'r-002': 'Power User',
  'r-003': 'Project User',
  'r-004': 'Viewer',
}

function syncRoleCounts() {
  recalculateRoleUserCountsFromUsers(mockUsers)
}

syncRoleCounts()

export const usersHandlers = [
  /** Lightweight options for user form (full `/api/v1/projects` is paginated in projectsHandlers). */
  http.get('/api/v1/projects-list', () => HttpResponse.json(mockProjects)),

  http.get('/api/v1/users/filters', () => {
    const roleIds = Array.from(new Set(mockUsers.map((user) => user.role)))
    const projectAccessCounts = Array.from(
      new Set(
        mockUsers.map((user) =>
          user.projectAccess === 'all' ? mockProjects.length : user.assignedProjects.length,
        ),
      ),
    )
    const lastLoginValues = Array.from(
      new Set(
        mockUsers
          .map((user) => user.lastLogin?.slice(0, 10))
          .filter((value): value is string => Boolean(value)),
      ),
    )

    return HttpResponse.json({
      name: mockUsers.map((user) => ({ value: user.name, label: user.name })),
      phone: mockUsers
        .filter((user) => Boolean(user.phone))
        .map((user) => ({ value: user.phone!, label: user.phone! })),
      projectAccess: projectAccessCounts.map((count) => ({
        value: String(count),
        label: count === mockProjects.length ? 'All Projects' : `${count} Project${count === 1 ? '' : 's'}`,
      })),
      lastLogin: lastLoginValues.map((value) => ({ value, label: value })),
      roles: roleIds.map((roleId) => ({ value: roleId, label: ROLE_LABEL_BY_ID[roleId] ?? roleId })),
      statuses: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    })
  }),

  http.get('/api/v1/users', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const role = url.searchParams.get('role') ?? ''
    const status = url.searchParams.get('status') ?? ''
    const name = url.searchParams.get('name')?.toLowerCase() ?? ''
    const phone = url.searchParams.get('phone')?.toLowerCase() ?? ''
    const projectAccess = url.searchParams.get('projectAccess')
    const lastLogin = url.searchParams.get('lastLogin') ?? ''

    let filtered = mockUsers

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      )
    }
    if (role) {
      filtered = filtered.filter((u) => u.role === role)
    }
    if (status) {
      filtered = filtered.filter((u) => u.status === status)
    }
    if (name) {
      filtered = filtered.filter((u) => u.name.toLowerCase() === name)
    }
    if (phone) {
      filtered = filtered.filter((u) => (u.phone ?? '').toLowerCase() === phone)
    }
    if (projectAccess != null && projectAccess !== '') {
      filtered = filtered.filter((u) => {
        const count = u.projectAccess === 'all' ? mockProjects.length : u.assignedProjects.length
        return String(count) === projectAccess
      })
    }
    if (lastLogin) {
      filtered = filtered.filter((u) => (u.lastLogin ?? '').slice(0, 10) === lastLogin)
    }

    return HttpResponse.json(filtered)
  }),

  http.get('/api/v1/users/:id', ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id)
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    return HttpResponse.json(user)
  }),

  http.post('/api/v1/users', async ({ request }) => {
    const data = (await request.json()) as Omit<MockUser, 'id' | 'createdAt' | 'lastLogin'>
    const newUser: MockUser = {
      ...data,
      permissions: data.permissions ?? makeEmptyUserPermissions(),
      id: `u-${String(idCounter++).padStart(3, '0')}`,
      lastLogin: null,
      createdAt: new Date().toISOString().split('T')[0],
    }
    mockUsers.push(newUser)
    syncRoleCounts()
    return HttpResponse.json(newUser, { status: 201 })
  }),

  http.put('/api/v1/users/:id', async ({ params, request }) => {
    const idx = mockUsers.findIndex((u) => u.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    const data = (await request.json()) as Partial<MockUser>
    mockUsers[idx] = { ...mockUsers[idx], ...data }
    syncRoleCounts()
    return HttpResponse.json(mockUsers[idx])
  }),

  http.patch('/api/v1/users/:id/status', async ({ params, request }) => {
    const idx = mockUsers.findIndex((u) => u.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    const body = (await request.json().catch(() => ({}))) as { isActive?: boolean }
    const nextActive = typeof body.isActive === 'boolean' ? body.isActive : mockUsers[idx].status !== 'active'
    mockUsers[idx] = {
      ...mockUsers[idx],
      status: nextActive ? 'active' : 'inactive',
      lastLogin: nextActive ? new Date().toISOString() : mockUsers[idx].lastLogin,
    }
    return HttpResponse.json(mockUsers[idx])
  }),

  http.delete('/api/v1/users/:id', ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id)
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    if (user.assignedProjects.length > 0) {
      return HttpResponse.json({ message: 'Cannot delete user with assigned projects.' }, { status: 400 })
    }
    mockUsers = mockUsers.filter((u) => u.id !== params.id)
    syncRoleCounts()
    return HttpResponse.json({ success: true })
  }),
]

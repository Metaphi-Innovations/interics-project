import { http, HttpResponse } from 'msw'

interface MockUser {
  id: string
  name: string
  email: string
  phone?: string
  employeeId?: string
  role: string        // role ID reference
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

const mockProjects: MockProject[] = [
  { id: 'p-001', name: 'Metro Rail Phase II', clientName: 'Mumbai Metro Corp' },
  { id: 'p-002', name: 'Airport Terminal Expansion', clientName: 'AAI' },
  { id: 'p-003', name: 'Smart City Infrastructure', clientName: 'Pune Municipal Corp' },
  { id: 'p-004', name: 'Highway Bridge Rehabilitation', clientName: 'NHAI' },
  { id: 'p-005', name: 'Solar Power Plant', clientName: 'NTPC Ltd' },
  { id: 'p-006', name: 'Water Treatment Facility', clientName: 'BWSSB' },
  { id: 'p-007', name: 'Coastal Road Development', clientName: 'BMC' },
  { id: 'p-008', name: 'Industrial Zone Development', clientName: 'MIDC' },
]

let mockUsers: MockUser[] = [
  {
    id: 'u-001',
    name: 'Rajan Mehta',
    email: 'admin@interics.com',
    phone: '+91 98200 00001',
    employeeId: 'EMP-001',
    role: 'r-001',
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
    projectAccess: 'all',
    assignedProjects: [],
    status: 'inactive',
    lastLogin: null,
    createdAt: '2023-11-05',
  },
]

let idCounter = 7

export const usersHandlers = [
  // ─── Projects (for user form dropdown) ──────────────────────────────────────
  http.get('/api/projects-list', () => {
    return HttpResponse.json(mockProjects)
  }),

  // ─── Users ──────────────────────────────────────────────────────────────────
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const role = url.searchParams.get('role') ?? ''
    const status = url.searchParams.get('status') ?? ''

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

    return HttpResponse.json(filtered)
  }),

  http.get('/api/users/:id', ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id)
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    return HttpResponse.json(user)
  }),

  http.post('/api/users', async ({ request }) => {
    const data = (await request.json()) as Omit<MockUser, 'id' | 'createdAt' | 'lastLogin'>
    const newUser: MockUser = {
      ...data,
      id: `u-${String(idCounter++).padStart(3, '0')}`,
      lastLogin: null,
      createdAt: new Date().toISOString().split('T')[0],
    }
    mockUsers.push(newUser)
    return HttpResponse.json(newUser, { status: 201 })
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const idx = mockUsers.findIndex((u) => u.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    const data = (await request.json()) as Partial<MockUser>
    mockUsers[idx] = { ...mockUsers[idx], ...data }
    return HttpResponse.json(mockUsers[idx])
  }),

  http.patch('/api/users/:id/status', ({ params }) => {
    const idx = mockUsers.findIndex((u) => u.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    const wasActive = mockUsers[idx].status === 'active'
    mockUsers[idx] = {
      ...mockUsers[idx],
      status: wasActive ? 'inactive' : 'active',
      lastLogin: wasActive ? mockUsers[idx].lastLogin : new Date().toISOString(),
    }
    return HttpResponse.json(mockUsers[idx])
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id)
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    if (user.assignedProjects.length > 0) {
      return HttpResponse.json(
        { message: 'Cannot delete user with assigned projects. Reassign projects first.' },
        { status: 400 }
      )
    }
    mockUsers = mockUsers.filter((u) => u.id !== params.id)
    return HttpResponse.json({ success: true })
  }),
]

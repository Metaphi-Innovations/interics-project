import { http, HttpResponse } from 'msw'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'admin' | 'power_user' | 'project_user' | 'viewer'
  status: 'active' | 'inactive'
  assignedProjects: string[]
  lastLogin: string | null
  createdAt: string
  avatar?: string
}

let mockUsers: User[] = [
  {
    id: 'u-001',
    name: 'Rahul Sharma',
    email: 'admin@interics.com',
    phone: '+91 98200 00001',
    role: 'admin',
    status: 'active',
    assignedProjects: ['p-001', 'p-002', 'p-003', 'p-004', 'p-005', 'p-006', 'p-007', 'p-008'],
    lastLogin: '2026-04-11T09:30:00Z',
    createdAt: '2023-06-01',
  },
  {
    id: 'u-002',
    name: 'Sarah Johnson',
    email: 'sarah@interics.com',
    phone: '+91 98200 00002',
    role: 'power_user',
    status: 'active',
    assignedProjects: ['p-001', 'p-002', 'p-003', 'p-004'],
    lastLogin: '2026-04-11T08:15:00Z',
    createdAt: '2023-07-15',
  },
  {
    id: 'u-003',
    name: 'Priya Menon',
    email: 'priya@interics.com',
    phone: '+91 98200 00003',
    role: 'power_user',
    status: 'active',
    assignedProjects: ['p-005', 'p-006'],
    lastLogin: '2026-04-10T17:45:00Z',
    createdAt: '2023-09-01',
  },
  {
    id: 'u-004',
    name: 'Arjun Nair',
    email: 'arjun@interics.com',
    phone: '+91 98200 00004',
    role: 'project_user',
    status: 'active',
    assignedProjects: ['p-001', 'p-003'],
    lastLogin: '2026-04-09T11:20:00Z',
    createdAt: '2024-01-10',
  },
  {
    id: 'u-005',
    name: 'Meera Iyer',
    email: 'meera@interics.com',
    phone: '+91 98200 00005',
    role: 'viewer',
    status: 'active',
    assignedProjects: ['p-002'],
    lastLogin: null,
    createdAt: '2024-03-20',
  },
  {
    id: 'u-006',
    name: 'Karan Desai',
    email: 'karan@interics.com',
    phone: '+91 98200 00006',
    role: 'project_user',
    status: 'inactive',
    assignedProjects: [],
    lastLogin: '2025-11-01T10:00:00Z',
    createdAt: '2023-11-05',
  },
]

let idCounter = 7

export const usersHandlers = [
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
    const data = (await request.json()) as Omit<
      User,
      'id' | 'createdAt' | 'lastLogin' | 'assignedProjects'
    >
    const newUser: User = {
      ...data,
      id: `u-${String(idCounter++).padStart(3, '0')}`,
      assignedProjects: [],
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
    const data = (await request.json()) as Partial<User>
    mockUsers[idx] = { ...mockUsers[idx], ...data }
    return HttpResponse.json(mockUsers[idx])
  }),

  http.patch('/api/users/:id/status', ({ params }) => {
    const idx = mockUsers.findIndex((u) => u.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    mockUsers[idx] = {
      ...mockUsers[idx],
      status: mockUsers[idx].status === 'active' ? 'inactive' : 'active',
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
        { message: 'Cannot delete user with assigned projects' },
        { status: 400 }
      )
    }
    mockUsers = mockUsers.filter((u) => u.id !== params.id)
    return HttpResponse.json({ success: true })
  }),
]

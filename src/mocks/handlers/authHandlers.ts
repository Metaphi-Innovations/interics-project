import { http, HttpResponse } from 'msw'
import { makeFullUserPermissions, makePowerUserStylePermissions } from '@/types/permissions'

const adminUser = {
  id: 'u-001',
  name: 'Rajan Mehta',
  email: 'admin@interics.com',
  role: 'r-001',
  avatar: null,
  permissions: makeFullUserPermissions(),
}

const sarahUser = {
  id: 'u-002',
  name: 'Sarah Kapoor',
  email: 'sarah@interics.com',
  role: 'r-002',
  avatar: null,
  permissions: makePowerUserStylePermissions(),
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    if (body.email === 'admin@interics.com' && body.password === 'password') {
      return HttpResponse.json({
        token: 'mock-jwt-token-admin',
        user: adminUser,
      })
    }
    if (body.email === 'sarah@interics.com' && body.password === 'password') {
      return HttpResponse.json({
        token: 'mock-jwt-token-sarah',
        user: sarahUser,
      })
    }
    return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    if (auth.includes('sarah')) {
      return HttpResponse.json(sarahUser)
    }
    return HttpResponse.json(adminUser)
  }),

  http.post('/api/auth/forgot-password', () => {
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/auth/reset-password', () => {
    return HttpResponse.json({ success: true })
  }),
]

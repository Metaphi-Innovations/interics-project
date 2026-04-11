import { http, HttpResponse } from 'msw'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body.email === 'admin@interics.com' && body.password === 'password') {
      return HttpResponse.json({
        token: 'mock-jwt-token-admin',
        user: {
          id: 'u-001',
          name: 'Admin User',
          email: 'admin@interics.com',
          role: 'Admin',
          avatar: null,
        },
      })
    }
    if (body.email === 'sarah@interics.com' && body.password === 'password') {
      return HttpResponse.json({
        token: 'mock-jwt-token-sarah',
        user: {
          id: 'u-002',
          name: 'Sarah Johnson',
          email: 'sarah@interics.com',
          role: 'Power User',
          avatar: null,
        },
      })
    }
    return HttpResponse.json(
      { message: 'Invalid email or password' },
      { status: 401 }
    )
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    return HttpResponse.json({
      id: 'u-001',
      name: 'Admin User',
      email: 'admin@interics.com',
      role: 'Admin',
      avatar: null,
    })
  }),

  http.post('/api/auth/forgot-password', () => {
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/auth/reset-password', () => {
    return HttpResponse.json({ success: true })
  }),
]

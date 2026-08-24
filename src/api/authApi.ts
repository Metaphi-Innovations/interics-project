import client from './client'

export const authApi = {
  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data),
  logout: (refreshToken?: string | null) =>
    client.post('/auth/logout', refreshToken ? { refreshToken } : {}),
  me: () => client.get('/auth/me'),
  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) =>
    client.post('/auth/reset-password', data),
}

import client from './client'

export const authApi = {
  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/auth/me'),
  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) =>
    client.post('/auth/reset-password', data),
}

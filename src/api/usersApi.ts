import client from './client'

export const usersApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get('/users', { params }),
  getById: (id: string) => client.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => client.post('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
    client.put(`/users/${id}`, data),
  toggleStatus: (id: string) => client.patch(`/users/${id}/status`),
  delete: (id: string) => client.delete(`/users/${id}`),
  toggleActive: (id: string) =>
    client.patch(`/users/${id}/toggle-active`),
  getRoles: () => client.get('/roles'),
}

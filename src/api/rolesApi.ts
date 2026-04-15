import client from './client'

export const rolesApi = {
  getAll: () => client.get('/roles'),
  create: (data: Record<string, unknown>) => client.post('/roles', data),
  update: (id: string, data: Record<string, unknown>) => client.put(`/roles/${id}`, data),
  remove: (id: string) => client.delete(`/roles/${id}`),
}

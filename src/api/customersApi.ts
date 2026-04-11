import client from './client'

export const customersApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get('/customers', { params }),
  getById: (id: string) => client.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => client.post('/customers', data),
  update: (id: string, data: Record<string, unknown>) =>
    client.put(`/customers/${id}`, data),
  delete: (id: string) => client.delete(`/customers/${id}`),
}

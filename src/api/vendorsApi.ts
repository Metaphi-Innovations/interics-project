import client from './client'

export const vendorsApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get('/vendors', { params }),
  getById: (id: string) => client.get(`/vendors/${id}`),
  create: (data: Record<string, unknown>) => client.post('/vendors', data),
  update: (id: string, data: Record<string, unknown>) =>
    client.put(`/vendors/${id}`, data),
  delete: (id: string) => client.delete(`/vendors/${id}`),
  createContact: (vendorId: string, data: Record<string, unknown>) =>
    client.post(`/vendors/${vendorId}/contacts`, data),
  updateContact: (
    vendorId: string,
    contactId: string,
    data: Record<string, unknown>,
  ) => client.put(`/vendors/${vendorId}/contacts/${contactId}`, data),
}

import client from './client'

export const projectsApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get('/projects', { params }),
  getById: (id: string) => client.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => client.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) =>
    client.put(`/projects/${id}`, data),
  delete: (id: string) => client.delete(`/projects/${id}`),
  changeStatus: (id: string, status: string) =>
    client.patch(`/projects/${id}/status`, { status }),
}

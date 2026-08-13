import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'

export type SelectFilterOption = {
  value: string
  label: string
}

export interface UsersFiltersResponse {
  name: SelectFilterOption[]
  phone: SelectFilterOption[]
  projectAccess: SelectFilterOption[]
  lastLogin: SelectFilterOption[]
  roles: SelectFilterOption[]
  statuses: SelectFilterOption[]
}

export const usersApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get('/users', { params }),
  async getFilters() {
    const res = await client.get('/users/filters')
    return unwrapApiData<UsersFiltersResponse>(res.data)
  },
  getStats: () => client.get('/users/stats/cards'),
  getById: (id: string) => client.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => client.post('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
    client.put(`/users/${id}`, data),
  toggleStatus: (id: string, isActive: boolean) =>
    client.patch(`/users/${id}/status`, { isActive }),
  delete: (id: string) => client.delete(`/users/${id}`),
  toggleActive: (id: string) =>
    client.patch(`/users/${id}/toggle-active`),
  getRoles: () => client.get('/roles'),
}

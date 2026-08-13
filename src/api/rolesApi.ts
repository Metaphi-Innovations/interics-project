import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type { SelectFilterOption } from './usersApi'

export interface RolesFiltersResponse {
  name: SelectFilterOption[]
  type: SelectFilterOption[]
  statuses: SelectFilterOption[]
  level?: SelectFilterOption[]
}

export const rolesApi = {
  getAll: (params?: Record<string, unknown>) => client.get('/roles', { params }),
  async getFilters() {
    const res = await client.get('/roles/filters')
    return unwrapApiData<RolesFiltersResponse>(res.data)
  },
  create: (data: Record<string, unknown>) => client.post('/roles', data),
  update: (id: string, data: Record<string, unknown>) => client.put(`/roles/${id}`, data),
  toggleStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    client.patch(`/roles/${id}/status`, { status }),
  remove: (id: string) => client.delete(`/roles/${id}`),
}

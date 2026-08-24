import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type { BackendModuleAccessInput } from '@/types/permissions'

export interface PermissionTemplate {
  id: string
  templateName: string
  status: 'active' | 'inactive'
  access: BackendModuleAccessInput[]
  createdAt: string
  updatedAt: string
}

export const permissionTemplatesApi = {
  getAll: (params?: Record<string, unknown>) => client.get('/permission-templates', { params }),
  async getById(id: string) {
    const res = await client.get(`/permission-templates/${id}`)
    return unwrapApiData<PermissionTemplate>(res.data)
  },
  create: (data: { templateName: string; access: BackendModuleAccessInput[] }) =>
    client.post('/permission-templates', data),
  update: (
    id: string,
    data: { templateName?: string; access?: BackendModuleAccessInput[]; isActive?: boolean },
  ) => client.put(`/permission-templates/${id}`, data),
  remove: (id: string) => client.delete(`/permission-templates/${id}`),
}

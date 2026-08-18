import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'

export type ProjectDropdownOption = {
  value: string
  label: string
  projectName: string
  projectCode: string
  customerId: string
  customerName: string
}

export const dropdownsApi = {
  getLiveProjects: async (params?: { search?: string; customerId?: string }) => {
    const res = await client.get('/dropdowns/projects', {
      params: { status: 'LIVE', ...params },
    })
    return unwrapApiData<ProjectDropdownOption[]>(res.data) ?? []
  },
}

import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type { PermissionModuleTree } from '@/types/permissions'

export const modulesApi = {
  async getTree() {
    const res = await client.get('/modules/tree')
    return unwrapApiData<PermissionModuleTree>(res.data)
  },
}

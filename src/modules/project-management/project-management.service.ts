import client from '@/api/client'
import { unwrapApiData, unwrapApiList } from '@/modules/system-settings/shared/api'
import { withInflight } from '@/modules/system-settings/shared/inflight'
import type {
  ProjectManagementCheckpoint,
  ProjectManagementMasterCategory,
} from '@/slices/settings/reducer'

type ApiStatus = 'ACTIVE' | 'INACTIVE'

type ProjectManagementApi = {
  id: string
  category: string
  totalCheckpoints: number
  status: ApiStatus
  checkpoints: Array<{ id: string; name: string }>
}

const BASE = '/project-management'

function toUiStatus(status: ApiStatus): 'active' | 'inactive' {
  return status === 'ACTIVE' ? 'active' : 'inactive'
}

function toApiStatus(status: 'active' | 'inactive'): ApiStatus {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

export function toProjectManagementMaster(
  api: ProjectManagementApi,
): ProjectManagementMasterCategory {
  return {
    id: api.id,
    name: api.category,
    totalCheckpoints: api.totalCheckpoints,
    status: toUiStatus(api.status),
    checkpoints: api.checkpoints.map((cp) => ({
      id: cp.id,
      name: cp.name,
    })),
  }
}

export type ProjectManagementFormInput = {
  name: string
  checkpoints: Array<{ id?: string; name: string }>
  status: 'active' | 'inactive'
}

function toCreatePayload(data: ProjectManagementFormInput) {
  const checkpoints = data.checkpoints.map((cp) => ({
    name: cp.name.trim(),
  }))
  return {
    category: data.name.trim(),
    totalCheckpoints: checkpoints.length,
    status: toApiStatus(data.status),
    checkpoints,
  }
}

export const projectManagementService = {
  async getAll(): Promise<ProjectManagementMasterCategory[]> {
    return withInflight('project-management:list', async () => {
      const res = await client.get(BASE, { params: { limit: 100 } })
      return unwrapApiList<ProjectManagementApi>(res.data).map(toProjectManagementMaster)
    })
  },

  async getById(id: string): Promise<ProjectManagementMasterCategory> {
    const res = await client.get(`${BASE}/${id}`)
    return toProjectManagementMaster(unwrapApiData<ProjectManagementApi>(res.data))
  },

  async create(data: ProjectManagementFormInput): Promise<ProjectManagementMasterCategory> {
    const res = await client.post(BASE, toCreatePayload(data))
    return toProjectManagementMaster(unwrapApiData<ProjectManagementApi>(res.data))
  },

  async update(
    id: string,
    data: ProjectManagementFormInput,
  ): Promise<ProjectManagementMasterCategory> {
    const res = await client.put(`${BASE}/${id}`, toCreatePayload(data))
    return toProjectManagementMaster(unwrapApiData<ProjectManagementApi>(res.data))
  },

  async setStatus(
    id: string,
    status: 'active' | 'inactive',
  ): Promise<ProjectManagementMasterCategory> {
    const res = await client.patch(`${BASE}/${id}/status`, { status: toApiStatus(status) })
    return toProjectManagementMaster(unwrapApiData<ProjectManagementApi>(res.data))
  },

  async remove(id: string): Promise<void> {
    await client.delete(`${BASE}/${id}`)
  },
}

export type { ProjectManagementCheckpoint }

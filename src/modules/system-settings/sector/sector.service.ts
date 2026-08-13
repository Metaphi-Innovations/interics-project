import client from '@/api/client'
import { compactQueryParams, toUiStatus, unwrapApiData, unwrapApiList } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { SectorMaster } from '@/slices/settings/reducer'
import type { ColumnFilterOption } from '@/components/listing'

type SectorApi = {
  id: string
  name: string
  code?: string
  isActive?: boolean
}

const BASE = '/system-settings/sectors'

function toSector(api: SectorApi): SectorMaster {
  return {
    id: api.id,
    name: api.name,
    status: toUiStatus(api.isActive),
  }
}

export type SectorListParams = {
  search?: string
  name?: string
  isActive?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
}

type SectorFilters = {
  name?: ColumnFilterOption[]
  isActive?: ColumnFilterOption[]
}

export const sectorsService = {
  async getAll(params: SectorListParams = {}): Promise<SectorMaster[]> {
    const query = compactQueryParams({
      limit: params.limit ?? 100,
      search: params.search,
      name: params.name,
      isActive: params.isActive,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
    return withInflight(`sectors:list:${JSON.stringify(query)}`, async () => {
      const res = await client.get(BASE, { params: query })
      return unwrapApiList<SectorApi>(res.data).map(toSector)
    })
  },

  async getFilters(): Promise<SectorFilters> {
    const res = await client.get(`${BASE}/filters`)
    return unwrapApiData<SectorFilters>(res.data)
  },

  async create(data: Omit<SectorMaster, 'id'>): Promise<SectorMaster> {
    const res = await client.post(BASE, { name: data.name })
    const created = toSector(unwrapApiData<SectorApi>(res.data))
    if (data.status === 'inactive') {
      return sectorsService.setActive(created.id, false)
    }
    return created
  },

  async update(id: string, data: Omit<SectorMaster, 'id'>): Promise<SectorMaster> {
    const res = await client.put(`${BASE}/${id}`, { name: data.name })
    const updated = toSector(unwrapApiData<SectorApi>(res.data))
    if (data.status && data.status !== updated.status) {
      return sectorsService.setActive(id, data.status === 'active')
    }
    return updated
  },

  async setActive(id: string, isActive: boolean): Promise<SectorMaster> {
    const res = await client.patch(`${BASE}/${id}/status`, { isActive })
    return toSector(unwrapApiData<SectorApi>(res.data))
  },

  async toggle(id: string, nextActive: boolean): Promise<SectorMaster> {
    return sectorsService.setActive(id, nextActive)
  },
}

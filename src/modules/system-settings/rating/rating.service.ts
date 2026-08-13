import client from '@/api/client'
import { compactQueryParams, toUiStatus, unwrapApiData, unwrapApiList } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { RatingMaster } from '@/slices/settings/reducer'
import type { ColumnFilterOption } from '@/components/listing'

type RatingApi = {
  id: string
  name: string
  isActive?: boolean
}

const BASE = '/system-settings/ratings'

function toRating(api: RatingApi): RatingMaster {
  return {
    id: api.id,
    name: api.name,
    status: toUiStatus(api.isActive),
  }
}

export type RatingListParams = {
  search?: string
  name?: string
  isActive?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
}

type RatingFilters = {
  name?: ColumnFilterOption[]
  isActive?: ColumnFilterOption[]
}

export const ratingsService = {
  async getAll(params: RatingListParams = {}): Promise<RatingMaster[]> {
    const query = compactQueryParams({
      limit: params.limit ?? 100,
      search: params.search,
      name: params.name,
      isActive: params.isActive,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
    return withInflight(`ratings:list:${JSON.stringify(query)}`, async () => {
      const res = await client.get(BASE, { params: query })
      return unwrapApiList<RatingApi>(res.data).map(toRating)
    })
  },

  async getFilters(): Promise<RatingFilters> {
    const res = await client.get(`${BASE}/filters`)
    return unwrapApiData<RatingFilters>(res.data)
  },

  async create(data: Omit<RatingMaster, 'id'>): Promise<RatingMaster> {
    const res = await client.post(BASE, { name: data.name })
    const created = toRating(unwrapApiData<RatingApi>(res.data))
    if (data.status === 'inactive') {
      return ratingsService.setActive(created.id, false)
    }
    return created
  },

  async update(id: string, data: Omit<RatingMaster, 'id'>): Promise<RatingMaster> {
    const res = await client.put(`${BASE}/${id}`, { name: data.name })
    const updated = toRating(unwrapApiData<RatingApi>(res.data))
    if (data.status && data.status !== updated.status) {
      return ratingsService.setActive(id, data.status === 'active')
    }
    return updated
  },

  async setActive(id: string, isActive: boolean): Promise<RatingMaster> {
    const res = await client.patch(`${BASE}/${id}/status`, { isActive })
    return toRating(unwrapApiData<RatingApi>(res.data))
  },

  async toggle(id: string, nextActive: boolean): Promise<RatingMaster> {
    return ratingsService.setActive(id, nextActive)
  },
}

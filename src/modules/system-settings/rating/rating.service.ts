import client from '@/api/client'
import { toUiStatus, unwrapApiData, unwrapApiList } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { RatingMaster } from '@/slices/settings/reducer'

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
  limit?: number
}

export const ratingsService = {
  async getAll(params: RatingListParams = {}): Promise<RatingMaster[]> {
    const search = params.search?.trim()
    const key = `ratings:list:${search ?? ''}`
    return withInflight(key, async () => {
      const res = await client.get(BASE, {
        params: {
          limit: params.limit ?? 100,
          ...(search ? { search } : {}),
        },
      })
      return unwrapApiList<RatingApi>(res.data).map(toRating)
    })
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

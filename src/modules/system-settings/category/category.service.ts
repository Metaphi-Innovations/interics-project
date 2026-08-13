import client from '@/api/client'
import { toUiStatus, unwrapApiData, unwrapApiList } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { Category } from '@/slices/settings/reducer'

type CategoryApi = {
  id: string
  name: string
  description: string | null
  servicesCount?: number
  isActive?: boolean
}

const BASE = '/system-settings/categories'

function toCategory(api: CategoryApi): Category {
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? '',
    servicesCount: api.servicesCount ?? 0,
    status: toUiStatus(api.isActive),
  }
}

export const categoriesService = {
  async getAll(): Promise<Category[]> {
    return withInflight('categories:list', async () => {
      const res = await client.get(BASE, { params: { limit: 100 } })
      return unwrapApiList<CategoryApi>(res.data).map(toCategory)
    })
  },

  async create(data: Omit<Category, 'id' | 'servicesCount'>): Promise<Category> {
    const res = await client.post(BASE, {
      name: data.name,
      description: data.description || undefined,
    })
    const created = toCategory(unwrapApiData<CategoryApi>(res.data))
    if (data.status === 'inactive') {
      return categoriesService.setActive(created.id, false)
    }
    return created
  },

  async update(id: string, data: Omit<Category, 'id'>): Promise<Category> {
    const res = await client.put(`${BASE}/${id}`, {
      name: data.name,
      description: data.description || undefined,
    })
    const updated = toCategory(unwrapApiData<CategoryApi>(res.data))
    if (data.status && data.status !== updated.status) {
      return categoriesService.setActive(id, data.status === 'active')
    }
    return { ...updated, servicesCount: data.servicesCount ?? updated.servicesCount }
  },

  async setActive(id: string, isActive: boolean): Promise<Category> {
    const res = await client.patch(`${BASE}/${id}/status`, { isActive })
    return toCategory(unwrapApiData<CategoryApi>(res.data))
  },

  async toggle(id: string, nextActive: boolean): Promise<Category> {
    return categoriesService.setActive(id, nextActive)
  },

  async remove(id: string): Promise<void> {
    await client.delete(`${BASE}/${id}`)
  },
}

import client from '@/api/client'
import { compactQueryParams, toUiStatus, unwrapApiData, unwrapApiList } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { Category } from '@/slices/settings/reducer'
import type { ColumnFilterOption } from '@/components/listing'

type CategoryApi = {
  id: string
  name: string
  description: string | null
  servicesCount?: number
  isActive?: boolean
}

const BASE = '/system-settings/categories'

export type CategoryListParams = {
  page?: number
  limit?: number
  search?: string
  name?: string
  description?: string
  isActive?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

type CategoryFilters = {
  name?: ColumnFilterOption[]
  description?: ColumnFilterOption[]
  isActive?: ColumnFilterOption[]
}

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
  async getAll(params: CategoryListParams = {}): Promise<Category[]> {
    const query = compactQueryParams({
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      search: params.search,
      name: params.name,
      description: params.description,
      isActive: params.isActive,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
    return withInflight(`categories:list:${JSON.stringify(query)}`, async () => {
      const res = await client.get(BASE, { params: query })
      return unwrapApiList<CategoryApi>(res.data).map(toCategory)
    })
  },

  async getFilters(): Promise<CategoryFilters> {
    const res = await client.get(`${BASE}/filters`)
    return unwrapApiData<CategoryFilters>(res.data)
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

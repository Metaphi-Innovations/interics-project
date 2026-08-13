import client from '@/api/client'
import { toUiStatus, unwrapApiData, unwrapApiList } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { Category, SACCode, Service } from '@/slices/settings/reducer'

type ServiceApi = {
  id: string
  name: string
  category?: string
  categoryId?: string
  sacCode: string
  gstRate: number
  isActive?: boolean
}

const BASE = '/system-settings/services'

function toService(
  api: ServiceApi,
  categories: Category[],
  sacCodes: SACCode[],
): Service {
  const categoryId =
    api.categoryId ??
    categories.find((c) => c.name === api.category)?.id ??
    ''
  const sacCodeId = sacCodes.find((s) => s.code === api.sacCode)?.id ?? null

  return {
    id: api.id,
    name: api.name,
    categoryId,
    sacCodeId,
    gstRate: Number(api.gstRate),
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: [],
    status: toUiStatus(api.isActive),
  }
}

function toPayload(data: Omit<Service, 'id'>, sacCodes: SACCode[]) {
  const sacCode =
    sacCodes.find((s) => s.id === data.sacCodeId)?.code ??
    (typeof data.sacCodeId === 'string' ? data.sacCodeId : '')

  return {
    name: data.name,
    categoryId: data.categoryId,
    sacCode,
    gstRate: data.gstRate,
  }
}

export type ServiceListParams = {
  search?: string
  categoryId?: string
  limit?: number
}

export const servicesService = {
  async getAll(
    categories: Category[],
    sacCodes: SACCode[],
    params: ServiceListParams = {},
  ): Promise<Service[]> {
    const search = params.search?.trim()
    const categoryId = params.categoryId?.trim()
    const key = `services:list:${search ?? ''}:${categoryId ?? ''}`
    return withInflight(key, async () => {
      const res = await client.get(BASE, {
        params: {
          limit: params.limit ?? 100,
          ...(search ? { search } : {}),
          ...(categoryId ? { categoryId } : {}),
        },
      })
      return unwrapApiList<ServiceApi>(res.data).map((item) =>
        toService(item, categories, sacCodes),
      )
    })
  },

  async create(
    data: Omit<Service, 'id'>,
    categories: Category[],
    sacCodes: SACCode[],
  ): Promise<Service> {
    const res = await client.post(BASE, toPayload(data, sacCodes))
    return toService(unwrapApiData<ServiceApi>(res.data), categories, sacCodes)
  },

  async update(
    id: string,
    data: Omit<Service, 'id'>,
    categories: Category[],
    sacCodes: SACCode[],
  ): Promise<Service> {
    const res = await client.put(`${BASE}/${id}`, toPayload(data, sacCodes))
    return toService(unwrapApiData<ServiceApi>(res.data), categories, sacCodes)
  },

  async toggle(
    id: string,
    nextActive: boolean,
    categories: Category[],
    sacCodes: SACCode[],
  ): Promise<Service> {
    const res = await client.patch(`${BASE}/${id}/status`, { isActive: nextActive })
    return toService(unwrapApiData<ServiceApi>(res.data), categories, sacCodes)
  },
}

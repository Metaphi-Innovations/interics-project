import client from '@/api/client'
import {
  compactQueryParams,
  toApiStatus,
  toUiStatus,
  unwrapApiData,
  unwrapApiListWithMeta,
  type ListResult,
} from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { GSTRate, TDSSection } from '@/slices/settings/reducer'
import type { ColumnFilterOption } from '@/components/listing'

type GstApi = {
  id: string
  slabName: string
  ratePercent: string | number
  description: string | null
  status?: string
  isActive?: boolean
}

type TdsApi = {
  id: string
  sectionCode: string
  description: string | null
  defaultRatePercent: string | number
  status?: string
  isActive?: boolean
}

const GST_BASE = '/system-settings/tax/gst-slabs'
const TDS_BASE = '/system-settings/tax/tds-sections'

export type GstListParams = {
  page?: number
  limit?: number
  search?: string
  slabName?: string
  ratePercent?: string
  description?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type TdsListParams = {
  page?: number
  limit?: number
  search?: string
  sectionCode?: string
  description?: string
  defaultRatePercent?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

type GstFilters = {
  slabName?: ColumnFilterOption[]
  ratePercent?: ColumnFilterOption[]
  description?: ColumnFilterOption[]
  status?: ColumnFilterOption[]
}

type TdsFilters = {
  sectionCode?: ColumnFilterOption[]
  description?: ColumnFilterOption[]
  defaultRatePercent?: ColumnFilterOption[]
  status?: ColumnFilterOption[]
}

function toGstRate(api: GstApi): GSTRate {
  return {
    id: api.id,
    slabName: api.slabName,
    rate: Number(api.ratePercent),
    description: api.description ?? '',
    status: toUiStatus(api.isActive ?? api.status),
  }
}

function toTdsSection(api: TdsApi): TDSSection {
  return {
    id: api.id,
    section: api.sectionCode,
    description: api.description ?? '',
    defaultRate: Number(api.defaultRatePercent),
    status: toUiStatus(api.isActive ?? api.status),
  }
}

function toGstPayload(data: Omit<GSTRate, 'id'> | Partial<GSTRate>) {
  return {
    ...(data.slabName !== undefined && { slabName: data.slabName }),
    ...(data.rate !== undefined && { ratePercent: data.rate }),
    ...(data.description !== undefined && { description: data.description || undefined }),
    ...(data.status !== undefined && { status: toApiStatus(data.status) }),
  }
}

function toTdsPayload(data: Omit<TDSSection, 'id'> | Partial<TDSSection>) {
  return {
    ...(data.section !== undefined && { sectionCode: data.section }),
    ...(data.description !== undefined && { description: data.description || undefined }),
    ...(data.defaultRate !== undefined && { defaultRatePercent: data.defaultRate }),
    ...(data.status !== undefined && { status: toApiStatus(data.status) }),
  }
}

export const taxConfigurationService = {
  async getGstRates(params: GstListParams = {}): Promise<ListResult<GSTRate>> {
    const query = compactQueryParams({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search,
      slabName: params.slabName,
      ratePercent: params.ratePercent,
      description: params.description,
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
    return withInflight(`tax:gst-slabs:${JSON.stringify(query)}`, async () => {
      const res = await client.get(GST_BASE, { params: query })
      const { items, meta } = unwrapApiListWithMeta<GstApi>(res.data)
      return { items: items.map(toGstRate), meta }
    })
  },

  async getGstFilters(): Promise<GstFilters> {
    const res = await client.get(`${GST_BASE}/filters`)
    return unwrapApiData<GstFilters>(res.data)
  },

  async createGstRate(data: Omit<GSTRate, 'id'>): Promise<GSTRate> {
    const res = await client.post(GST_BASE, toGstPayload(data))
    return toGstRate(unwrapApiData<GstApi>(res.data))
  },

  async updateGstRate(id: string, data: Omit<GSTRate, 'id'>): Promise<GSTRate> {
    const res = await client.put(`${GST_BASE}/${id}`, toGstPayload(data))
    return toGstRate(unwrapApiData<GstApi>(res.data))
  },

  async toggleGstRate(id: string, nextActive: boolean): Promise<GSTRate> {
    const res = await client.patch(`${GST_BASE}/${id}/status`, { isActive: nextActive })
    return toGstRate(unwrapApiData<GstApi>(res.data))
  },

  async getTdsSections(params: TdsListParams = {}): Promise<ListResult<TDSSection>> {
    const query = compactQueryParams({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search,
      sectionCode: params.sectionCode,
      description: params.description,
      defaultRatePercent: params.defaultRatePercent,
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
    return withInflight(`tax:tds-sections:${JSON.stringify(query)}`, async () => {
      const res = await client.get(TDS_BASE, { params: query })
      const { items, meta } = unwrapApiListWithMeta<TdsApi>(res.data)
      return { items: items.map(toTdsSection), meta }
    })
  },

  async getTdsFilters(): Promise<TdsFilters> {
    const res = await client.get(`${TDS_BASE}/filters`)
    return unwrapApiData<TdsFilters>(res.data)
  },

  async createTdsSection(data: Omit<TDSSection, 'id'>): Promise<TDSSection> {
    const res = await client.post(TDS_BASE, toTdsPayload(data))
    return toTdsSection(unwrapApiData<TdsApi>(res.data))
  },

  async updateTdsSection(id: string, data: Omit<TDSSection, 'id'>): Promise<TDSSection> {
    const res = await client.put(`${TDS_BASE}/${id}`, toTdsPayload(data))
    return toTdsSection(unwrapApiData<TdsApi>(res.data))
  },

  async toggleTdsSection(id: string, nextActive: boolean): Promise<TDSSection> {
    const res = await client.patch(`${TDS_BASE}/${id}/status`, { isActive: nextActive })
    return toTdsSection(unwrapApiData<TdsApi>(res.data))
  },
}

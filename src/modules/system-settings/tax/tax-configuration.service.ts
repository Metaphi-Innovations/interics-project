import client from '@/api/client'
import {
  toApiStatus,
  toUiStatus,
  unwrapApiData,
  unwrapApiList,
} from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { GSTRate, TDSSection } from '@/slices/settings/reducer'

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
  appliesTo: string
  status?: string
  isActive?: boolean
}

const GST_BASE = '/system-settings/tax/gst-slabs'
const TDS_BASE = '/system-settings/tax/tds-sections'

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
  const applies = api.appliesTo?.toLowerCase()
  const appliesTo: TDSSection['appliesTo'] =
    applies === 'vendors' || applies === 'clients' || applies === 'both'
      ? applies
      : 'both'

  return {
    id: api.id,
    section: api.sectionCode,
    description: api.description ?? '',
    defaultRate: Number(api.defaultRatePercent),
    appliesTo,
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
    ...(data.appliesTo !== undefined && { appliesTo: data.appliesTo.toUpperCase() }),
    ...(data.status !== undefined && { status: toApiStatus(data.status) }),
  }
}

export const taxConfigurationService = {
  async getGstRates(): Promise<GSTRate[]> {
    return withInflight('tax:gst-slabs', async () => {
      const res = await client.get(GST_BASE, { params: { limit: 100 } })
      return unwrapApiList<GstApi>(res.data).map(toGstRate)
    })
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

  async getTdsSections(): Promise<TDSSection[]> {
    return withInflight('tax:tds-sections', async () => {
      const res = await client.get(TDS_BASE, { params: { limit: 100 } })
      return unwrapApiList<TdsApi>(res.data).map(toTdsSection)
    })
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

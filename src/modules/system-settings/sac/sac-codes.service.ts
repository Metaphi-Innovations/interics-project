import client from '@/api/client'
import { toUiStatus, unwrapApiData, unwrapApiList } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { SACCode } from '@/slices/settings/reducer'

type SacApi = {
  id: string
  sacCode: string
  description: string
  gstSlabId: string
  gstSlab?: { ratePercent?: string | number } | null
  status?: string
}

const BASE = '/system-settings/sac/sac-codes'

function toSacCode(api: SacApi): SACCode {
  const gstRate =
    api.gstSlab?.ratePercent !== undefined && api.gstSlab?.ratePercent !== null
      ? Number(api.gstSlab.ratePercent)
      : undefined

  return {
    id: api.id,
    code: api.sacCode,
    description: api.description ?? '',
    gstRateId: api.gstSlabId,
    ...(gstRate !== undefined && !Number.isNaN(gstRate) ? { gstRate } : {}),
    status: toUiStatus(api.status),
  }
}

function toPayload(data: Omit<SACCode, 'id'> | Partial<SACCode>) {
  return {
    ...(data.code !== undefined && { sacCode: data.code }),
    ...(data.description !== undefined && { description: data.description ?? '' }),
    ...(data.gstRateId !== undefined && { gstSlabId: data.gstRateId }),
    ...(data.status !== undefined && {
      status: data.status === 'active' ? 'ACTIVE' : 'INACTIVE',
    }),
  }
}

export type SacListParams = {
  search?: string
  limit?: number
}

export const sacCodesService = {
  async getAll(params: SacListParams = {}): Promise<SACCode[]> {
    const search = params.search?.trim()
    const key = `sac-codes:list:${search ?? ''}`
    return withInflight(key, async () => {
      const res = await client.get(BASE, {
        params: {
          limit: params.limit ?? 100,
          ...(search ? { search } : {}),
        },
      })
      return unwrapApiList<SacApi>(res.data).map(toSacCode)
    })
  },

  async create(data: Omit<SACCode, 'id'>): Promise<SACCode> {
    const res = await client.post(BASE, toPayload(data))
    return toSacCode(unwrapApiData<SacApi>(res.data))
  },

  async update(id: string, data: Omit<SACCode, 'id'>): Promise<SACCode> {
    const res = await client.put(`${BASE}/${id}`, toPayload(data))
    return toSacCode(unwrapApiData<SacApi>(res.data))
  },

  async toggle(id: string, nextStatus: SACCode['status']): Promise<SACCode> {
    const res = await client.patch(`${BASE}/${id}/status`, {
      status: nextStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
    })
    return toSacCode(unwrapApiData<SacApi>(res.data))
  },
}

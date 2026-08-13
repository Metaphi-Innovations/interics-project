import client from '@/api/client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { parseSettingsApiError } from '@/modules/system-settings/shared/api-errors'
import type { ClientPO, Baseline, VendorPO } from '@/slices/baseline/reducer'

const projectPath = (projectId: string) => `/projects/${projectId}`

export const baselineService = {
  async listClientPos(projectId: string): Promise<ClientPO[]> {
    const res = await client.get(`${projectPath(projectId)}/po`)
    return unwrapApiData<ClientPO[]>(res.data) ?? []
  },

  async getClientPo(projectId: string, poId: string): Promise<ClientPO> {
    const res = await client.get(`${projectPath(projectId)}/po/${poId}`)
    return unwrapApiData<ClientPO>(res.data)
  },

  async createClientPo(
    projectId: string,
    data: Omit<ClientPO, 'id' | 'projectId'>,
  ): Promise<ClientPO> {
    const res = await client.post(`${projectPath(projectId)}/po`, data)
    return unwrapApiData<ClientPO>(res.data)
  },

  async updateClientPo(
    projectId: string,
    poId: string,
    data: Partial<ClientPO>,
  ): Promise<ClientPO> {
    const res = await client.put(`${projectPath(projectId)}/po/${poId}`, data)
    return unwrapApiData<ClientPO>(res.data)
  },

  async deleteClientPo(projectId: string, poId: string): Promise<void> {
    await client.delete(`${projectPath(projectId)}/po/${poId}`)
  },

  async getBaseline(projectId: string): Promise<Baseline | null> {
    const res = await client.get(`${projectPath(projectId)}/baseline`)
    return unwrapApiData<Baseline | null>(res.data)
  },

  async listBaselineHistory(projectId: string): Promise<Baseline[]> {
    const res = await client.get(`${projectPath(projectId)}/baseline/history`)
    return unwrapApiData<Baseline[]>(res.data) ?? []
  },

  async createBaseline(projectId: string, data: Partial<Baseline>): Promise<Baseline> {
    const res = await client.post(`${projectPath(projectId)}/baseline`, data)
    return unwrapApiData<Baseline>(res.data)
  },

  async updateBaseline(
    projectId: string,
    baselineId: string,
    data: Partial<Baseline>,
  ): Promise<Baseline> {
    const res = await client.put(`${projectPath(projectId)}/baseline/${baselineId}`, data)
    return unwrapApiData<Baseline>(res.data)
  },

  async listVendorPos(projectId: string): Promise<VendorPO[]> {
    const res = await client.get(`${projectPath(projectId)}/vendor-pos`)
    return unwrapApiData<VendorPO[]>(res.data) ?? []
  },

  async createVendorPo(
    projectId: string,
    data: Omit<VendorPO, 'id' | 'projectId'>,
  ): Promise<VendorPO> {
    const res = await client.post(`${projectPath(projectId)}/vendor-pos`, data)
    return unwrapApiData<VendorPO>(res.data)
  },

  async updateVendorPo(
    projectId: string,
    poId: string,
    data: Partial<VendorPO>,
  ): Promise<VendorPO> {
    const res = await client.put(`${projectPath(projectId)}/vendor-pos/${poId}`, data)
    return unwrapApiData<VendorPO>(res.data)
  },

  async deleteVendorPo(projectId: string, poId: string): Promise<void> {
    await client.delete(`${projectPath(projectId)}/vendor-pos/${poId}`)
  },
}

export function baselineReject(err: unknown, fallback: string): string {
  return parseSettingsApiError(err, fallback).message
}

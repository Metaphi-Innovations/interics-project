import client from '@/api/client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type {
  PitchVersion,
  PitchCategory,
  PitchService,
  ClientMilestone,
  VendorMapping,
  PlannedExpense,
} from '@/slices/pitch/reducer'

const BASE = '/projects'

export type ClientQuotationApi = {
  id: string
  projectId: string
  displayName: string
  notes: string
  fileName: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  uploadedByUserId: string
  viewUrl: string
  downloadUrl: string
  fileId: string
}

export type PitchUploadedFileApi = {
  id: string
  fileId: string
  projectId: string
  kind: string
  label: string | null
  fileName: string
  sizeBytes: number
  viewUrl: string
  downloadUrl: string
  uploadedAt: string
}

export const pitchService = {
  async listVersions(projectId: string): Promise<PitchVersion[]> {
    const res = await client.get(`${BASE}/${projectId}/pitch/versions`)
    return unwrapApiData<PitchVersion[]>(res.data)
  },

  async getVersion(projectId: string, versionId: string): Promise<PitchVersion> {
    const res = await client.get(`${BASE}/${projectId}/pitch/versions/${versionId}`)
    return unwrapApiData<PitchVersion>(res.data)
  },

  async createVersion(
    projectId: string,
    data: { label: string; copyFromVersionId?: string },
  ): Promise<PitchVersion> {
    const res = await client.post(`${BASE}/${projectId}/pitch/versions`, data)
    return unwrapApiData<PitchVersion>(res.data)
  },

  async updateVersion(
    projectId: string,
    versionId: string,
    data: Partial<PitchVersion>,
  ): Promise<PitchVersion> {
    const res = await client.put(`${BASE}/${projectId}/pitch/versions/${versionId}`, data)
    return unwrapApiData<PitchVersion>(res.data)
  },

  async addCategory(
    projectId: string,
    versionId: string,
    category: Omit<PitchCategory, 'services' | 'totalValue'>,
  ): Promise<PitchVersion> {
    const res = await client.post(
      `${BASE}/${projectId}/pitch/versions/${versionId}/categories`,
      category,
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async deleteCategory(
    projectId: string,
    versionId: string,
    categoryId: string,
  ): Promise<PitchVersion> {
    const res = await client.delete(
      `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}`,
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async addService(
    projectId: string,
    versionId: string,
    categoryId: string,
    service: Partial<PitchService>,
  ): Promise<PitchVersion> {
    const res = await client.post(
      `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}/services`,
      service,
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async updateService(
    projectId: string,
    versionId: string,
    categoryId: string,
    serviceId: string,
    data: Partial<PitchService>,
  ): Promise<PitchVersion> {
    const res = await client.put(
      `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}/services/${serviceId}`,
      data,
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async deleteService(
    projectId: string,
    versionId: string,
    categoryId: string,
    serviceId: string,
  ): Promise<PitchVersion> {
    const res = await client.delete(
      `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}/services/${serviceId}`,
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async updateMilestones(
    projectId: string,
    versionId: string,
    serviceId: string,
    milestones: ClientMilestone[],
  ): Promise<PitchVersion> {
    const res = await client.put(
      `${BASE}/${projectId}/pitch/versions/${versionId}/services/${serviceId}/milestones`,
      { milestones },
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async updateVendorMappings(
    projectId: string,
    versionId: string,
    serviceId: string,
    mappings: VendorMapping[],
  ): Promise<PitchVersion> {
    const res = await client.put(
      `${BASE}/${projectId}/pitch/versions/${versionId}/services/${serviceId}/vendors`,
      { mappings },
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async updatePlannedExpenses(
    projectId: string,
    versionId: string,
    expenses: PlannedExpense[],
  ): Promise<PitchVersion> {
    const res = await client.put(
      `${BASE}/${projectId}/pitch/versions/${versionId}/planned-expenses`,
      { expenses },
    )
    return unwrapApiData<PitchVersion>(res.data)
  },

  async listQuotations(projectId: string): Promise<ClientQuotationApi[]> {
    const res = await client.get(`${BASE}/${projectId}/pitch/quotations`)
    return unwrapApiData<ClientQuotationApi[]>(res.data)
  },

  async uploadQuotation(
    projectId: string,
    input: { file: File; displayName?: string; notes?: string },
  ): Promise<ClientQuotationApi> {
    const form = new FormData()
    form.append('file', input.file)
    if (input.displayName?.trim()) form.append('displayName', input.displayName.trim())
    if (input.notes?.trim()) form.append('notes', input.notes.trim())
    const res = await client.post(`${BASE}/${projectId}/pitch/quotations`, form, {
      headers: { 'Content-Type': undefined },
      timeout: 60_000,
    })
    return unwrapApiData<ClientQuotationApi>(res.data)
  },

  async deleteQuotation(projectId: string, quotationId: string): Promise<void> {
    await client.delete(`${BASE}/${projectId}/pitch/quotations/${quotationId}`)
  },

  async uploadPitchFile(
    projectId: string,
    input: { file: File; kind?: string; label?: string },
  ): Promise<PitchUploadedFileApi> {
    const form = new FormData()
    form.append('file', input.file)
    form.append('kind', input.kind ?? 'vendor_offer')
    if (input.label?.trim()) form.append('label', input.label.trim())
    const res = await client.post(`${BASE}/${projectId}/pitch/files`, form, {
      headers: { 'Content-Type': undefined },
      timeout: 60_000,
    })
    return unwrapApiData<PitchUploadedFileApi>(res.data)
  },
}

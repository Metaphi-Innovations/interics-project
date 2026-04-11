import { createAsyncThunk } from '@reduxjs/toolkit'
import type { PitchVersion, PitchCategory, PitchService, ClientMilestone, VendorMapping } from './reducer'

const BASE = '/api/projects'

// ─── Fetch all versions for a project ────────────────────────────────────────

export const fetchVersions = createAsyncThunk<
  PitchVersion[],
  string,
  { rejectValue: string }
>('pitch/fetchVersions', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/pitch/versions`)
  if (!res.ok) return rejectWithValue('Failed to fetch pitch versions')
  return res.json() as Promise<PitchVersion[]>
})

// ─── Fetch single version ─────────────────────────────────────────────────────

export const fetchVersionById = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string },
  { rejectValue: string }
>('pitch/fetchVersionById', async ({ projectId, versionId }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/pitch/versions/${versionId}`)
  if (!res.ok) return rejectWithValue('Failed to fetch version')
  return res.json() as Promise<PitchVersion>
})

// ─── Create version ───────────────────────────────────────────────────────────

export const createVersion = createAsyncThunk<
  PitchVersion,
  { projectId: string; data: { label: string; copyFromVersionId?: string } },
  { rejectValue: string }
>('pitch/createVersion', async ({ projectId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/pitch/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to create version')
  return res.json() as Promise<PitchVersion>
})

// ─── Update version ───────────────────────────────────────────────────────────

export const updateVersion = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; data: Partial<PitchVersion> },
  { rejectValue: string }
>('pitch/updateVersion', async ({ projectId, versionId, data }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/pitch/versions/${versionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return rejectWithValue('Failed to update version')
  return res.json() as Promise<PitchVersion>
})

// ─── Add category ─────────────────────────────────────────────────────────────

export const addCategory = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; category: Omit<PitchCategory, 'services' | 'totalValue'> },
  { rejectValue: string }
>('pitch/addCategory', async ({ projectId, versionId, category }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/pitch/versions/${versionId}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  })
  if (!res.ok) return rejectWithValue('Failed to add category')
  return res.json() as Promise<PitchVersion>
})

// ─── Add service ──────────────────────────────────────────────────────────────

export const addService = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; categoryId: string; service: Partial<PitchService> },
  { rejectValue: string }
>('pitch/addService', async ({ projectId, versionId, categoryId, service }, { rejectWithValue }) => {
  const res = await fetch(
    `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}/services`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    }
  )
  if (!res.ok) return rejectWithValue('Failed to add service')
  return res.json() as Promise<PitchVersion>
})

// ─── Update service ───────────────────────────────────────────────────────────

export const updateService = createAsyncThunk<
  PitchVersion,
  {
    projectId: string
    versionId: string
    categoryId: string
    serviceId: string
    data: Partial<PitchService>
  },
  { rejectValue: string }
>(
  'pitch/updateService',
  async ({ projectId, versionId, categoryId, serviceId, data }, { rejectWithValue }) => {
    const res = await fetch(
      `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}/services/${serviceId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    )
    if (!res.ok) return rejectWithValue('Failed to update service')
    return res.json() as Promise<PitchVersion>
  }
)

// ─── Delete service ───────────────────────────────────────────────────────────

export const deleteService = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; categoryId: string; serviceId: string },
  { rejectValue: string }
>(
  'pitch/deleteService',
  async ({ projectId, versionId, categoryId, serviceId }, { rejectWithValue }) => {
    const res = await fetch(
      `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}/services/${serviceId}`,
      { method: 'DELETE' }
    )
    if (!res.ok) return rejectWithValue('Failed to delete service')
    return res.json() as Promise<PitchVersion>
  }
)

// ─── Update milestones ────────────────────────────────────────────────────────

export const updateMilestones = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; serviceId: string; milestones: ClientMilestone[] },
  { rejectValue: string }
>(
  'pitch/updateMilestones',
  async ({ projectId, versionId, serviceId, milestones }, { rejectWithValue }) => {
    const res = await fetch(
      `${BASE}/${projectId}/pitch/versions/${versionId}/services/${serviceId}/milestones`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones }),
      }
    )
    if (!res.ok) return rejectWithValue('Failed to update milestones')
    return res.json() as Promise<PitchVersion>
  }
)

// ─── Update vendor mapping ────────────────────────────────────────────────────

export const updateVendorMapping = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; serviceId: string; mappings: VendorMapping[] },
  { rejectValue: string }
>(
  'pitch/updateVendorMapping',
  async ({ projectId, versionId, serviceId, mappings }, { rejectWithValue }) => {
    const res = await fetch(
      `${BASE}/${projectId}/pitch/versions/${versionId}/services/${serviceId}/vendors`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      }
    )
    if (!res.ok) return rejectWithValue('Failed to update vendor mappings')
    return res.json() as Promise<PitchVersion>
  }
)

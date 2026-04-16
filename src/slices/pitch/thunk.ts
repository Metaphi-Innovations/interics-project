import { createAsyncThunk } from '@reduxjs/toolkit'
import type {
  PitchVersion,
  PitchCategory,
  PitchService,
  ClientMilestone,
  VendorMapping,
  PlannedExpense,
} from './reducer'
import { normalizeVendorMapping } from '@/utils/vendorMilestones'

const BASE = '/api/projects'

/** API may still send legacy `splits`; store uses `vendorSplits`. */
type PlannedExpenseIncoming = PlannedExpense & { splits?: PlannedExpense['vendorSplits'] }

function normalizePlannedExpense(raw: PlannedExpenseIncoming): PlannedExpense {
  const vendorSplits = raw.vendorSplits ?? raw.splits
  return {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    amount: raw.amount,
    vendorId: raw.vendorId,
    vendorSplits,
  }
}

/** Ensures new pitch fields exist when reading from the API. */
function normalizePitchVersion(v: PitchVersion & { plannedExpenses?: PlannedExpenseIncoming[] }): PitchVersion {
  return {
    ...v,
    plannedExpenses: (v.plannedExpenses ?? []).map((e) => normalizePlannedExpense(e as PlannedExpenseIncoming)),
    categories: v.categories.map((cat) => ({
      ...cat,
      services: cat.services.map((s) => ({
        ...s,
        vendorMappings: s.vendorMappings.map((vm) => normalizeVendorMapping(vm)),
      })),
    })),
  }
}

// ─── Fetch all versions for a project ────────────────────────────────────────

export const fetchVersions = createAsyncThunk<
  PitchVersion[],
  string,
  { rejectValue: string }
>('pitch/fetchVersions', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/pitch/versions`)
  if (!res.ok) return rejectWithValue('Failed to fetch pitch versions')
  const data = (await res.json()) as PitchVersion[]
  return data.map(normalizePitchVersion)
})

// ─── Fetch single version ─────────────────────────────────────────────────────

export const fetchVersionById = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string },
  { rejectValue: string }
>('pitch/fetchVersionById', async ({ projectId, versionId }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/pitch/versions/${versionId}`)
  if (!res.ok) return rejectWithValue('Failed to fetch version')
  const data = (await res.json()) as PitchVersion
  return normalizePitchVersion(data)
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
  const created = (await res.json()) as PitchVersion
  return normalizePitchVersion(created)
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
  const updated = (await res.json()) as PitchVersion
  return normalizePitchVersion(updated)
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
  const data = (await res.json()) as PitchVersion
  return normalizePitchVersion(data)
})

// ─── Delete category ───────────────────────────────────────────────────────────

export const deleteCategory = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; categoryId: string },
  { rejectValue: string }
>('pitch/deleteCategory', async ({ projectId, versionId, categoryId }, { rejectWithValue }) => {
  const res = await fetch(
    `${BASE}/${projectId}/pitch/versions/${versionId}/categories/${categoryId}`,
    { method: 'DELETE' }
  )
  if (!res.ok) return rejectWithValue('Failed to delete category')
  const data = (await res.json()) as PitchVersion
  return normalizePitchVersion(data)
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
  const data = (await res.json()) as PitchVersion
  return normalizePitchVersion(data)
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
    const updatedVersion = (await res.json()) as PitchVersion
    return normalizePitchVersion(updatedVersion)
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
    const data = (await res.json()) as PitchVersion
    return normalizePitchVersion(data)
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
    const data = (await res.json()) as PitchVersion
    return normalizePitchVersion(data)
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
    const data = (await res.json()) as PitchVersion
    return normalizePitchVersion(data)
  }
)

// ─── Update planned expenses (version-level) ────────────────────────────────

export const updatePlannedExpenses = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; expenses: PlannedExpense[] },
  { rejectValue: string }
>(
  'pitch/updatePlannedExpenses',
  async ({ projectId, versionId, expenses }, { rejectWithValue }) => {
    const res = await fetch(
      `${BASE}/${projectId}/pitch/versions/${versionId}/planned-expenses`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses }),
      }
    )
    if (!res.ok) return rejectWithValue('Failed to update planned expenses')
    const data = (await res.json()) as PitchVersion
    return normalizePitchVersion(data)
  }
)

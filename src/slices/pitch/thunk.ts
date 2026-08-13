import { createAsyncThunk } from '@reduxjs/toolkit'
import { pitchService } from '@/modules/projects/pitch.service'
import { parseSettingsApiError } from '@/modules/system-settings/shared/api-errors'
import type {
  PitchVersion,
  PitchCategory,
  PitchService,
  ClientMilestone,
  VendorMapping,
  PlannedExpense,
} from './reducer'
import { normalizeVendorMapping } from '@/utils/vendorMilestones'

/** API may still send legacy `splits`; store uses `vendorSplits`. */
type PlannedExpenseIncoming = PlannedExpense & { splits?: PlannedExpense['vendorSplits'] }

function normalizePlannedExpense(raw: PlannedExpenseIncoming): PlannedExpense {
  const vendorSplits = raw.vendorSplits ?? raw.splits
  const { splits: _legacySplits, ...rest } = raw
  return {
    ...rest,
    vendorSplits,
  }
}

/** Ensures new pitch fields exist when reading from the API. */
function normalizePitchVersion(v: PitchVersion & { plannedExpenses?: PlannedExpenseIncoming[] }): PitchVersion {
  return {
    ...v,
    plannedExpenses: (v.plannedExpenses ?? []).map((e) => normalizePlannedExpense(e as PlannedExpenseIncoming)),
    categories: (v.categories ?? []).map((cat) => ({
      ...cat,
      services: (cat.services ?? []).map((s) => ({
        ...s,
        vendorMappings: (s.vendorMappings ?? []).map((vm) => normalizeVendorMapping(vm)),
      })),
    })),
  }
}

function rejectPitch(err: unknown, fallback: string): string {
  return parseSettingsApiError(err, fallback).message
}

// ─── Fetch all versions for a project ────────────────────────────────────────

export const fetchVersions = createAsyncThunk<
  PitchVersion[],
  string,
  { rejectValue: string }
>('pitch/fetchVersions', async (projectId, { rejectWithValue }) => {
  try {
    const data = await pitchService.listVersions(projectId)
    return data.map(normalizePitchVersion)
  } catch (err) {
    return rejectWithValue(rejectPitch(err, 'Failed to fetch pitch versions'))
  }
})

// ─── Fetch single version ─────────────────────────────────────────────────────

export const fetchVersionById = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string },
  { rejectValue: string }
>('pitch/fetchVersionById', async ({ projectId, versionId }, { rejectWithValue }) => {
  try {
    const data = await pitchService.getVersion(projectId, versionId)
    return normalizePitchVersion(data)
  } catch (err) {
    return rejectWithValue(rejectPitch(err, 'Failed to fetch version'))
  }
})

// ─── Create version ───────────────────────────────────────────────────────────

export const createVersion = createAsyncThunk<
  PitchVersion,
  { projectId: string; data: { label: string; copyFromVersionId?: string } },
  { rejectValue: string }
>('pitch/createVersion', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const created = await pitchService.createVersion(projectId, data)
    return normalizePitchVersion(created)
  } catch (err) {
    return rejectWithValue(rejectPitch(err, 'Failed to create version'))
  }
})

// ─── Update version ───────────────────────────────────────────────────────────

export const updateVersion = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; data: Partial<PitchVersion> },
  { rejectValue: string }
>('pitch/updateVersion', async ({ projectId, versionId, data }, { rejectWithValue }) => {
  try {
    const updated = await pitchService.updateVersion(projectId, versionId, data)
    return normalizePitchVersion(updated)
  } catch (err) {
    return rejectWithValue(rejectPitch(err, 'Failed to update version'))
  }
})

// ─── Add category ─────────────────────────────────────────────────────────────

export const addCategory = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; category: Omit<PitchCategory, 'services' | 'totalValue'> },
  { rejectValue: string }
>('pitch/addCategory', async ({ projectId, versionId, category }, { rejectWithValue }) => {
  try {
    const data = await pitchService.addCategory(projectId, versionId, category)
    return normalizePitchVersion(data)
  } catch (err) {
    return rejectWithValue(rejectPitch(err, 'Failed to add category'))
  }
})

// ─── Delete category ───────────────────────────────────────────────────────────

export const deleteCategory = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; categoryId: string },
  { rejectValue: string }
>('pitch/deleteCategory', async ({ projectId, versionId, categoryId }, { rejectWithValue }) => {
  try {
    const data = await pitchService.deleteCategory(projectId, versionId, categoryId)
    return normalizePitchVersion(data)
  } catch (err) {
    return rejectWithValue(rejectPitch(err, 'Failed to delete category'))
  }
})

// ─── Add service ──────────────────────────────────────────────────────────────

export const addService = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; categoryId: string; service: Partial<PitchService> },
  { rejectValue: string }
>('pitch/addService', async ({ projectId, versionId, categoryId, service }, { rejectWithValue }) => {
  try {
    const data = await pitchService.addService(projectId, versionId, categoryId, service)
    return normalizePitchVersion(data)
  } catch (err) {
    return rejectWithValue(rejectPitch(err, 'Failed to add service'))
  }
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
    try {
      const updatedVersion = await pitchService.updateService(
        projectId,
        versionId,
        categoryId,
        serviceId,
        data,
      )
      return normalizePitchVersion(updatedVersion)
    } catch (err) {
      return rejectWithValue(rejectPitch(err, 'Failed to update service'))
    }
  },
)

// ─── Delete service ───────────────────────────────────────────────────────────

export const deleteService = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; categoryId: string; serviceId: string },
  { rejectValue: string }
>(
  'pitch/deleteService',
  async ({ projectId, versionId, categoryId, serviceId }, { rejectWithValue }) => {
    try {
      const data = await pitchService.deleteService(projectId, versionId, categoryId, serviceId)
      return normalizePitchVersion(data)
    } catch (err) {
      return rejectWithValue(rejectPitch(err, 'Failed to delete service'))
    }
  },
)

// ─── Update milestones ────────────────────────────────────────────────────────

export const updateMilestones = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; serviceId: string; milestones: ClientMilestone[] },
  { rejectValue: string }
>(
  'pitch/updateMilestones',
  async ({ projectId, versionId, serviceId, milestones }, { rejectWithValue }) => {
    try {
      const data = await pitchService.updateMilestones(projectId, versionId, serviceId, milestones)
      return normalizePitchVersion(data)
    } catch (err) {
      return rejectWithValue(rejectPitch(err, 'Failed to update milestones'))
    }
  },
)

// ─── Update vendor mapping ────────────────────────────────────────────────────

export const updateVendorMapping = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; serviceId: string; mappings: VendorMapping[] },
  { rejectValue: string }
>(
  'pitch/updateVendorMapping',
  async ({ projectId, versionId, serviceId, mappings }, { rejectWithValue }) => {
    try {
      const data = await pitchService.updateVendorMappings(
        projectId,
        versionId,
        serviceId,
        mappings,
      )
      return normalizePitchVersion(data)
    } catch (err) {
      return rejectWithValue(rejectPitch(err, 'Failed to update vendor mappings'))
    }
  },
)

// ─── Update planned expenses (version-level) ────────────────────────────────

export const updatePlannedExpenses = createAsyncThunk<
  PitchVersion,
  { projectId: string; versionId: string; expenses: PlannedExpense[] },
  { rejectValue: string }
>(
  'pitch/updatePlannedExpenses',
  async ({ projectId, versionId, expenses }, { rejectWithValue }) => {
    try {
      const data = await pitchService.updatePlannedExpenses(projectId, versionId, expenses)
      return normalizePitchVersion(data)
    } catch (err) {
      return rejectWithValue(rejectPitch(err, 'Failed to update planned expenses'))
    }
  },
)

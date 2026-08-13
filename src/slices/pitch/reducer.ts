import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { CommonExpenseSplitMethod } from '@/slices/live/types'
import {
  fetchVersions,
  fetchVersionById,
  createVersion,
  updateVersion,
  addCategory,
  deleteCategory,
  addService,
  updateService,
  deleteService,
  updateMilestones,
  updateVendorMapping,
  updatePlannedExpenses,
} from './thunk'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientMilestone {
  id: string
  name: string
  percentage: number
  value: number
}

export interface VendorMilestone {
  id: string
  name: string
  percentage: number
  value: number
}

/** Retention is stored separately from regular vendor milestones. */
export interface VendorRetention {
  percentage: number
  amount: number
}

/** Vendor quotation document (PO Transition); stored per service–vendor mapping. */
export interface VendorQuotation {
  fileId?: string
  fileName: string
  fileUrl: string
  uploadedAt: string
}

export interface VendorMapping {
  id: string
  vendorId: string
  vendorName: string
  value: number
  /** Latest agreed execution amount (may differ from contractual offer / PO value). */
  executedValue?: number | null
  percentage: number
  milestones: VendorMilestone[]
  /** Optional retention slice (single); not part of `milestones`. */
  retention?: VendorRetention
  isMeasurable: boolean
  quotation?: VendorQuotation
  gstRate?: number
  /** GST amount borne by Interics (pitch / billing display). */
  gstByUs?: number
  /** GST amount borne by the client (pitch / billing display). */
  gstByClient?: number
  /** Free-text notes, remarks, tags, or references for this vendor offer. */
  notes?: string
}

export interface PlannedExpenseSplit {
  vendorId: string
  percentage: number
  amount: number
  /**
   * When false, this vendor's share is not recovered via payable deduction.
   * Defaults to true when omitted.
   */
  includedInRecovery?: boolean
}

export interface PlannedExpense {
  id: string
  type: 'additional' | 'vendor' | 'common' | 'office_expenses' | 'reimbursable_expenses'
  name: string
  amount: number
  vendorId?: string
  vendorSplits?: PlannedExpenseSplit[]
  /** Present when type is vendor — from pitch version service / mapping */
  serviceId?: string
  serviceName?: string
  milestoneId?: string
  milestoneName?: string
  date?: string
  documentUrl?: string
  /** How a common expense is split across build vendors. */
  splitMethod?: CommonExpenseSplitMethod
  /** Vendor who initially paid a common expense out of pocket. */
  paidByVendorId?: string
  paidByVendorName?: string
}

export interface PitchService {
  id: string
  name: string
  subcategoryId: string | null
  subcategoryName: string | null
  customName: string | null
  value: number
  sacCode?: string
  gstRate?: number
  /** GST amount borne by Interics (pitch / billing display). */
  gstByUs?: number
  /** GST amount borne by the client (pitch / billing display). */
  gstByClient?: number
  clientMilestones: ClientMilestone[]
  vendorMappings: VendorMapping[]
  milestonesTotal: number
}

export interface PitchCategory {
  id: string
  categoryId: string
  categoryName: string
  services: PitchService[]
  totalValue: number
}

export interface PitchVersion {
  id: string
  projectId: string
  versionNumber: number
  label: string
  isActive: boolean
  createdAt: string
  categories: PitchCategory[]
  plannedExpenses: PlannedExpense[]
  totalRevenue: number
  totalCost: number
  profitability: number
}

// ─── State ────────────────────────────────────────────────────────────────────

interface PitchState {
  versions: PitchVersion[]
  activeVersionId: string | null
  activeVersion: PitchVersion | null
  loading: boolean
  saving: boolean
  error: string | null
}

const initialState: PitchState = {
  versions: [],
  activeVersionId: null,
  activeVersion: null,
  loading: false,
  saving: false,
  error: null,
}

function pitchVersionContentScore(v: PitchVersion): number {
  const categories = v.categories ?? []
  const services = categories.reduce((n, c) => n + (c.services?.length ?? 0), 0)
  const vendors = categories.reduce(
    (n, c) => n + (c.services ?? []).reduce((vs, s) => vs + (s.vendorMappings?.length ?? 0), 0),
    0,
  )
  const expenses = v.plannedExpenses?.length ?? 0
  return categories.length * 1000 + services * 100 + vendors * 10 + expenses
}

/** Prefer active version; if it is empty and another has pitch data, use the richest. */
function pickPreferredPitchVersion(versions: PitchVersion[]): PitchVersion | null {
  if (versions.length === 0) return null
  const active = versions.find((v) => v.isActive) ?? null
  const ranked = [...versions].sort(
    (a, b) =>
      pitchVersionContentScore(b) - pitchVersionContentScore(a) ||
      b.versionNumber - a.versionNumber,
  )
  const richest = ranked[0] ?? null
  if (active && pitchVersionContentScore(active) > 0) return active
  if (richest && pitchVersionContentScore(richest) > 0) return richest
  return active ?? richest
}

function applyMutatedVersion(state: PitchState, version: PitchVersion): void {
  const idx = state.versions.findIndex((v) => v.id === version.id)
  if (idx !== -1) state.versions[idx] = version
  else state.versions.push(version)
  // Always surface the version that was just mutated so UI matches DB.
  state.activeVersionId = version.id
  state.activeVersion = version
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const pitchSlice = createSlice({
  name: 'pitch',
  initialState,
  reducers: {
    setActiveVersionId(state, action: PayloadAction<string>) {
      state.activeVersionId = action.payload
      state.activeVersion =
        state.versions.find((v) => v.id === action.payload) ?? null
    },
    resetPitch() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchVersions
      .addCase(fetchVersions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchVersions.fulfilled, (state, action) => {
        state.loading = false
        state.versions = action.payload
        const preferred = pickPreferredPitchVersion(action.payload)
        if (preferred) {
          state.activeVersionId = preferred.id
          state.activeVersion = preferred
        } else {
          state.activeVersionId = null
          state.activeVersion = null
        }
      })
      .addCase(fetchVersions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // fetchVersionById
      .addCase(fetchVersionById.fulfilled, (state, action) => {
        state.activeVersion = action.payload
        state.activeVersionId = action.payload.id
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        else state.versions.push(action.payload)
      })

      // createVersion
      .addCase(createVersion.pending, (state) => {
        state.saving = true
      })
      .addCase(createVersion.fulfilled, (state, action) => {
        state.saving = false
        const existingIdx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (existingIdx === -1) {
          state.versions.push(action.payload)
        } else {
          state.versions[existingIdx] = action.payload
        }
        // Do not steal focus from a version the user is already editing.
        if (!state.activeVersionId) {
          state.activeVersionId = action.payload.id
          state.activeVersion = action.payload
        } else if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
      })
      .addCase(createVersion.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // updateVersion
      .addCase(updateVersion.pending, (state) => {
        state.saving = true
      })
      .addCase(updateVersion.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
      })
      .addCase(updateVersion.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // addCategory, addService, updateService, deleteService, updateMilestones, updateVendorMapping
      // All return the updated version
      .addCase(addCategory.pending, (state) => {
        state.saving = true
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(deleteCategory.pending, (state) => {
        state.saving = true
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(addService.pending, (state) => {
        state.saving = true
      })
      .addCase(addService.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(addService.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateService.pending, (state) => {
        state.saving = true
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(updateService.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(deleteService.pending, (state) => {
        state.saving = true
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(deleteService.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateMilestones.pending, (state) => {
        state.saving = true
      })
      .addCase(updateMilestones.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(updateMilestones.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateVendorMapping.pending, (state) => {
        state.saving = true
      })
      .addCase(updateVendorMapping.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(updateVendorMapping.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updatePlannedExpenses.pending, (state) => {
        state.saving = true
      })
      .addCase(updatePlannedExpenses.fulfilled, (state, action) => {
        state.saving = false
        applyMutatedVersion(state, action.payload)
      })
      .addCase(updatePlannedExpenses.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
  },
})

export const { setActiveVersionId, resetPitch } = pitchSlice.actions
export default pitchSlice.reducer

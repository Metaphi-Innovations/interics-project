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

/** Final milestone is stored separately from regular vendor milestones. */
export interface VendorFinalMilestone {
  name: string
  percentage: number
  amount: number
}

/** Vendor quotation document (PO Transition); stored per service–vendor mapping. */
export interface VendorQuotation {
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
  /** Optional final milestone (single); not part of `milestones`. */
  finalMilestone?: VendorFinalMilestone
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
        const active = action.payload.find((v) => v.isActive) ?? action.payload[0] ?? null
        if (active) {
          state.activeVersionId = active.id
          state.activeVersion = active
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
        state.versions.push(action.payload)
        state.activeVersionId = action.payload.id
        state.activeVersion = action.payload
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
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
        const idx = state.versions.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.versions[idx] = action.payload
        if (state.activeVersionId === action.payload.id) {
          state.activeVersion = action.payload
        }
      })
      .addCase(updatePlannedExpenses.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
  },
})

export const { setActiveVersionId, resetPitch } = pitchSlice.actions
export default pitchSlice.reducer

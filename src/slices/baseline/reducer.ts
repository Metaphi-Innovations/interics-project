import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  fetchClientPO,
  uploadClientPO,
  updateClientPO,
  deleteClientPO,
  fetchBaseline,
  createBaseline,
  updateBaseline,
  fetchVendorPOs,
  createVendorPO,
  updateVendorPO,
} from './thunk'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientPO {
  id: string
  projectId: string
  poNumber: string
  startDate: string
  endDate: string
  poValue: number
  documentUrl: string | null
}

export interface ClientMilestone {
  id: string
  name: string
  percentage: number
  value: number
}

export interface VendorMapping {
  id: string
  vendorId: string
  vendorName: string
  value: number
  percentage: number
}

export interface BaselineService {
  id: string
  name: string
  subcategoryName: string
  value: number
  originalValue: number
  adjustedValue: number
  clientMilestones: ClientMilestone[]
  vendorMappings: VendorMapping[]
}

export interface BaselineCategory {
  id: string
  categoryName: string
  services: BaselineService[]
  totalValue: number
}

export interface Baseline {
  id: string
  projectId: string
  versionId: string
  versionLabel: string
  createdAt: string
  lockedAt: string
  status: 'Draft' | 'Locked'
  clientPOId: string
  categories: BaselineCategory[]
  totalRevenue: number
  totalCost: number
  profitability: number
}

export interface VendorMilestone {
  id: string
  name: string
  percentage: number
  value: number
  dueDate: string | null
  status: 'Paid' | 'Pending' | 'Overdue'
}

export interface VendorPO {
  id: string
  projectId: string
  vendorId: string
  vendorName: string
  poNumber: string
  poDate: string
  poValue: number
  milestones: VendorMilestone[]
}

// ─── State ────────────────────────────────────────────────────────────────────

interface BaselineState {
  clientPOs: ClientPO[]
  baseline: Baseline | null
  vendorPOs: VendorPO[]
  selectedVersionId: string | null
  loading: boolean
  saving: boolean
  error: string | null
}

const initialState: BaselineState = {
  clientPOs: [],
  baseline: null,
  vendorPOs: [],
  selectedVersionId: null,
  loading: false,
  saving: false,
  error: null,
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const baselineSlice = createSlice({
  name: 'baseline',
  initialState,
  reducers: {
    setSelectedVersionId(state, action: PayloadAction<string>) {
      state.selectedVersionId = action.payload
    },
    resetBaseline() {
      return initialState
    },
    reset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchClientPO
      .addCase(fetchClientPO.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClientPO.fulfilled, (state, action) => {
        state.loading = false
        state.clientPOs = action.payload
      })
      .addCase(fetchClientPO.rejected, (state) => {
        state.loading = false
        state.clientPOs = []
      })

      // uploadClientPO
      .addCase(uploadClientPO.pending, (state) => {
        state.saving = true
      })
      .addCase(uploadClientPO.fulfilled, (state, action) => {
        state.saving = false
        state.clientPOs.push(action.payload)
      })
      .addCase(uploadClientPO.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // updateClientPO
      .addCase(updateClientPO.pending, (state) => {
        state.saving = true
      })
      .addCase(updateClientPO.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.clientPOs.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) state.clientPOs[idx] = action.payload
      })
      .addCase(updateClientPO.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // deleteClientPO
      .addCase(deleteClientPO.pending, (state) => {
        state.saving = true
      })
      .addCase(deleteClientPO.fulfilled, (state, action) => {
        state.saving = false
        state.clientPOs = state.clientPOs.filter((p) => p.id !== action.payload)
      })
      .addCase(deleteClientPO.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // fetchBaseline
      .addCase(fetchBaseline.fulfilled, (state, action) => {
        state.baseline = action.payload
        if (action.payload) {
          state.selectedVersionId = action.payload.versionId
        }
      })

      // createBaseline
      .addCase(createBaseline.pending, (state) => {
        state.saving = true
      })
      .addCase(createBaseline.fulfilled, (state, action) => {
        state.saving = false
        state.baseline = action.payload
      })
      .addCase(createBaseline.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // updateBaseline
      .addCase(updateBaseline.pending, (state) => {
        state.saving = true
      })
      .addCase(updateBaseline.fulfilled, (state, action) => {
        state.saving = false
        state.baseline = action.payload
      })
      .addCase(updateBaseline.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // fetchVendorPOs
      .addCase(fetchVendorPOs.fulfilled, (state, action) => {
        state.vendorPOs = action.payload
      })

      // createVendorPO
      .addCase(createVendorPO.fulfilled, (state, action) => {
        state.vendorPOs.push(action.payload)
      })

      // updateVendorPO
      .addCase(updateVendorPO.fulfilled, (state, action) => {
        const idx = state.vendorPOs.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) state.vendorPOs[idx] = action.payload
      })
  },
})

export const { setSelectedVersionId, resetBaseline, reset } = baselineSlice.actions
export default baselineSlice.reducer

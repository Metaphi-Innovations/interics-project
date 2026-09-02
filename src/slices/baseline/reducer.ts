import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { PitchCategory, PlannedExpense } from '@/slices/pitch/reducer'
import {
  fetchClientPO,
  fetchClientPoById,
  uploadClientPO,
  updateClientPO,
  deleteClientPO,
  fetchBaseline,
  fetchBaselineHistory,
  createBaseline,
  updateBaseline,
  fetchVendorPOs,
  createVendorPO,
  updateVendorPO,
  deleteVendorPO,
} from './thunk'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientPORetention {
  percentage: number
  value: number
  gstRate?: number
  gstAmount?: number
  tdsRate?: number
  tdsAmount?: number
  labourCessRate?: number
  labourCessAmount?: number
  net?: number
  status?: 'Paid' | 'Unpaid'
  amountReceived?: number
  remaining?: number
}

export interface ClientPOMilestone {
  id: string
  serviceId: string
  serviceName: string
  name: string
  percentage: number
  value: number
  /** Distinguishes retention rows saved from retention cards. */
  kind?: 'regular' | 'retention'
  /** Payment status from GET /po/:poId (invoice-derived). */
  status?: 'Paid' | 'Unpaid'
  /** Optional retention slice linked to this milestone (legacy). */
  retention?: ClientPORetention
  /** Tax snapshots (server-computed on create/update). */
  gstRate?: number
  gstAmount?: number
  tdsRate?: number
  tdsAmount?: number
  labourCessRate?: number
  labourCessAmount?: number
  net?: number
  amountReceived?: number
  remaining?: number
}

export interface ClientPO {
  id: string
  projectId: string
  poNumber: string
  startDate: string
  endDate: string
  poValue: number
  /** Contracted executed value (may differ from PO value). */
  executedValue?: number | null
  /** When true, executed value was updated once post-creation and the PO is locked. */
  executedValueLocked?: boolean
  documentUrl: string | null
  /** Display name for documents section */
  fileName?: string
  uploadedAt?: string
  milestones?: ClientPOMilestone[]
  tdsSectionId?: string | null
  tdsRate?: number | null
}

/** Payment milestone on a vendor PO (execution tracking). */
export interface VendorPOMilestone {
  id: string
  name: string
  percentage: number
  value: number
  dueDate: string | null
  status: 'Paid' | 'Pending' | 'Overdue'
  kind?: 'regular' | 'retention'
  /** Baseline/master service id for GST resolution (multi-service PO cards). */
  serviceId?: string
  /** Tax snapshots (server-computed when PO gstRate is set). */
  gstRate?: number
  gstAmount?: number
  tdsRate?: number
  tdsAmount?: number
  net?: number
  amountPaid?: number
  remaining?: number
}

export type VendorPOExecutionStatus = 'Draft' | 'Issued' | 'Accepted'

export interface VendorPO {
  id: string
  projectId: string
  vendorId: string
  vendorName: string
  poNumber: string
  poDate: string
  poValue: number
  /** Latest agreed execution amount (may differ from contractual PO value). */
  executedValue?: number | null
  /** When true, executed value was updated once post-creation and the PO is locked. */
  executedValueLocked?: boolean
  milestones: VendorPOMilestone[]
  paymentTerms?: string
  status: VendorPOExecutionStatus
  linkedBaselineServiceIds?: string[]
  /** PO-level GST rate (%) applied to all milestones/retentions. */
  gstRate?: number | null
  /** TDS rate (%) applied to vendor invoices on this PO. */
  tdsRate?: number | null
  /** Vendor mapping row id from the pitch/baseline offer (Live Contract → Add PO). */
  linkedVendorMappingId?: string
  documentUrl?: string | null
  fileName?: string | null
  insurance?: boolean
  contractSigned?: boolean
  requiredDocumentsSubmitted?: boolean
}

/** Locked baseline: financial snapshot matches Pitch categories + planned expenses. */
export interface Baseline {
  id: string
  projectId: string
  /** Monotonic baseline revision (V1, V2, …). */
  version: number
  /** Pitch version id this snapshot was finalized from. */
  versionId: string
  /** Pitch version label (e.g. "Version 1"). */
  versionLabel: string
  /** Human-readable pitch reference (often same as versionLabel). */
  basedOnPitchVersion: string
  /** Pitch version number for transition draft metadata. */
  pitchVersionNumber: number
  isActive: boolean
  createdAt: string
  lockedAt: string
  status: 'Draft' | 'Locked'
  clientPOId: string
  categories: PitchCategory[]
  plannedExpenses: PlannedExpense[]
  /** PO-alignment originals keyed by service id. */
  originalServiceValues: Record<string, number>
  totalRevenue: number
  totalCost: number
  profitability: number
}

// ─── State ────────────────────────────────────────────────────────────────────

interface BaselineState {
  clientPOs: ClientPO[]
  baseline: Baseline | null
  baselineHistory: Baseline[]
  vendorPOs: VendorPO[]
  selectedVersionId: string | null
  loading: boolean
  saving: boolean
  error: string | null
}

const initialState: BaselineState = {
  clientPOs: [],
  baseline: null,
  baselineHistory: [],
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
        const previous = new Map(state.clientPOs.map((po) => [po.id, po]))
        state.clientPOs = action.payload.map((po) => {
          const prev = previous.get(po.id)
          const incoming = po.milestones ?? []
          const existing = prev?.milestones ?? []
          if (incoming.length === 0 && existing.length > 0) {
            return { ...po, milestones: existing }
          }
          return po
        })
      })
      .addCase(fetchClientPO.rejected, (state) => {
        state.loading = false
        state.clientPOs = []
      })
      .addCase(fetchClientPoById.fulfilled, (state, action) => {
        const idx = state.clientPOs.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) {
          state.clientPOs[idx] = { ...state.clientPOs[idx], ...action.payload }
        } else {
          state.clientPOs.push(action.payload)
        }
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

      // fetchBaselineHistory
      .addCase(fetchBaselineHistory.fulfilled, (state, action) => {
        state.baselineHistory = action.payload
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

      // deleteVendorPO
      .addCase(deleteVendorPO.pending, (state) => {
        state.saving = true
      })
      .addCase(deleteVendorPO.fulfilled, (state, action) => {
        state.saving = false
        state.vendorPOs = state.vendorPOs.filter((p) => p.id !== action.payload)
      })
      .addCase(deleteVendorPO.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
  },
})

export const { setSelectedVersionId, resetBaseline, reset } = baselineSlice.actions
export default baselineSlice.reducer

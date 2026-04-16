import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  fetchFilingItems,
  fetchGSTData,
  fetchTDSData,
  markReturnFiled,
  addChallan,
  mapDeductionToChallan,
  deleteChallan,
} from './thunk'

export interface FilingItem {
  id: string
  type: 'GST' | 'TDS'
  returnType: string
  period: string
  dueDate: string
  filedDate: string | null
  status: 'filed' | 'pending' | 'overdue' | 'partial'
  lateFee: number | null
}

export interface GSTSummary {
  period: string
  outputTax: number
  inputCredit: number
  netLiability: number
  paid: number
  pending: number
}

export interface GSTReturn {
  id: string
  returnType: 'GSTR-1' | 'GSTR-3B'
  period: string
  dueDate: string
  filedDate: string | null
  status: 'filed' | 'pending' | 'overdue'
  liability: number
}

export interface TDSSummary {
  period: string
  totalDeducted: number
  totalDeposited: number
  pendingDeposit: number
}

export interface TDSDeduction {
  id: string
  period: string
  deducteeType: 'client' | 'vendor'
  deducteeName: string
  pan: string
  amount: number
  section: string
  challanId: string | null
  projectId: string
  projectName: string
}

export interface TDSChallan {
  id: string
  period: string
  bsrCode: string
  depositDate: string
  amount: number
  section: string
  linkedDeductionIds: string[]
}

export type ComplianceFilingTypeFilter = 'all' | 'gst' | 'tds'

export interface ComplianceState {
  selectedPeriod: string
  selectedType: ComplianceFilingTypeFilter
  filingItems: FilingItem[]
  filingLoading: boolean
  gstSummary: GSTSummary | null
  gstReturns: GSTReturn[]
  gstLoading: boolean
  tdsSummary: TDSSummary | null
  tdsDeductions: TDSDeduction[]
  tdsChallans: TDSChallan[]
  tdsLoading: boolean
  saving: boolean
  error: string | null
}

function defaultPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const initialState: ComplianceState = {
  selectedPeriod: defaultPeriod(),
  selectedType: 'all',
  filingItems: [],
  filingLoading: false,
  gstSummary: null,
  gstReturns: [],
  gstLoading: false,
  tdsSummary: null,
  tdsDeductions: [],
  tdsChallans: [],
  tdsLoading: false,
  saving: false,
  error: null,
}

const complianceSlice = createSlice({
  name: 'compliance',
  initialState,
  reducers: {
    setSelectedPeriod(state, action: PayloadAction<string>) {
      state.selectedPeriod = action.payload
    },
    setSelectedType(state, action: PayloadAction<ComplianceFilingTypeFilter>) {
      state.selectedType = action.payload
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFilingItems.pending, (state) => {
        state.filingLoading = true
        state.error = null
      })
      .addCase(fetchFilingItems.fulfilled, (state, action) => {
        state.filingLoading = false
        state.filingItems = action.payload
      })
      .addCase(fetchFilingItems.rejected, (state, action) => {
        state.filingLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchGSTData.pending, (state) => {
        state.gstLoading = true
        state.error = null
      })
      .addCase(fetchGSTData.fulfilled, (state, action) => {
        state.gstLoading = false
        state.gstSummary = action.payload.summary
        state.gstReturns = action.payload.returns
      })
      .addCase(fetchGSTData.rejected, (state, action) => {
        state.gstLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchTDSData.pending, (state) => {
        state.tdsLoading = true
        state.error = null
      })
      .addCase(fetchTDSData.fulfilled, (state, action) => {
        state.tdsLoading = false
        state.tdsSummary = action.payload.summary
        state.tdsDeductions = action.payload.deductions
        state.tdsChallans = action.payload.challans
      })
      .addCase(fetchTDSData.rejected, (state, action) => {
        state.tdsLoading = false
        state.error = action.payload as string
      })
      .addCase(markReturnFiled.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(markReturnFiled.fulfilled, (state, action) => {
        state.saving = false
        const { filingItems, gstReturns } = action.payload
        if (filingItems) state.filingItems = filingItems
        if (gstReturns) state.gstReturns = gstReturns
        if (action.payload.gstSummary !== undefined) state.gstSummary = action.payload.gstSummary
      })
      .addCase(markReturnFiled.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(addChallan.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(addChallan.fulfilled, (state, action) => {
        state.saving = false
        state.tdsChallans = action.payload.challans
        state.tdsSummary = action.payload.summary
      })
      .addCase(addChallan.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(mapDeductionToChallan.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(mapDeductionToChallan.fulfilled, (state, action) => {
        state.saving = false
        state.tdsDeductions = action.payload.deductions
        state.tdsChallans = action.payload.challans
        state.tdsSummary = action.payload.summary
      })
      .addCase(mapDeductionToChallan.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(deleteChallan.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(deleteChallan.fulfilled, (state, action) => {
        state.saving = false
        state.tdsChallans = action.payload.challans
        state.tdsSummary = action.payload.summary
      })
      .addCase(deleteChallan.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
  },
})

export const { setSelectedPeriod, setSelectedType, clearError } = complianceSlice.actions
export default complianceSlice.reducer

import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  createFinanceExpense,
  createFinanceInvoice,
  fetchFinanceExpenses,
  fetchFinanceGst,
  fetchFinanceInvoices,
  fetchFinancePayments,
  fetchFinanceReimbursements,
  fetchFinanceTds,
} from './thunk'
import type {
  ClientInvoice,
  Expense,
  FinanceComplianceFilters,
  FinanceListFilters,
  GlobalGstResponse,
  GlobalTdsResponse,
  Reimbursement,
  VendorPayment,
} from './types'

export type {
  ClientInvoice,
  Expense,
  FinanceComplianceFilters,
  FinanceListFilters,
  Reimbursement,
  VendorPayment,
  GlobalGstResponse,
  GlobalTdsResponse,
} from './types'

export interface FinanceState {
  invoices: ClientInvoice[]
  expenses: Expense[]
  payments: VendorPayment[]
  reimbursements: Reimbursement[]
  filters: FinanceListFilters
  gst: GlobalGstResponse | null
  tds: GlobalTdsResponse | null
  complianceFilters: FinanceComplianceFilters
  loading: boolean
  saving: boolean
  complianceLoading: boolean
}

const initialState: FinanceState = {
  invoices: [],
  expenses: [],
  payments: [],
  reimbursements: [],
  filters: {},
  gst: null,
  tds: null,
  complianceFilters: {},
  loading: false,
  saving: false,
  complianceLoading: false,
}

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<FinanceListFilters>) {
      state.filters = action.payload
    },
    setComplianceFilters(state, action: PayloadAction<FinanceComplianceFilters>) {
      state.complianceFilters = action.payload
    },
    reset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinanceInvoices.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchFinanceInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.invoices = action.payload
      })
      .addCase(fetchFinanceInvoices.rejected, (state) => {
        state.loading = false
      })

      .addCase(createFinanceInvoice.pending, (state) => {
        state.saving = true
      })
      .addCase(createFinanceInvoice.fulfilled, (state, action) => {
        state.saving = false
        state.invoices.push(action.payload)
      })
      .addCase(createFinanceInvoice.rejected, (state) => {
        state.saving = false
      })

      .addCase(fetchFinanceExpenses.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchFinanceExpenses.fulfilled, (state, action) => {
        state.loading = false
        state.expenses = action.payload
      })
      .addCase(fetchFinanceExpenses.rejected, (state) => {
        state.loading = false
      })

      .addCase(createFinanceExpense.pending, (state) => {
        state.saving = true
      })
      .addCase(createFinanceExpense.fulfilled, (state, action) => {
        state.saving = false
        state.expenses.push(action.payload)
      })
      .addCase(createFinanceExpense.rejected, (state) => {
        state.saving = false
      })

      .addCase(fetchFinancePayments.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchFinancePayments.fulfilled, (state, action) => {
        state.loading = false
        state.payments = action.payload
      })
      .addCase(fetchFinancePayments.rejected, (state) => {
        state.loading = false
      })

      .addCase(fetchFinanceReimbursements.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchFinanceReimbursements.fulfilled, (state, action) => {
        state.loading = false
        state.reimbursements = action.payload
      })
      .addCase(fetchFinanceReimbursements.rejected, (state) => {
        state.loading = false
      })

      .addCase(fetchFinanceGst.pending, (state) => {
        state.complianceLoading = true
      })
      .addCase(fetchFinanceGst.fulfilled, (state, action) => {
        state.complianceLoading = false
        state.gst = action.payload
      })
      .addCase(fetchFinanceGst.rejected, (state) => {
        state.complianceLoading = false
      })

      .addCase(fetchFinanceTds.pending, (state) => {
        state.complianceLoading = true
      })
      .addCase(fetchFinanceTds.fulfilled, (state, action) => {
        state.complianceLoading = false
        state.tds = action.payload
      })
      .addCase(fetchFinanceTds.rejected, (state) => {
        state.complianceLoading = false
      })
  },
})

export const { setFilters, setComplianceFilters, reset } = financeSlice.actions
export default financeSlice.reducer

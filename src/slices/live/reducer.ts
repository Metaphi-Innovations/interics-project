import { createSlice } from '@reduxjs/toolkit'
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  recordInvoicePayment,
  fetchVendorInvoices,
  uploadVendorInvoice,
  fetchPayments,
  createPayment,
  fetchExpenses,
  createExpense,
  deleteExpense,
  fetchReimbursements,
  createReimbursement,
} from './thunk'
import type { ClientInvoice, Expense, Reimbursement, VendorInvoice, VendorPayment } from './types'

export type {
  ClientInvoice,
  VendorInvoice,
  VendorPayment,
  Expense,
  ExpenseType,
  Reimbursement,
  ComplianceData,
} from './types'

interface LiveState {
  invoices: ClientInvoice[]
  vendorInvoices: VendorInvoice[]
  payments: VendorPayment[]
  expenses: Expense[]
  reimbursements: Reimbursement[]
  loading: boolean
  saving: boolean
}

const initialState: LiveState = {
  invoices: [],
  vendorInvoices: [],
  payments: [],
  expenses: [],
  reimbursements: [],
  loading: false,
  saving: false,
}

function mergeByProjectId<T extends { projectId: string }>(
  rows: T[],
  projectId: string,
  incoming: T[],
): T[] {
  return [...rows.filter((x) => x.projectId !== projectId), ...incoming]
}

const liveSlice = createSlice({
  name: 'live',
  initialState,
  reducers: {
    reset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.invoices = action.payload
      })
      .addCase(fetchInvoices.rejected, (state) => {
        state.loading = false
      })

      .addCase(createInvoice.pending, (state) => {
        state.saving = true
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.saving = false
        state.invoices.push(action.payload)
      })
      .addCase(createInvoice.rejected, (state) => {
        state.saving = false
      })

      .addCase(updateInvoice.fulfilled, (state, action) => {
        const idx = state.invoices.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.invoices[idx] = action.payload
      })

      .addCase(recordInvoicePayment.pending, (state) => {
        state.saving = true
      })
      .addCase(recordInvoicePayment.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.invoices.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.invoices[idx] = action.payload
      })
      .addCase(recordInvoicePayment.rejected, (state) => {
        state.saving = false
      })

      .addCase(fetchVendorInvoices.fulfilled, (state, action) => {
        const projectId = action.meta.arg
        state.vendorInvoices = mergeByProjectId(state.vendorInvoices, projectId, action.payload)
      })

      .addCase(uploadVendorInvoice.pending, (state) => {
        state.saving = true
      })
      .addCase(uploadVendorInvoice.fulfilled, (state, action) => {
        state.saving = false
        state.vendorInvoices.push(action.payload)
      })
      .addCase(uploadVendorInvoice.rejected, (state) => {
        state.saving = false
      })

      .addCase(fetchPayments.fulfilled, (state, action) => {
        const projectId = action.meta.arg
        state.payments = mergeByProjectId(state.payments, projectId, action.payload)
      })

      .addCase(createPayment.pending, (state) => {
        state.saving = true
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.saving = false
        state.payments.push(action.payload)
        const pay = action.payload
        for (const invId of pay.linkedInvoiceIds) {
          const idx = state.vendorInvoices.findIndex((v) => v.id === invId)
          if (idx !== -1) state.vendorInvoices[idx] = { ...state.vendorInvoices[idx], status: 'paid' }
        }
        for (const expId of pay.linkedExpenseIds) {
          const idx = state.expenses.findIndex((e) => e.id === expId)
          if (idx !== -1) {
            state.expenses[idx] = {
              ...state.expenses[idx],
              status: 'included_in_payment',
              linkedPaymentId: pay.id,
            }
          }
        }
        for (const rId of pay.linkedReimbursementIds) {
          const idx = state.reimbursements.findIndex((r) => r.id === rId)
          if (idx !== -1) {
            state.reimbursements[idx] = {
              ...state.reimbursements[idx],
              status: 'included_in_payment',
              linkedPaymentId: pay.id,
            }
          }
        }
      })
      .addCase(createPayment.rejected, (state) => {
        state.saving = false
      })

      .addCase(fetchExpenses.fulfilled, (state, action) => {
        const projectId = action.meta.arg
        state.expenses = mergeByProjectId(state.expenses, projectId, action.payload)
      })

      .addCase(createExpense.pending, (state) => {
        state.saving = true
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.saving = false
        state.expenses.push(action.payload)
      })
      .addCase(createExpense.rejected, (state) => {
        state.saving = false
      })

      .addCase(deleteExpense.pending, (state) => {
        state.saving = true
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.saving = false
        const { expenseId } = action.payload
        state.expenses = state.expenses.filter((e) => e.id !== expenseId)
      })
      .addCase(deleteExpense.rejected, (state) => {
        state.saving = false
      })

      .addCase(fetchReimbursements.fulfilled, (state, action) => {
        const projectId = action.meta.arg
        state.reimbursements = mergeByProjectId(state.reimbursements, projectId, action.payload)
      })

      .addCase(createReimbursement.pending, (state) => {
        state.saving = true
      })
      .addCase(createReimbursement.fulfilled, (state, action) => {
        state.saving = false
        state.reimbursements.push(action.payload)
      })
      .addCase(createReimbursement.rejected, (state) => {
        state.saving = false
      })
  },
})

export const { reset } = liveSlice.actions
export default liveSlice.reducer

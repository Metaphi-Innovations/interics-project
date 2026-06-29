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
  deleteReimbursement,
  fetchVendorPayableControls,
  updateVendorPayableControl,
} from './thunk'
import type {
  ClientInvoice,
  Expense,
  Reimbursement,
  VendorInvoice,
  VendorPayableControl,
  VendorPayment,
} from './types'

export type {
  ClientInvoice,
  VendorInvoice,
  VendorPayment,
  VendorPayableControl,
  Expense,
  ExpenseType,
  Reimbursement,
  ComplianceData,
} from './types'

interface LiveState {
  invoices: ClientInvoice[]
  vendorInvoices: VendorInvoice[]
  vendorPayableControls: VendorPayableControl[]
  payments: VendorPayment[]
  expenses: Expense[]
  reimbursements: Reimbursement[]
  loading: boolean
  saving: boolean
}

const initialState: LiveState = {
  invoices: [],
  vendorInvoices: [],
  vendorPayableControls: [],
  payments: [],
  expenses: [],
  reimbursements: [],
  loading: false,
  saving: false,
}

function mergeByProjectId<T extends { projectId: string }>(
  rows: T[],
  projectId: string,
  incoming: T[] | undefined | null,
): T[] {
  const safeRows = Array.isArray(rows) ? rows : []
  const safeIncoming = Array.isArray(incoming) ? incoming : []
  return [...safeRows.filter((x) => x.projectId !== projectId), ...safeIncoming]
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
        state.invoices = action.payload ?? []
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
        const inv = action.payload
        for (const expId of inv.linkedExpenseIds ?? []) {
          const idx = state.expenses.findIndex((e) => e.id === expId)
          if (idx !== -1 && state.expenses[idx].status === 'pending') {
            state.expenses[idx] = {
              ...state.expenses[idx],
              status: 'adjusted',
              linkedVendorInvoiceId: inv.id,
            }
          }
        }
      })
      .addCase(uploadVendorInvoice.rejected, (state) => {
        state.saving = false
      })

      .addCase(fetchVendorPayableControls.fulfilled, (state, action) => {
        const projectId = action.meta.arg
        state.vendorPayableControls = mergeByProjectId(
          state.vendorPayableControls,
          projectId,
          action.payload,
        )
      })

      .addCase(updateVendorPayableControl.fulfilled, (state, action) => {
        const ctrl = action.payload
        const idx = state.vendorPayableControls.findIndex(
          (c) =>
            c.projectId === ctrl.projectId &&
            c.vendorId === ctrl.vendorId &&
            c.serviceId === ctrl.serviceId,
        )
        if (idx === -1) state.vendorPayableControls.push(ctrl)
        else state.vendorPayableControls[idx] = ctrl
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
        for (const invId of pay.linkedInvoiceIds ?? []) {
          const idx = state.vendorInvoices.findIndex((v) => v.id === invId)
          if (idx !== -1) state.vendorInvoices[idx] = { ...state.vendorInvoices[idx], status: 'paid' }
        }
        for (const expId of pay.linkedExpenseIds ?? []) {
          const idx = state.expenses.findIndex((e) => e.id === expId)
          if (idx !== -1) {
            state.expenses[idx] = {
              ...state.expenses[idx],
              status: 'included_in_payment',
              linkedPaymentId: pay.id,
            }
          }
        }
        for (const rId of pay.linkedReimbursementIds ?? []) {
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
        const { expenseId, linkedReimbursementId } = action.payload
        state.expenses = state.expenses.filter((e) => e.id !== expenseId)
        if (linkedReimbursementId) {
          state.reimbursements = state.reimbursements.filter((r) => r.id !== linkedReimbursementId)
        }
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

      .addCase(deleteReimbursement.fulfilled, (state, action) => {
        const { reimbursementId } = action.payload
        state.reimbursements = state.reimbursements.filter((r) => r.id !== reimbursementId)
      })
  },
})

export const { reset } = liveSlice.actions
export default liveSlice.reducer

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  recordInvoicePayment,
  fetchVendorInvoices,
  uploadVendorInvoice,
  updateVendorInvoice,
  deleteVendorInvoice,
  fetchPayments,
  createPayment,
  fetchExpenses,
  createExpense,
  updateExpense,
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
import { nextExpenseStatusAfterInvoiceLink } from '@/utils/commonExpensePayables'

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
    hydrateVendorInvoices(state, action: PayloadAction<VendorInvoice[]>) {
      state.vendorInvoices = Array.isArray(action.payload) ? action.payload : []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.invoices = mergeByProjectId(
          state.invoices,
          action.meta.arg,
          action.payload ?? [],
        )
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
        for (const expId of [
          ...(inv.linkedExpenseIds ?? []),
          ...(inv.linkedAdditionExpenseIds ?? []),
        ]) {
          const idx = state.expenses.findIndex((e) => e.id === expId)
          if (idx === -1) continue
          const exp = state.expenses[idx]
          if (exp.status !== 'pending' && !(exp.type === 'common' && exp.status === 'adjusted')) {
            continue
          }
          const next = nextExpenseStatusAfterInvoiceLink(exp, state.vendorInvoices, inv.id)
          state.expenses[idx] = { ...exp, ...next }
        }
      })
      .addCase(uploadVendorInvoice.rejected, (state) => {
        state.saving = false
      })

      .addCase(updateVendorInvoice.pending, (state) => {
        state.saving = true
      })
      .addCase(updateVendorInvoice.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.vendorInvoices.findIndex((v) => v.id === action.payload.id)
        if (idx === -1) return
        const prev = state.vendorInvoices[idx]
        state.vendorInvoices[idx] = action.payload

        const touchedExpenseIds = new Set<string>([
          ...(prev.linkedExpenseIds ?? []),
          ...(prev.linkedAdditionExpenseIds ?? []),
          ...(action.payload.linkedExpenseIds ?? []),
          ...(action.payload.linkedAdditionExpenseIds ?? []),
        ])

        for (const expId of touchedExpenseIds) {
          const expIdx = state.expenses.findIndex((e) => e.id === expId)
          if (expIdx === -1) continue
          const exp = state.expenses[expIdx]
          if (exp.status === 'included_in_payment') continue

          if (exp.type === 'common') {
            const next = nextExpenseStatusAfterInvoiceLink(exp, state.vendorInvoices, action.payload.id)
            state.expenses[expIdx] = {
              ...exp,
              status: next.status,
              linkedVendorInvoiceId:
                next.status === 'adjusted' ? next.linkedVendorInvoiceId : undefined,
            }
            continue
          }

          const stillLinked = state.vendorInvoices.some(
            (inv) =>
              (inv.linkedExpenseIds ?? []).includes(expId) ||
              (inv.linkedAdditionExpenseIds ?? []).includes(expId),
          )
          state.expenses[expIdx] = stillLinked
            ? {
                ...exp,
                status: 'adjusted',
                linkedVendorInvoiceId: action.payload.id,
              }
            : {
                ...exp,
                status: 'pending',
                linkedVendorInvoiceId: undefined,
              }
        }
      })
      .addCase(updateVendorInvoice.rejected, (state) => {
        state.saving = false
      })

      .addCase(deleteVendorInvoice.pending, (state) => {
        state.saving = true
      })
      .addCase(deleteVendorInvoice.fulfilled, (state, action) => {
        state.saving = false
        const { invoiceId } = action.payload
        state.vendorInvoices = state.vendorInvoices.filter((v) => v.id !== invoiceId)
      })
      .addCase(deleteVendorInvoice.rejected, (state) => {
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
          if (idx === -1) continue
          const invoice = state.vendorInvoices[idx]
          const invoicePayments = state.payments.filter(
            (p) => p.status !== 'not_paid' && p.linkedInvoiceIds?.includes(invId),
          )
          const totalPaid = invoicePayments.reduce((sum, p) => {
            const allocs = p.allocations?.filter((a) => a.invoiceId === invId) ?? []
            if (allocs.length > 0) {
              return sum + allocs.reduce((s, a) => s + a.allocatedAmount, 0)
            }
            return sum + (p.netPaid ?? 0)
          }, 0)
          const invoiceNet = invoice.netPayable ?? 0
          const status =
            totalPaid <= 0.01
              ? 'not_paid'
              : totalPaid + 0.01 >= invoiceNet
                ? 'paid'
                : 'partially_paid'
          state.vendorInvoices[idx] = { ...invoice, status }
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
        const projectId = action.meta.arg.projectId
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

      .addCase(updateExpense.pending, (state) => {
        state.saving = true
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.expenses.findIndex((e) => e.id === action.payload.id)
        if (idx >= 0) {
          state.expenses[idx] = action.payload
        }
      })
      .addCase(updateExpense.rejected, (state) => {
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

export const { reset, hydrateVendorInvoices } = liveSlice.actions
export default liveSlice.reducer

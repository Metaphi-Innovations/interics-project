import { createSlice } from '@reduxjs/toolkit'
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  recordReceipt,
  fetchVendorInvoices,
  createVendorInvoice,
  payVendorInvoice,
  fetchExpenses,
  createExpense,
  approveExpense,
  rejectExpense,
  fetchChangeRequests,
  createChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  fetchComplianceData,
} from './thunk'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string
  projectId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  amount: number
  gstRate: number
  gstAmount: number
  tdsRate: number
  tdsAmount: number
  grossAmount: number
  netReceivable: number
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled'
  paidAmount: number
  paidDate: string | null
  receiptReference: string | null
}

export interface VendorInvoice {
  id: string
  projectId: string
  vendorPOId: string
  vendorId: string
  vendorName: string
  invoiceNumber: string
  invoiceDate: string
  milestoneId: string
  milestoneName: string
  amount: number
  tdsRate: number
  tdsAmount: number
  netPayable: number
  status: 'Pending' | 'Approved' | 'Paid' | 'On Hold'
  paidAmount: number
  paidDate: string | null
  paymentReference: string | null
}

export interface Expense {
  id: string
  projectId: string
  date: string
  description: string
  category: 'Travel' | 'Accommodation' | 'Materials' | 'Misc' | 'Other'
  amount: number
  vendorId: string | null
  vendorName: string | null
  billable: boolean
  status: 'Pending' | 'Approved' | 'Rejected'
  receiptUrl: string | null
  notes: string | null
  submittedBy: string
  approvedBy: string | null
}

export interface ChangeRequest {
  id: string
  projectId: string
  crNumber: string
  title: string
  description: string
  requestedBy: string
  requestedDate: string
  type: 'Scope Addition' | 'Scope Reduction' | 'Timeline Extension' | 'Cost Revision'
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Implemented'
  financialImpact: number
  approvedBy: string | null
  approvedDate: string | null
  notes: string | null
}

// ─── Compliance Types ─────────────────────────────────────────────────────────

export interface ComplianceData {
  gstSummary: {
    collected: number
    paid: number
    netPayable: number
  }
  tdsSummary: {
    deducted: number
    deposited: number
    pending: number
  }
  monthlyTracker: Array<{
    month: string
    gstCollected: number
    gstPaid: number
    netGst: number
    tdsDeducted: number
    tdsDeposited: number
    status: 'filed' | 'pending' | 'overdue'
  }>
  pendingActions: string[]
}

// ─── State ────────────────────────────────────────────────────────────────────

interface LiveState {
  invoices: Invoice[]
  vendorInvoices: VendorInvoice[]
  expenses: Expense[]
  changeRequests: ChangeRequest[]
  complianceData: ComplianceData | null
  loading: boolean
  saving: boolean
  error: string | null
}

const initialState: LiveState = {
  invoices: [],
  vendorInvoices: [],
  expenses: [],
  changeRequests: [],
  complianceData: null,
  loading: false,
  saving: false,
  error: null,
}

// ─── Slice ────────────────────────────────────────────────────────────────────

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
      // fetchInvoices
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.invoices = action.payload
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // createInvoice
      .addCase(createInvoice.pending, (state) => {
        state.saving = true
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.saving = false
        state.invoices.push(action.payload)
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // updateInvoice
      .addCase(updateInvoice.fulfilled, (state, action) => {
        const idx = state.invoices.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.invoices[idx] = action.payload
      })

      // recordReceipt
      .addCase(recordReceipt.pending, (state) => {
        state.saving = true
      })
      .addCase(recordReceipt.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.invoices.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.invoices[idx] = action.payload
      })
      .addCase(recordReceipt.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // fetchVendorInvoices
      .addCase(fetchVendorInvoices.fulfilled, (state, action) => {
        state.vendorInvoices = action.payload
      })

      // createVendorInvoice
      .addCase(createVendorInvoice.fulfilled, (state, action) => {
        state.vendorInvoices.push(action.payload)
      })

      // payVendorInvoice
      .addCase(payVendorInvoice.pending, (state) => {
        state.saving = true
      })
      .addCase(payVendorInvoice.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.vendorInvoices.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.vendorInvoices[idx] = action.payload
      })
      .addCase(payVendorInvoice.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // fetchExpenses
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.expenses = action.payload
      })

      // createExpense
      .addCase(createExpense.pending, (state) => {
        state.saving = true
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.saving = false
        state.expenses.push(action.payload)
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // approveExpense
      .addCase(approveExpense.fulfilled, (state, action) => {
        const idx = state.expenses.findIndex((e) => e.id === action.payload.id)
        if (idx !== -1) state.expenses[idx] = action.payload
      })

      // rejectExpense
      .addCase(rejectExpense.fulfilled, (state, action) => {
        const idx = state.expenses.findIndex((e) => e.id === action.payload.id)
        if (idx !== -1) state.expenses[idx] = action.payload
      })

      // fetchChangeRequests
      .addCase(fetchChangeRequests.fulfilled, (state, action) => {
        state.changeRequests = action.payload
      })

      // createChangeRequest
      .addCase(createChangeRequest.pending, (state) => {
        state.saving = true
      })
      .addCase(createChangeRequest.fulfilled, (state, action) => {
        state.saving = false
        state.changeRequests.push(action.payload)
      })
      .addCase(createChangeRequest.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })

      // approveChangeRequest
      .addCase(approveChangeRequest.fulfilled, (state, action) => {
        const idx = state.changeRequests.findIndex((c) => c.id === action.payload.id)
        if (idx !== -1) state.changeRequests[idx] = action.payload
      })

      // rejectChangeRequest
      .addCase(rejectChangeRequest.fulfilled, (state, action) => {
        const idx = state.changeRequests.findIndex((c) => c.id === action.payload.id)
        if (idx !== -1) state.changeRequests[idx] = action.payload
      })

      // fetchComplianceData
      .addCase(fetchComplianceData.fulfilled, (state, action) => {
        state.complianceData = action.payload
      })
  },
})

export const { reset } = liveSlice.actions
export default liveSlice.reducer

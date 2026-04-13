import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  fetchPOs,
  fetchVendorInvoices,
  fetchVendorPOById,
  fetchVendorInvoiceById,
  createPO,
  createVendorInvoice,
  recordVendorPayment,
  updateVendorPO,
  updateVendorInvoice,
  issueVendorPO,
} from './thunk'

export type VendorPOStatus = 'draft' | 'issued'

export interface VendorPOLineItem {
  id: string
  serviceName: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface VendorPO {
  id: string
  poNo: string
  projectId: string
  projectName: string
  vendorId: string
  vendorName: string
  poDate: string
  validUntil?: string
  paymentTerms?: string
  notes?: string
  status: VendorPOStatus
  lineItems: VendorPOLineItem[]
  totalValue: number
  scopeBaselineServiceIds?: string[]
  createdAt: string
  updatedAt: string
}

export type VendorInvoiceStatus =
  | 'draft'
  | 'unpaid'
  | 'partially_paid'
  | 'overdue'
  | 'paid'

export interface VendorInvoiceLineItem {
  id: string
  name: string
  amount: number
}

export interface VendorPayment {
  id: string
  date: string
  amountPaid: number
  tdsDeducted: number
  paymentMode: 'bank_transfer' | 'cheque' | 'upi' | 'other'
  reference?: string
  recordedAt: string
}

export interface VendorInvoice {
  id: string
  invoiceNo: string
  vendorId: string
  vendorName: string
  projectId: string
  projectName: string
  vendorPoId?: string
  poNo?: string
  invoiceDate: string
  dueDate: string
  lineItems: VendorInvoiceLineItem[]
  totalAmount: number
  totalPaid: number
  tdsDeducted: number
  balance: number
  status: VendorInvoiceStatus
  payments: VendorPayment[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type PayablesViewTab = 'all' | 'po' | 'invoices' | 'outstanding'

export interface PayablesFilters {
  viewTab: PayablesViewTab
  search: string
  vendorId: string
  projectId: string
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
}

export interface PayablesSortConfig {
  field: string | null
  direction: 'asc' | 'desc'
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface PayablesState {
  purchaseOrders: VendorPO[]
  vendorInvoices: VendorInvoice[]
  selectedPO: VendorPO | null
  selectedInvoice: VendorInvoice | null
  posListLoading: boolean
  invoicesListLoading: boolean
  detailLoading: boolean
  saving: boolean
  error: string | null
  filters: PayablesFilters
  sortConfig: PayablesSortConfig
  pagination: Pagination
}

const initialState: PayablesState = {
  purchaseOrders: [],
  vendorInvoices: [],
  selectedPO: null,
  selectedInvoice: null,
  posListLoading: false,
  invoicesListLoading: false,
  detailLoading: false,
  saving: false,
  error: null,
  filters: {
    viewTab: 'invoices',
    search: '',
    vendorId: '',
    projectId: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  },
  sortConfig: { field: 'invoiceDate', direction: 'desc' },
  pagination: { page: 1, pageSize: 10, total: 0 },
}

const payablesSlice = createSlice({
  name: 'payables',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<PayablesFilters>>) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = {
        ...initialState.filters,
        search: state.filters.search,
        viewTab: state.filters.viewTab,
      }
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pagination.pageSize = action.payload
      state.pagination.page = 1
    },
    setSortConfig(state, action: PayloadAction<PayablesSortConfig>) {
      state.sortConfig = action.payload
    },
    clearSelectedPO(state) {
      state.selectedPO = null
    },
    clearSelectedInvoice(state) {
      state.selectedInvoice = null
    },
    setSelectedPO(state, action: PayloadAction<VendorPO | null>) {
      state.selectedPO = action.payload
    },
    setSelectedInvoice(state, action: PayloadAction<VendorInvoice | null>) {
      state.selectedInvoice = action.payload
    },
    reset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPOs.pending, (state) => {
        state.posListLoading = true
        state.error = null
      })
      .addCase(fetchPOs.fulfilled, (state, action) => {
        state.posListLoading = false
        state.purchaseOrders = action.payload.items
      })
      .addCase(fetchPOs.rejected, (state, action) => {
        state.posListLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchVendorInvoices.pending, (state) => {
        state.invoicesListLoading = true
        state.error = null
      })
      .addCase(fetchVendorInvoices.fulfilled, (state, action) => {
        state.invoicesListLoading = false
        state.vendorInvoices = action.payload.items
        state.pagination.total = action.payload.total
      })
      .addCase(fetchVendorInvoices.rejected, (state, action) => {
        state.invoicesListLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchVendorPOById.pending, (state) => {
        state.detailLoading = true
        state.error = null
      })
      .addCase(fetchVendorPOById.fulfilled, (state, action) => {
        state.detailLoading = false
        state.selectedPO = action.payload
      })
      .addCase(fetchVendorPOById.rejected, (state, action) => {
        state.detailLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchVendorInvoiceById.pending, (state) => {
        state.detailLoading = true
        state.error = null
      })
      .addCase(fetchVendorInvoiceById.fulfilled, (state, action) => {
        state.detailLoading = false
        state.selectedInvoice = action.payload
      })
      .addCase(fetchVendorInvoiceById.rejected, (state, action) => {
        state.detailLoading = false
        state.error = action.payload as string
      })
      .addCase(createPO.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(createPO.fulfilled, (state, action) => {
        state.saving = false
        state.purchaseOrders = [action.payload, ...state.purchaseOrders.filter((p) => p.id !== action.payload.id)]
      })
      .addCase(createPO.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateVendorPO.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(updateVendorPO.fulfilled, (state, action) => {
        state.saving = false
        const po = action.payload
        const i = state.purchaseOrders.findIndex((x) => x.id === po.id)
        if (i >= 0) state.purchaseOrders[i] = po
        if (state.selectedPO?.id === po.id) state.selectedPO = po
      })
      .addCase(updateVendorPO.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(issueVendorPO.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(issueVendorPO.fulfilled, (state, action) => {
        state.saving = false
        const po = action.payload
        const i = state.purchaseOrders.findIndex((x) => x.id === po.id)
        if (i >= 0) state.purchaseOrders[i] = po
        if (state.selectedPO?.id === po.id) state.selectedPO = po
      })
      .addCase(issueVendorPO.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(createVendorInvoice.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(createVendorInvoice.fulfilled, (state, action) => {
        state.saving = false
        state.vendorInvoices = [
          action.payload,
          ...state.vendorInvoices.filter((i) => i.id !== action.payload.id),
        ]
      })
      .addCase(createVendorInvoice.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateVendorInvoice.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(updateVendorInvoice.fulfilled, (state, action) => {
        state.saving = false
        const inv = action.payload
        const i = state.vendorInvoices.findIndex((x) => x.id === inv.id)
        if (i >= 0) state.vendorInvoices[i] = inv
        if (state.selectedInvoice?.id === inv.id) state.selectedInvoice = inv
      })
      .addCase(updateVendorInvoice.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(recordVendorPayment.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(recordVendorPayment.fulfilled, (state, action) => {
        state.saving = false
        const inv = action.payload
        const i = state.vendorInvoices.findIndex((x) => x.id === inv.id)
        if (i >= 0) state.vendorInvoices[i] = inv
        if (state.selectedInvoice?.id === inv.id) state.selectedInvoice = inv
      })
      .addCase(recordVendorPayment.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
  },
})

export const {
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  setSortConfig,
  clearSelectedPO,
  clearSelectedInvoice,
  setSelectedPO,
  setSelectedInvoice,
  reset,
} = payablesSlice.actions
export default payablesSlice.reducer

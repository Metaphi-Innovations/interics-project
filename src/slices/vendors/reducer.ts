import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { ActivityEntry, Contact } from '../customers/reducer'
import { getVendorContactsList } from '@/utils/vendorContacts'
import {
  fetchVendors,
  fetchVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  createVendorContact,
} from './thunk'

export interface VendorFinancialDetails {
  totalPayables: number
  amountPaid: number
  outstanding: number
  tdsDeducted: number
  activeProjects: number
  completedProjects: number
  totalContractValue: number
  lastPaymentDate: string
  paymentTerms: string
  vendorType: string
  gstStatus: string
}

export type VendorDocumentType =
  | 'Catalogue'
  | 'Brochure'
  | 'Certificate'
  | 'Compliance'
  | 'Product'

export type VendorComplianceDocumentType =
  | 'gst'
  | 'pan'
  | 'bank_cheque'
  | 'insurance'
  | 'catalogue'

export interface VendorComplianceDocument {
  documentType?: VendorComplianceDocumentType
  name: string
  url: string
  description?: string | null
  uploadedBy?: string | null
  uploadedOn?: string | null
  lastUpdatedOn?: string | null
  expiryDate?: string | null
}

export interface VendorDocument {
  id: string
  name: string
  type: VendorDocumentType
  uploadedAt: string
  expiryDate?: string | null
  url: string
  description?: string | null
  uploadedBy?: string | null
  lastUpdatedOn?: string | null
}

export interface VendorAdditionalComplianceDoc {
  id: string
  name: string
  url: string
  fileName?: string | null
  description?: string | null
  uploadedBy?: string | null
  uploadedOn?: string | null
  lastUpdatedOn?: string | null
  expiryDate?: string | null
}

export type ComplianceChipStatus = 'verified' | 'missing' | 'expired' | 'expiring_soon'

export interface VendorCompliance {
  gst?: ComplianceChipStatus
  pan?: ComplianceChipStatus
  bankCheque?: ComplianceChipStatus
  insurance?: { status: ComplianceChipStatus; expiryDate?: string | null }
}

export interface Vendor {
  id: string
  name: string
  gstin: string | null
  pan: string | null
  gstStatus: 'Registered' | 'Unregistered'
  website?: string | null
  contactPerson: string
  designation?: string | null
  phone: string
  email: string
  city: string
  state: string
  address: string | null
  pincode?: string | null
  shippingAddress?: string | null
  shippingCity?: string | null
  shippingState?: string | null
  shippingPincode?: string | null
  tags: string[]
  paymentTerms?: string | null
  notes: string | null
  status: 'Active' | 'Inactive'
  /** Performance rating on a 0–5 scale; null when not yet rated. */
  rating: number | null
  activeProjects: number
  totalPayables: number
  createdAt: string
  contacts?: Contact[]
  gstDocument?: VendorComplianceDocument | null
  panDocument?: VendorComplianceDocument | null
  bankChequeDocument?: VendorComplianceDocument | null
  insuranceDocument?: VendorComplianceDocument | null
  activityLog?: ActivityEntry[]
  financialDetails?: VendorFinancialDetails
  documents?: VendorDocument[]
  additionalComplianceDocuments?: VendorAdditionalComplianceDoc[]
  compliance?: VendorCompliance
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface Filters {
  search: string
  status: string
  gstStatus: string
  state: string
}

interface SortConfig {
  field: string | null
  direction: 'asc' | 'desc'
}

interface VendorsState {
  items: Vendor[]
  selectedItem: Vendor | null
  loading: boolean
  saving: boolean
  error: string | null
  pagination: Pagination
  filters: Filters
  sortConfig: SortConfig
}

const initialState: VendorsState = {
  items: [],
  selectedItem: null,
  loading: false,
  saving: false,
  error: null,
  pagination: { page: 1, pageSize: 10, total: 0 },
  filters: { search: '', status: '', gstStatus: '', state: '' },
  sortConfig: { field: null, direction: 'asc' },
}

const vendorsSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<Filters>>) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = { search: state.filters.search, status: state.filters.status, gstStatus: '', state: '' }
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload
    },
    setSortConfig(state, action: PayloadAction<SortConfig>) {
      state.sortConfig = action.payload
    },
    clearSelected(state) {
      state.selectedItem = null
    },
    reset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items ?? []
        state.pagination.total = action.payload.total ?? 0
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.selectedItem = action.payload
      })
      .addCase(createVendor.pending, (state) => {
        state.saving = true
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.saving = false
        state.items.unshift(action.payload)
        state.pagination.total += 1
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateVendor.pending, (state) => {
        state.saving = true
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.items.findIndex((v) => v.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload
        }
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.items = state.items.filter((v) => v.id !== action.payload)
        state.pagination.total -= 1
      })
      .addCase(deleteVendor.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(createVendorContact.fulfilled, (state, action) => {
        const { vendorId, contact } = action.payload
        const idx = state.items.findIndex((v) => v.id === vendorId)
        if (idx !== -1) {
          const vendor = state.items[idx]
          const baseContacts = vendor.contacts?.length
            ? vendor.contacts
            : getVendorContactsList(vendor)
          state.items[idx] = { ...vendor, contacts: [...baseContacts, contact] }
        }
        if (state.selectedItem?.id === vendorId) {
          const vendor = state.selectedItem
          const baseContacts = vendor.contacts?.length
            ? vendor.contacts
            : getVendorContactsList(vendor)
          state.selectedItem = { ...vendor, contacts: [...baseContacts, contact] }
        }
      })
  },
})

export const { setFilters, resetFilters, setPage, setSortConfig, clearSelected, reset } =
  vendorsSlice.actions
export default vendorsSlice.reducer

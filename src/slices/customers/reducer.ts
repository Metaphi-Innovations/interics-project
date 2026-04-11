import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './thunk'

export interface Customer {
  id: string
  name: string
  type: 'Company' | 'Individual'
  gstStatus: 'Registered' | 'Unregistered'
  gstin: string | null
  pan: string | null
  contactPerson: string
  designation?: string | null
  phone: string
  email: string
  city: string
  state: string
  address: string | null
  pincode?: string | null
  tags: string[]
  notes: string | null
  status: 'Active' | 'Inactive'
  activeProjects: number
  totalReceivables: number
  createdAt: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface Filters {
  search: string
  status: string
  type?: string
  gstStatus?: string
  state?: string
}

interface SortConfig {
  field: string | null
  direction: 'asc' | 'desc'
}

interface CustomersState {
  items: Customer[]
  selectedItem: Customer | null
  loading: boolean
  saving: boolean
  error: string | null
  pagination: Pagination
  filters: Filters
  sortConfig: SortConfig
}

const initialState: CustomersState = {
  items: [],
  selectedItem: null,
  loading: false,
  saving: false,
  error: null,
  pagination: { page: 1, pageSize: 10, total: 0 },
  filters: { search: '', status: '' },
  sortConfig: { field: null, direction: 'asc' },
}

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<Filters>>) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = { search: state.filters.search, status: state.filters.status }
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
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.pagination.total = action.payload.total
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.selectedItem = action.payload
      })
      .addCase(createCustomer.pending, (state) => {
        state.saving = true
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.saving = false
        state.items.unshift(action.payload)
        state.pagination.total += 1
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateCustomer.pending, (state) => {
        state.saving = true
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.items.findIndex((c) => c.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload)
        state.pagination.total -= 1
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { setFilters, resetFilters, setPage, setSortConfig, clearSelected, reset } =
  customersSlice.actions
export default customersSlice.reducer

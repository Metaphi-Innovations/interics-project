import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProject,
  changeProjectStatus,
} from './thunk'

export interface Project {
  id: string
  projectCode: string
  name: string
  customerId: string
  customerName: string
  type: 'Design Only' | 'Design & Build'
  status: 'Pitch' | 'Live' | 'Completed' | 'Cancelled' | 'Archived'
  progress: string
  location: string
  carpetArea: number | null
  headcount: number | null
  projectManager: string
  projectManagerId: string
  startDate: string | null
  expectedEndDate: string | null
  projectValue: number
  totalClientPOValue: number
  totalVendorPOValue: number
  invoicedAmount: number
  paidVendorAmount: number
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
  type: string
  projectManager: string
}

interface SortConfig {
  field: string | null
  direction: 'asc' | 'desc'
}

interface ProjectsState {
  items: Project[]
  selectedItem: Project | null
  loading: boolean
  saving: boolean
  error: string | null
  pagination: Pagination
  filters: Filters
  sortConfig: SortConfig
}

const initialState: ProjectsState = {
  items: [],
  selectedItem: null,
  loading: false,
  saving: false,
  error: null,
  pagination: { page: 1, pageSize: 10, total: 0 },
  filters: { search: '', status: '', type: '', projectManager: '' },
  sortConfig: { field: null, direction: 'asc' },
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<Filters>>) {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.page = 1
    },
    resetFilters(state) {
      state.filters = initialState.filters
      state.pagination.page = 1
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
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items ?? []
        state.pagination.total = action.payload.total ?? 0
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.selectedItem = action.payload
      })
      .addCase(createProject.pending, (state) => {
        state.saving = true
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.saving = false
        state.items.unshift(action.payload)
        state.pagination.total += 1
      })
      .addCase(createProject.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateProject.pending, (state) => {
        state.saving = true
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.items.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(changeProjectStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload
        }
      })
  },
})

export const { setFilters, resetFilters, setPage, setSortConfig, clearSelected, reset } = projectsSlice.actions
export default projectsSlice.reducer

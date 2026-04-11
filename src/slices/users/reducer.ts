import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  fetchUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} from './thunk'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'admin' | 'power_user' | 'project_user' | 'viewer'
  status: 'active' | 'inactive'
  assignedProjects: string[]
  lastLogin: string | null
  createdAt: string
  avatar?: string
}

interface UsersState {
  items: User[]
  selectedItem: User | null
  loading: boolean
  saving: boolean
  pagination: { page: number; pageSize: number; total: number }
  filters: { search: string; role: string; status: string }
  sortConfig: { field: string; direction: 'asc' | 'desc' }
  error: string | null
}

const initialState: UsersState = {
  items: [],
  selectedItem: null,
  loading: false,
  saving: false,
  pagination: { page: 1, pageSize: 20, total: 0 },
  filters: { search: '', role: '', status: '' },
  sortConfig: { field: 'name', direction: 'asc' },
  error: null,
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<UsersState['filters']>>) {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.page = 1
    },
    resetFilters(state) {
      state.filters = { search: '', role: '', status: '' }
      state.pagination.page = 1
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload
    },
    setSortConfig(state, action: PayloadAction<{ field: string; direction: 'asc' | 'desc' }>) {
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
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
        state.pagination.total = action.payload.length
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createUser.pending, (state) => {
        state.saving = true
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.saving = false
        state.items.push(action.payload)
        state.pagination.total += 1
      })
      .addCase(createUser.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(updateUser.pending, (state) => {
        state.saving = true
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.items.findIndex((u) => u.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload as string
      })
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u.id !== action.payload)
        state.pagination.total = Math.max(0, state.pagination.total - 1)
      })
  },
})

export const { setFilters, resetFilters, setPage, setSortConfig, clearSelected, reset } =
  usersSlice.actions
export default usersSlice.reducer

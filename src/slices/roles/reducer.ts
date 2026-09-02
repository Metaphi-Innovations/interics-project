import { createSlice } from '@reduxjs/toolkit'
import type { Role } from '../../types/permissions'
import { fetchRoles, createRole, updateRole, deleteRole, toggleRoleStatus } from './thunk'

interface RolesState {
  items: Role[]
  selectedItem: Role | null
  loading: boolean
  saving: boolean
  pagination: { page: number; pageSize: number; total: number }
}

const initialState: RolesState = {
  items: [],
  selectedItem: null,
  loading: false,
  saving: false,
  pagination: { page: 1, pageSize: 10, total: 0 },
}

const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearSelected(state) {
      state.selectedItem = null
    },
    setSelected(state, action: { payload: Role }) {
      state.selectedItem = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => { state.loading = true })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items ?? []
        state.pagination.total = action.payload.total ?? action.payload.items?.length ?? 0
      })
      .addCase(fetchRoles.rejected, (state) => { state.loading = false })

      .addCase(createRole.pending, (state) => { state.saving = true })
      .addCase(createRole.fulfilled, (state, action) => {
        state.saving = false
        state.items.push(action.payload)
        state.pagination.total += 1
      })
      .addCase(createRole.rejected, (state) => { state.saving = false })

      .addCase(updateRole.pending, (state) => { state.saving = true })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.items.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(updateRole.rejected, (state) => { state.saving = false })

      .addCase(toggleRoleStatus.pending, (state) => { state.saving = true })
      .addCase(toggleRoleStatus.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.items.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(toggleRoleStatus.rejected, (state) => { state.saving = false })

      .addCase(deleteRole.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.payload)
        state.pagination.total = Math.max(0, state.pagination.total - 1)
      })
  },
})

export const { clearSelected, setSelected } = rolesSlice.actions
export default rolesSlice.reducer

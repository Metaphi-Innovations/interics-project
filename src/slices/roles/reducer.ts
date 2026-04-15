import { createSlice } from '@reduxjs/toolkit'
import type { Role } from '../../types/permissions'
import { fetchRoles, createRole, updateRole, deleteRole } from './thunk'

interface RolesState {
  items: Role[]
  selectedItem: Role | null
  loading: boolean
  saving: boolean
}

const initialState: RolesState = {
  items: [],
  selectedItem: null,
  loading: false,
  saving: false,
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
        state.items = action.payload
      })
      .addCase(fetchRoles.rejected, (state) => { state.loading = false })

      .addCase(createRole.pending, (state) => { state.saving = true })
      .addCase(createRole.fulfilled, (state, action) => {
        state.saving = false
        state.items.push(action.payload)
      })
      .addCase(createRole.rejected, (state) => { state.saving = false })

      .addCase(updateRole.pending, (state) => { state.saving = true })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.items.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(updateRole.rejected, (state) => { state.saving = false })

      .addCase(deleteRole.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.payload)
      })
  },
})

export const { clearSelected, setSelected } = rolesSlice.actions
export default rolesSlice.reducer

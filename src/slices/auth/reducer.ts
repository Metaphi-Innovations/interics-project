import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { UserPermissions } from '@/types/permissions'
import { clearStoredAuth, getStoredToken, storeAuthSession } from '@/utils/authStorage'
import { loginThunk, logoutThunk, fetchMeThunk } from './thunk'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  /** Source of truth for UI permission checks (V2). */
  permissions?: UserPermissions
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: getStoredToken(),
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload
    },
    clearAuth(state) {
      state.user = null
      state.token = null
      state.error = null
    },
    reset(state) {
      state.loading = false
      state.error = null
    },
    logout(state) {
      state.user = null
      state.token = null
      state.error = null
      clearStoredAuth()
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        storeAuthSession(action.payload.token, action.payload.refreshToken, action.payload.user)
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.token = null
        clearStoredAuth()
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(fetchMeThunk.rejected, (state) => {
        state.user = null
        state.token = null
        clearStoredAuth()
      })
  },
})

export const { setUser, setToken, clearAuth, reset, logout } = authSlice.actions
export default authSlice.reducer

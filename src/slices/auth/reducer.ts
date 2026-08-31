import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { UserPermissions } from '@/types/permissions'
import { clearStoredAuth, getStoredToken, storeAuthSession } from '@/utils/authStorage'
import { loginThunk, logoutThunk, fetchMeThunk, bootstrapAuthThunk } from './thunk'

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
    syncTokensFromRefresh(state, action: PayloadAction<{ token: string }>) {
      state.token = action.payload.token
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
      .addCase(bootstrapAuthThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(bootstrapAuthThunk.fulfilled, (state) => {
        state.loading = false
        state.token = getStoredToken()
      })
      .addCase(bootstrapAuthThunk.rejected, (state) => {
        state.loading = false
        state.user = null
        state.token = null
        state.error = null
      })
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
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.token = null
        state.error = null
        clearStoredAuth()
      })
      .addCase(logoutThunk.rejected, (state) => {
        // Always clear locally even if server logout failed.
        state.loading = false
        state.user = null
        state.token = null
        state.error = null
        clearStoredAuth()
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(fetchMeThunk.rejected, (state, action) => {
        const payload = action.payload as { kind?: string } | string | undefined
        const kind =
          typeof payload === 'object' && payload && 'kind' in payload
            ? payload.kind
            : payload === 'Unauthorized'
              ? 'unauthorized'
              : 'unauthorized'

        // Only definitive auth failure clears the session. Transient /me errors and
        // PERMISSIONS_CHANGED must not force logout.
        if (kind === 'unauthorized') {
          state.user = null
          state.token = null
          clearStoredAuth()
        }
      })
  },
})

export const { setUser, setToken, syncTokensFromRefresh, clearAuth, reset, logout } = authSlice.actions
export default authSlice.reducer

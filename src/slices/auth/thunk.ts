import { createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/authApi'
import {
  mapBackendLoginResponse,
  mapBackendUserToAuthUser,
  unwrapApiData,
} from '@/modules/auth/auth.mapper'
import {
  clearStoredAuth,
  getStoredRefreshToken,
  getStoredToken,
  storeAuthSession,
} from '@/utils/authStorage'

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(data)
      const { token, refreshToken, user } = mapBackendLoginResponse(response.data)
      storeAuthSession(token, refreshToken, user)
      try {
        const meResponse = await authApi.me()
        const me = unwrapApiData(meResponse.data)
        const refreshedUser = mapBackendUserToAuthUser(
          me as Parameters<typeof mapBackendUserToAuthUser>[0],
        )
        storeAuthSession(token, refreshToken, refreshedUser)
        return { token, refreshToken, user: refreshedUser }
      } catch {
        return { token, refreshToken, user }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      return rejectWithValue(
        error.response?.data?.message ?? error.message ?? 'Login failed',
      )
    }
  },
)

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout(getStoredRefreshToken())
  } catch {
    // Session may already be invalid — still clear local auth.
  } finally {
    clearStoredAuth()
  }
})

export const fetchMeThunk = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.me()
      const user = unwrapApiData(response.data)
      const mappedUser = mapBackendUserToAuthUser(user as Parameters<typeof mapBackendUserToAuthUser>[0])
      const token = getStoredToken()
      if (token) {
        storeAuthSession(token, getStoredRefreshToken(), mappedUser)
      }
      return mappedUser
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { code?: string } } }
      const status = error.response?.status
      const code = error.response?.data?.code

      // Stale permissions after refresh: keep tokens; next API can refresh again.
      if (status === 401 && code === 'PERMISSIONS_CHANGED') {
        return rejectWithValue({ kind: 'stale' as const })
      }

      // Definitive auth failure — clear local session.
      if (status === 401 || status === 403) {
        clearStoredAuth()
        return rejectWithValue({ kind: 'unauthorized' as const })
      }

      // Network / 5xx — preserve valid authentication.
      return rejectWithValue({ kind: 'transient' as const })
    }
  },
)

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
      const error = err as { response?: { status?: number } }
      if (error.response?.status === 401) {
        clearStoredAuth()
      }
      return rejectWithValue('Unauthorized')
    }
  },
)

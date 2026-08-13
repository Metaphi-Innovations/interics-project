import { createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/authApi'
import {
  mapBackendLoginResponse,
  mapBackendUserToAuthUser,
  unwrapApiData,
} from '@/modules/auth/auth.mapper'

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(data)
      const { token, user } = mapBackendLoginResponse(response.data)
      localStorage.setItem('auth_token', token)
      return { token, user }
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
    await authApi.logout()
  } finally {
    localStorage.removeItem('auth_token')
  }
})

export const fetchMeThunk = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.me()
      const user = unwrapApiData(response.data)
      return mapBackendUserToAuthUser(user as Parameters<typeof mapBackendUserToAuthUser>[0])
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } }
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
      }
      return rejectWithValue('Unauthorized')
    }
  },
)

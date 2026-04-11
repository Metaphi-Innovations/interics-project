import { createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/authApi'

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(data)
      const { token, user } = response.data
      localStorage.setItem('auth_token', token)
      return { token, user }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        error.response?.data?.message ?? 'Login failed'
      )
    }
  }
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
      return response.data
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } }
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
      }
      return rejectWithValue('Unauthorized')
    }
  }
)

import { describe, expect, it, vi, beforeEach } from 'vitest'

const clearStoredAuth = vi.fn()
const getStoredRefreshToken = vi.fn(() => 'refresh-abc')
const logoutApi = vi.fn()

vi.mock('@/utils/authStorage', () => ({
  clearStoredAuth: () => clearStoredAuth(),
  getStoredRefreshToken: () => getStoredRefreshToken(),
  getStoredToken: () => 'access-abc',
  storeAuthSession: vi.fn(),
}))

vi.mock('../../api/authApi', () => ({
  authApi: {
    logout: (...args: unknown[]) => logoutApi(...args),
    login: vi.fn(),
    me: vi.fn(),
  },
}))

import { logoutThunk } from '@/slices/auth/thunk'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/slices/auth/reducer'

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { id: '1', name: 'A', email: 'a@b.com', role: 'ADMIN', avatar: null },
        token: 'access-abc',
        loading: false,
        error: null,
      },
    },
  })
}

describe('logoutThunk', () => {
  beforeEach(() => {
    clearStoredAuth.mockClear()
    logoutApi.mockReset()
    getStoredRefreshToken.mockReturnValue('refresh-abc')
  })

  it('calls backend logout, clears local auth', async () => {
    logoutApi.mockResolvedValueOnce({ data: { success: true } })
    const store = makeStore()
    await store.dispatch(logoutThunk())

    expect(logoutApi).toHaveBeenCalledWith('refresh-abc')
    expect(clearStoredAuth).toHaveBeenCalled()
    expect(store.getState().auth.user).toBeNull()
    expect(store.getState().auth.token).toBeNull()
  })

  it('still clears local auth when server logout fails', async () => {
    logoutApi.mockRejectedValueOnce(new Error('already invalid'))
    const store = makeStore()
    await store.dispatch(logoutThunk())

    expect(logoutApi).toHaveBeenCalled()
    expect(clearStoredAuth).toHaveBeenCalled()
    expect(store.getState().auth.user).toBeNull()
    expect(store.getState().auth.token).toBeNull()
  })
})

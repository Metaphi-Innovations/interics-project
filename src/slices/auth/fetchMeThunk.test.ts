import { describe, expect, it, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'

const mocks = vi.hoisted(() => ({
  clearStoredAuth: vi.fn(),
  getStoredToken: vi.fn(() => 'access-abc'),
  getStoredRefreshToken: vi.fn(() => 'refresh-abc'),
  storeAuthSession: vi.fn(),
  meApi: vi.fn(),
}))

vi.mock('@/utils/authStorage', () => ({
  clearStoredAuth: () => mocks.clearStoredAuth(),
  getStoredToken: () => mocks.getStoredToken(),
  getStoredRefreshToken: () => mocks.getStoredRefreshToken(),
  storeAuthSession: (...args: unknown[]) => mocks.storeAuthSession(...args),
}))

vi.mock('../../api/authApi', () => ({
  authApi: {
    me: (...args: unknown[]) => mocks.meApi(...args),
    login: vi.fn(),
    logout: vi.fn(),
  },
}))

vi.mock('@/modules/auth/auth.mapper', () => ({
  unwrapApiData: (payload: unknown) => {
    const record = payload as { data?: unknown }
    return record?.data ?? payload
  },
  mapBackendUserToAuthUser: (user: { id: string; email: string }) => ({
    id: user.id,
    name: 'User',
    email: user.email,
    role: 'ADMIN',
    avatar: null,
    permissions: { VIEW: true },
  }),
  mapBackendLoginResponse: vi.fn(),
}))

import authReducer from '@/slices/auth/reducer'
import { fetchMeThunk } from '@/slices/auth/thunk'

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

describe('fetchMeThunk auth preservation', () => {
  beforeEach(() => {
    mocks.clearStoredAuth.mockClear()
    mocks.meApi.mockReset()
    mocks.storeAuthSession.mockClear()
    mocks.getStoredToken.mockReturnValue('access-abc')
  })

  it('network /me failure does not clear authentication', async () => {
    mocks.meApi.mockRejectedValueOnce({ message: 'Network Error' })
    const store = makeStore()
    await store.dispatch(fetchMeThunk())

    expect(mocks.clearStoredAuth).not.toHaveBeenCalled()
    expect(store.getState().auth.token).toBe('access-abc')
    expect(store.getState().auth.user?.id).toBe('1')
  })

  it('PERMISSIONS_CHANGED on /me does not clear authentication', async () => {
    mocks.meApi.mockRejectedValueOnce({
      response: { status: 401, data: { code: 'PERMISSIONS_CHANGED' } },
    })
    const store = makeStore()
    await store.dispatch(fetchMeThunk())

    expect(mocks.clearStoredAuth).not.toHaveBeenCalled()
    expect(store.getState().auth.token).toBe('access-abc')
  })

  it('definitive 401 on /me clears authentication', async () => {
    mocks.meApi.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Session expired or revoked' } },
    })
    const store = makeStore()
    await store.dispatch(fetchMeThunk())

    expect(mocks.clearStoredAuth).toHaveBeenCalled()
    expect(store.getState().auth.token).toBeNull()
    expect(store.getState().auth.user).toBeNull()
  })
})

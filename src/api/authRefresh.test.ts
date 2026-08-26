import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from './config'

const storage = new Map<string, string>()

vi.mock('@/utils/authStorage', () => ({
  getStoredToken: () => storage.get('auth_token') ?? null,
  getStoredRefreshToken: () => storage.get('auth_refresh_token') ?? null,
  getStoredUserJson: () => storage.get('ids_user') ?? null,
  storeAuthSession: (token: string, refreshToken: string | null, user: unknown) => {
    storage.set('auth_token', token)
    if (refreshToken) storage.set('auth_refresh_token', refreshToken)
    storage.set('ids_user', JSON.stringify(user))
  },
  clearStoredAuth: () => {
    storage.clear()
  },
}))

import {
  __resetRefreshMutexForTests,
  classifyRefreshFailure,
  refreshAuthSessionSingleFlight,
  shouldAttemptRefresh,
  redirectToLogin,
} from './authRefresh'
import type { AxiosError } from 'axios'

const base = API_BASE_URL.replace(/\/$/, '')

let refreshHits = 0
let refreshHandler: () => Response | Promise<Response> = () =>
  HttpResponse.json({
    success: true,
    data: {
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
    },
  })

const server = setupServer(
  http.post(`${base}/auth/refresh`, async () => {
    refreshHits += 1
    return refreshHandler()
  }),
)

describe('authRefresh single-flight + rotation', () => {
  beforeEach(() => {
    storage.clear()
    storage.set('auth_token', 'access-old')
    storage.set('auth_refresh_token', 'refresh-old')
    storage.set('ids_user', JSON.stringify({ id: 'u1', email: 'a@b.com' }))
    refreshHits = 0
    refreshHandler = () =>
      HttpResponse.json({
        success: true,
        data: {
          accessToken: 'access-new',
          refreshToken: 'refresh-new',
        },
      })
    __resetRefreshMutexForTests()
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    server.close()
    __resetRefreshMutexForTests()
  })

  it('refresh succeeds → stores new access and refresh (old refresh not kept)', async () => {
    const tokens = await refreshAuthSessionSingleFlight()
    expect(tokens).toEqual({ accessToken: 'access-new', refreshToken: 'refresh-new' })
    expect(storage.get('auth_token')).toBe('access-new')
    expect(storage.get('auth_refresh_token')).toBe('refresh-new')
    expect(storage.get('auth_refresh_token')).not.toBe('refresh-old')
    expect(refreshHits).toBe(1)
  })

  it('concurrent callers → refresh endpoint called exactly ONCE', async () => {
    refreshHandler = async () => {
      await new Promise((r) => setTimeout(r, 40))
      return HttpResponse.json({
        success: true,
        data: { accessToken: 'access-new', refreshToken: 'refresh-new' },
      })
    }

    const [a, b, c] = await Promise.all([
      refreshAuthSessionSingleFlight(),
      refreshAuthSessionSingleFlight(),
      refreshAuthSessionSingleFlight(),
    ])

    expect(refreshHits).toBe(1)
    expect(a.accessToken).toBe('access-new')
    expect(b.accessToken).toBe('access-new')
    expect(c.accessToken).toBe('access-new')
    expect(a.refreshToken).toBe('refresh-new')
  })

  it('refresh auth failure (401) → classify authentication', () => {
    const err = {
      response: { status: 401 },
      isAxiosError: true,
    } as AxiosError
    expect(classifyRefreshFailure(err)).toBe('authentication')
  })

  it('refresh token expired / revoked (401) → authentication', () => {
    expect(classifyRefreshFailure({ response: { status: 401 } })).toBe('authentication')
    expect(classifyRefreshFailure({ response: { status: 403 } })).toBe('authentication')
  })

  it('network failure → classify network (do not treat as definitive logout)', () => {
    expect(classifyRefreshFailure({ message: 'Network Error' })).toBe('network')
    expect(classifyRefreshFailure({ response: { status: 503 } })).toBe('network')
  })

  it('refresh fails → promise rejects for all waiters; hits = 1', async () => {
    refreshHandler = () =>
      HttpResponse.json({ success: false, message: 'Invalid refresh token' }, { status: 401 })

    const results = await Promise.allSettled([
      refreshAuthSessionSingleFlight(),
      refreshAuthSessionSingleFlight(),
      refreshAuthSessionSingleFlight(),
    ])

    expect(refreshHits).toBe(1)
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
  })

  it('shouldAttemptRefresh skips login/refresh/logout and already-retried', () => {
    const baseErr = {
      response: { status: 401 },
      config: { url: '/projects' },
    } as AxiosError

    expect(shouldAttemptRefresh(baseErr, false)).toBe(true)
    expect(shouldAttemptRefresh(baseErr, true)).toBe(false)
    expect(
      shouldAttemptRefresh({ ...baseErr, config: { url: '/auth/login' } } as AxiosError, false),
    ).toBe(false)
    expect(
      shouldAttemptRefresh({ ...baseErr, config: { url: '/auth/refresh' } } as AxiosError, false),
    ).toBe(false)
    expect(
      shouldAttemptRefresh({ ...baseErr, config: { url: '/auth/logout' } } as AxiosError, false),
    ).toBe(false)
  })

  it('redirectToLogin clears auth and goes to /login (not /dashboard)', () => {
    const hrefSetter = vi.fn()
    vi.stubGlobal('window', {
      location: {
        pathname: '/projects',
        set href(v: string) {
          hrefSetter(v)
        },
        get href() {
          return ''
        },
      },
    })

    redirectToLogin()
    expect(storage.size).toBe(0)
    expect(hrefSetter).toHaveBeenCalledWith('/login')

    // Concurrent callers must not navigate repeatedly
    redirectToLogin()
    expect(hrefSetter).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})

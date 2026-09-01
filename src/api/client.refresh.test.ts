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

import client from './client'
import { __resetRefreshMutexForTests } from './authRefresh'

const base = API_BASE_URL.replace(/\/$/, '')

let refreshHits = 0
let resourceHits = 0
let resourceAuthHeaders: Array<string | undefined> = []
let failFirstThenSucceed = true
let refreshMode: 'ok' | 'auth-fail' | 'network-fail' = 'ok'
const hrefSetter = vi.fn()

const server = setupServer(
  http.post(`${base}/auth/refresh`, async () => {
    refreshHits += 1
    if (refreshMode === 'auth-fail') {
      return HttpResponse.json({ success: false }, { status: 401 })
    }
    if (refreshMode === 'network-fail') {
      return HttpResponse.error()
    }
    await new Promise((r) => setTimeout(r, 30))
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'access-rotated',
        refreshToken: 'refresh-rotated',
      },
    })
  }),
  http.get(`${base}/resource`, ({ request }) => {
    resourceHits += 1
    const auth = request.headers.get('Authorization') ?? undefined
    resourceAuthHeaders.push(auth)

    if (failFirstThenSucceed && auth === 'Bearer access-expired') {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    if (auth === 'Bearer access-rotated' || !failFirstThenSucceed) {
      return HttpResponse.json({ ok: true, via: auth })
    }
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }),
)

describe('axios client single-flight refresh + retry', () => {
  beforeEach(() => {
    storage.clear()
    storage.set('auth_token', 'access-expired')
    storage.set('auth_refresh_token', 'refresh-old')
    storage.set('ids_user', JSON.stringify({ id: 'u1' }))
    refreshHits = 0
    resourceHits = 0
    resourceAuthHeaders = []
    failFirstThenSucceed = true
    refreshMode = 'ok'
    hrefSetter.mockClear()
    __resetRefreshMutexForTests()
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
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    server.close()
    __resetRefreshMutexForTests()
    vi.unstubAllGlobals()
  })

  it('A/B/C → 401 → ONE refresh → all retry with new access token', async () => {
    const [a, b, c] = await Promise.all([
      client.get('/resource'),
      client.get('/resource'),
      client.get('/resource'),
    ])

    // Refresh requests: Expected = 1, Actual = refreshHits
    expect(refreshHits).toBe(1)

    expect(a.data.ok).toBe(true)
    expect(b.data.ok).toBe(true)
    expect(c.data.ok).toBe(true)

    const retryAuths = resourceAuthHeaders.filter((h) => h === 'Bearer access-rotated')
    expect(retryAuths.length).toBe(3)
    expect(storage.get('auth_token')).toBe('access-rotated')
    expect(storage.get('auth_refresh_token')).toBe('refresh-rotated')
    expect(storage.get('auth_refresh_token')).not.toBe('refresh-old')
  })

  it('A/B/C → 401 → one refresh fails → all fail; auth cleared once; one redirect', async () => {
    refreshMode = 'auth-fail'

    const results = await Promise.allSettled([
      client.get('/resource'),
      client.get('/resource'),
      client.get('/resource'),
    ])

    expect(refreshHits).toBe(1)
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(hrefSetter).toHaveBeenCalledTimes(1)
    expect(hrefSetter).toHaveBeenCalledWith('/login')
    expect(storage.size).toBe(0)
  })

  it('401 → refresh → retry → still 401 → no second refresh; redirect once', async () => {
    failFirstThenSucceed = false
    server.use(
      http.get(`${base}/resource`, () => {
        resourceHits += 1
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }),
    )

    await expect(client.get('/resource')).rejects.toBeTruthy()
    expect(refreshHits).toBe(1)
    expect(resourceHits).toBe(2) // original + one retry
    expect(hrefSetter).toHaveBeenCalledTimes(1)
    expect(hrefSetter).toHaveBeenCalledWith('/login')
  })

  it('401 PERMISSIONS_CHANGED → refresh → retry still PERMISSIONS_CHANGED → no loop, no logout', async () => {
    server.use(
      http.get(`${base}/resource`, () => {
        resourceHits += 1
        return HttpResponse.json(
          { success: false, code: 'PERMISSIONS_CHANGED' },
          { status: 401 },
        )
      }),
    )

    await expect(client.get('/resource')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(refreshHits).toBe(1)
    expect(resourceHits).toBe(2)
    expect(hrefSetter).not.toHaveBeenCalled()
    expect(storage.get('auth_token')).toBe('access-rotated')
  })

  it('PERMISSIONS_CHANGED 401 → refresh once → retry; no logout redirect', async () => {
    server.use(
      http.get(`${base}/resource`, ({ request }) => {
        resourceHits += 1
        const auth = request.headers.get('Authorization') ?? undefined
        resourceAuthHeaders.push(auth)
        if (auth === 'Bearer access-expired') {
          return HttpResponse.json(
            { success: false, message: 'Permissions have changed', code: 'PERMISSIONS_CHANGED' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ ok: true })
      }),
    )

    const res = await client.get('/resource')
    expect(res.data.ok).toBe(true)
    expect(refreshHits).toBe(1)
    expect(hrefSetter).not.toHaveBeenCalled()
    expect(storage.get('auth_token')).toBe('access-rotated')
  })

  it('A/B/C concurrent PERMISSIONS_CHANGED → exactly ONE refresh', async () => {
    server.use(
      http.get(`${base}/resource`, ({ request }) => {
        resourceHits += 1
        const auth = request.headers.get('Authorization') ?? undefined
        resourceAuthHeaders.push(auth)
        if (auth === 'Bearer access-expired') {
          return HttpResponse.json(
            { success: false, code: 'PERMISSIONS_CHANGED' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ ok: true, via: auth })
      }),
    )

    const [a, b, c] = await Promise.all([
      client.get('/resource'),
      client.get('/resource'),
      client.get('/resource'),
    ])

    expect(refreshHits).toBe(1)
    expect(a.data.ok && b.data.ok && c.data.ok).toBe(true)
    expect(hrefSetter).not.toHaveBeenCalled()
  })

  it('403 insufficient permission → no refresh and no logout', async () => {
    storage.set('auth_token', 'access-fresh')
    server.use(
      http.get(`${base}/resource`, () =>
        HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 }),
      ),
    )

    await expect(client.get('/resource')).rejects.toMatchObject({
      response: { status: 403 },
    })
    expect(refreshHits).toBe(0)
    expect(hrefSetter).not.toHaveBeenCalled()
    expect(storage.get('auth_token')).toBe('access-fresh')
  })
})

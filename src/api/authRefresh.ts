import axios, { type AxiosError } from 'axios'
import { API_BASE_URL } from './config'
import {
  clearStoredAuth,
  getStoredRefreshToken,
  getStoredToken,
  getStoredUserJson,
  storeAuthSession,
} from '@/utils/authStorage'
import { unwrapApiData } from '@/modules/auth/auth.mapper'

export type RefreshedTokens = {
  accessToken: string
  refreshToken: string
}

type RefreshApiData = {
  accessToken?: string
  refreshToken?: string
  token?: string
  user?: unknown
}

/** Bare client — must NOT use the app interceptor (avoids refresh recursion). */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let inflightRefresh: Promise<RefreshedTokens> | null = null

let onTokensRefreshed: ((tokens: RefreshedTokens) => void) | null = null

/** Prevent concurrent 401 waiters from each forcing a navigation. */
let redirectScheduled = false

/** Optional hook so Redux /me can refresh UI permissions after rotation. */
export function setOnTokensRefreshed(listener: ((tokens: RefreshedTokens) => void) | null): void {
  onTokensRefreshed = listener
}

function parseRefreshResponse(payload: unknown): RefreshedTokens {
  const data = unwrapApiData<RefreshApiData>(payload)
  const accessToken = data.accessToken ?? data.token
  const refreshToken = data.refreshToken
  if (!accessToken || !refreshToken) {
    throw new Error('Refresh response did not include access and refresh tokens')
  }
  return { accessToken, refreshToken }
}

function persistRotatedTokens(tokens: RefreshedTokens): void {
  let user: unknown = null
  const raw = getStoredUserJson()
  if (raw) {
    try {
      user = JSON.parse(raw)
    } catch {
      user = null
    }
  }
  storeAuthSession(tokens.accessToken, tokens.refreshToken, user)
}

/**
 * Perform refresh with credentials (httpOnly cookies).
 * May also send sessionStorage refresh in the body as a same-tab fallback;
 * the backend prefers the cookie when present so multi-tab rotation stays safe.
 */
async function executeRefresh(): Promise<RefreshedTokens> {
  const storedRefresh = getStoredRefreshToken()
  const response = await refreshClient.post(
    '/auth/refresh',
    storedRefresh ? { refreshToken: storedRefresh } : {},
  )
  const tokens = parseRefreshResponse(response.data)
  persistRotatedTokens(tokens)
  onTokensRefreshed?.(tokens)
  return tokens
}

/**
 * Single-flight refresh: concurrent callers share one promise.
 */
export function refreshAuthSessionSingleFlight(): Promise<RefreshedTokens> {
  if (!inflightRefresh) {
    inflightRefresh = executeRefresh().finally(() => {
      inflightRefresh = null
    })
  }
  return inflightRefresh
}

/** Test helper — reset mutex between tests. */
export function __resetRefreshMutexForTests(): void {
  inflightRefresh = null
  onTokensRefreshed = null
  redirectScheduled = false
}

export function isAuthRefreshInFlight(): boolean {
  return inflightRefresh != null
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  if (path === '/login' || path.startsWith('/login/') || path === '/forgot-password') {
    return
  }
  if (redirectScheduled) return
  redirectScheduled = true
  clearStoredAuth()
  window.location.href = '/login'
}

export function shouldAttemptRefresh(error: AxiosError, alreadyRetried: boolean): boolean {
  if (alreadyRetried) return false
  if (error.response?.status !== 401) return false
  const url = String(error.config?.url ?? '')
  if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/forgot-password') || url.includes('/auth/logout')) {
    return false
  }
  // Need either a Bearer token or cookies from a prior login.
  return Boolean(getStoredToken() || getStoredRefreshToken())
}

export type AuthFailureKind = 'authentication' | 'network' | 'unknown'

export function classifyRefreshFailure(error: unknown): AuthFailureKind {
  const axiosError = error as AxiosError | undefined
  if (!axiosError?.response) {
    // No response → network / timeout — do not treat as definitive session death
    // unless we have no way to continue; caller decides.
    return 'network'
  }
  const status = axiosError.response.status
  if (status === 401 || status === 403) return 'authentication'
  if (status >= 500) return 'network'
  return 'unknown'
}

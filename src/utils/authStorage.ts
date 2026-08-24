const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token'
const AUTH_USER_KEY = 'ids_user'

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

function clearLegacyLocalStorage(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
}

export function getStoredToken(): string | null {
  return getSessionStorage()?.getItem(AUTH_TOKEN_KEY) ?? null
}

export function getStoredRefreshToken(): string | null {
  return getSessionStorage()?.getItem(AUTH_REFRESH_TOKEN_KEY) ?? null
}

export function getStoredUserJson(): string | null {
  return getSessionStorage()?.getItem(AUTH_USER_KEY) ?? null
}

export function storeAuthSession(token: string, refreshToken: string | null, user: unknown): void {
  const storage = getSessionStorage()
  if (!storage) return

  clearLegacyLocalStorage()
  storage.setItem(AUTH_TOKEN_KEY, token)
  if (refreshToken) storage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken)
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth(): void {
  const storage = getSessionStorage()
  storage?.removeItem(AUTH_TOKEN_KEY)
  storage?.removeItem(AUTH_REFRESH_TOKEN_KEY)
  storage?.removeItem(AUTH_USER_KEY)
  clearLegacyLocalStorage()
}

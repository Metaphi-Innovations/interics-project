import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from './config'
import { getStoredToken } from '@/utils/authStorage'
import {
  classifyRefreshFailure,
  redirectToLogin,
  refreshAuthSessionSingleFlight,
  shouldAttemptRefresh,
} from './authRefresh'

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

type RetriableConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean
}

function getApiErrorCode(error: AxiosError): string | undefined {
  const data = error.response?.data as { code?: string } | undefined
  return typeof data?.code === 'string' ? data.code : undefined
}

client.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    if (!config) {
      return Promise.reject(error)
    }

    const alreadyRetried = Boolean(config._authRetry)

    if (!shouldAttemptRefresh(error, alreadyRetried)) {
      // Second 401 after a successful refresh: only logout for real session death.
      // PERMISSIONS_CHANGED again means another admin bump — fail the request; next
      // user action can refresh once more (no infinite loop on this request).
      if (
        alreadyRetried &&
        error.response?.status === 401 &&
        getApiErrorCode(error) !== 'PERMISSIONS_CHANGED'
      ) {
        redirectToLogin()
      }
      return Promise.reject(error)
    }

    try {
      const tokens = await refreshAuthSessionSingleFlight()
      config._authRetry = true
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${tokens.accessToken}`
      return client.request(config)
    } catch (refreshError) {
      const kind = classifyRefreshFailure(refreshError)
      if (kind === 'authentication' || kind === 'unknown') {
        redirectToLogin()
      }
      return Promise.reject(refreshError)
    }
  },
)

export default client

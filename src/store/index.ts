import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../slices/auth/reducer'
import type { AuthUser } from '../slices/auth/reducer'
import { makeFullUserPermissions } from '@/types/permissions'
import customersReducer from '../slices/customers/reducer'
import vendorsReducer from '../slices/vendors/reducer'
import projectsReducer from '../slices/projects/reducer'
import pitchReducer from '../slices/pitch/reducer'
import baselineReducer from '../slices/baseline/reducer'
import usersReducer from '../slices/users/reducer'
import rolesReducer from '../slices/roles/reducer'
import settingsReducer from '../slices/settings/reducer'
import categoriesReducer from '../slices/categories/reducer'
import liveReducer from '../slices/live/reducer'
import receivablesReducer from '../slices/receivables/reducer'
import complianceReducer from '../slices/compliance/reducer'
import financeReducer from '../slices/finance/reducer'
import transitionReducer from '../slices/transition/reducer'

/** Dev session when auth UI is disabled — matches mock `/api/auth/login` admin user. */
const DEV_TOKEN = 'mock-jwt-token-admin'
const DEV_USER: AuthUser = {
  id: 'u-001',
  name: 'Rajan Mehta',
  email: 'admin@interics.com',
  role: 'r-001',
  avatar: null,
  permissions: makeFullUserPermissions(),
}

const savedToken = localStorage.getItem('auth_token')
const savedUserRaw = localStorage.getItem('ids_user')
let savedUser: AuthUser | null = null
try {
  savedUser = savedUserRaw ? (JSON.parse(savedUserRaw) as AuthUser) : null
} catch {
  savedUser = null
}

const usePersistedSession = Boolean(savedToken && savedUser)

if (!usePersistedSession) {
  localStorage.setItem('auth_token', DEV_TOKEN)
  localStorage.setItem('ids_user', JSON.stringify(DEV_USER))
}

const preloadedState = {
  auth: {
    user: usePersistedSession ? savedUser! : DEV_USER,
    token: usePersistedSession ? savedToken! : DEV_TOKEN,
    loading: false,
    error: null,
  },
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customersReducer,
    vendors: vendorsReducer,
    projects: projectsReducer,
    pitch: pitchReducer,
    baseline: baselineReducer,
    users: usersReducer,
    roles: rolesReducer,
    settings: settingsReducer,
    categories: categoriesReducer,
    live: liveReducer,
    receivables: receivablesReducer,
    compliance: complianceReducer,
    finance: financeReducer,
    transition: transitionReducer,
  },
  preloadedState,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

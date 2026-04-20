import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../slices/auth/reducer'
import type { AuthUser } from '../slices/auth/reducer'
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

const savedToken = localStorage.getItem('auth_token')
const savedUserRaw = localStorage.getItem('ids_user')
let savedUser: AuthUser | null = null
try {
  savedUser = savedUserRaw ? (JSON.parse(savedUserRaw) as AuthUser) : null
} catch {
  savedUser = null
}

const usePersistedSession = Boolean(savedToken && savedUser)

const preloadedState = {
  auth: {
    user: usePersistedSession ? savedUser! : null,
    token: usePersistedSession ? savedToken! : null,
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

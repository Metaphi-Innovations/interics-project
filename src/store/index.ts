import { configureStore } from '@reduxjs/toolkit'
import authReducer, { syncTokensFromRefresh } from '../slices/auth/reducer'
import type { AuthUser } from '../slices/auth/reducer'
import { bootstrapAuthThunk, fetchMeThunk } from '../slices/auth/thunk'
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
import { getStoredToken, getStoredUserJson } from '@/utils/authStorage'
import { setOnTokensRefreshed } from '@/api/authRefresh'

const savedToken = getStoredToken()
const savedUserRaw = getStoredUserJson()
let savedUser: AuthUser | null = null
try {
  savedUser = savedUserRaw ? (JSON.parse(savedUserRaw) as AuthUser) : null
} catch {
  savedUser = null
}

const usePersistedSession = Boolean(savedToken && savedUser)
const needsBootstrap = !usePersistedSession

const preloadedState = {
  auth: {
    user: usePersistedSession ? savedUser! : null,
    token: usePersistedSession ? savedToken! : null,
    loading: needsBootstrap,
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

// After access/refresh rotation: sync Redux token and reload UI permission tree once.
setOnTokensRefreshed((tokens) => {
  store.dispatch(syncTokensFromRefresh({ token: tokens.accessToken }))
  void store.dispatch(fetchMeThunk())
})

if (needsBootstrap && typeof window !== 'undefined') {
  void store.dispatch(bootstrapAuthThunk())
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

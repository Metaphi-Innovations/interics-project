import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../slices/auth/reducer'
import type { AuthUser } from '../slices/auth/reducer'
import customersReducer from '../slices/customers/reducer'
import vendorsReducer from '../slices/vendors/reducer'
import projectsReducer from '../slices/projects/reducer'
import pitchReducer from '../slices/pitch/reducer'
import baselineReducer from '../slices/baseline/reducer'
import usersReducer from '../slices/users/reducer'
import settingsReducer from '../slices/settings/reducer'
import categoriesReducer from '../slices/categories/reducer'
import liveReducer from '../slices/live/reducer'

const savedToken = localStorage.getItem('auth_token')
const savedUserRaw = localStorage.getItem('ids_user')
let savedUser: AuthUser | null = null
try {
  savedUser = savedUserRaw ? (JSON.parse(savedUserRaw) as AuthUser) : null
} catch {
  savedUser = null
}

const preloadedState =
  savedToken && savedUser
    ? { auth: { user: savedUser, token: savedToken, loading: false, error: null } }
    : undefined

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customersReducer,
    vendors: vendorsReducer,
    projects: projectsReducer,
    pitch: pitchReducer,
    baseline: baselineReducer,
    users: usersReducer,
    settings: settingsReducer,
    categories: categoriesReducer,
    live: liveReducer,
  },
  preloadedState,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

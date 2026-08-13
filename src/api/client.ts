import axios from 'axios'
import { API_BASE_URL } from './config'

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor — attach auth token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('auth_token')
      // Only hard-redirect for expired sessions, not failed login attempts
      if (token) {
        localStorage.removeItem('auth_token')
        window.location.href = '/dashboard'
      }
    }
    return Promise.reject(error)
  }
)

export default client

/**
 * Central API base URL for the browser client.
 * Must point at the backend directly (no Vite proxy).
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3000/api/v1'

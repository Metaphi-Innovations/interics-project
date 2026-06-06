/**
 * Logo URL (`/public` root). Example: `/logo-mark.png` → `public/logo-mark.png`.
 */
export const AUTH_LOGO_SRC = '/logo-mark.png'

/**
 * When true, the image is a full lockup (icon + wordmark). Hide the separate
 * `AUTH_PRODUCT_NAME` label beside the image. Set false for a mark-only asset.
 */
export const AUTH_LOGO_IS_FULL_LOCKUP = false

export const AUTH_PRODUCT_NAME = 'INTERICS'

export const AUTH_HEADLINE = 'Project Accounts Tracking'

/** Feature highlights on the auth branding panel. */
export const AUTH_FEATURE_HIGHLIGHTS = [
  'Project Management',
  'Receivables & Payables Tracking',
  'Compliance Monitoring',
  'Reports & Analytics',
] as const

export const REMEMBER_EMAIL_KEY = 'interics:auth-remember'
export const SAVED_EMAIL_KEY = 'interics:auth-email'

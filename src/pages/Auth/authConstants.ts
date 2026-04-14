/**
 * Logo URL (`/public` root). Example: `/logo-full.png` → `public/logo-full.png`.
 */
export const AUTH_LOGO_SRC = '/logo-full.png'

/**
 * When true, the image is a full lockup (icon + wordmark). Hide the separate
 * `AUTH_PRODUCT_NAME` label beside the image. Set false for a mark-only asset.
 */
export const AUTH_LOGO_IS_FULL_LOCKUP = true

export const AUTH_PRODUCT_NAME = 'INTERICS'

export const AUTH_HEADLINE = 'Project Accounts Tracking'

/** Short pillars shown in the branding panel (middle-dot separators). */
export const AUTH_TAGLINE_PILLARS = ['Projects', 'Compliance', 'Reporting'] as const

/** Support contact for “Need help?” — mailto: link */
export const AUTH_SUPPORT_MAILTO = 'mailto:support@interics.example?subject=Account%20help'

export const REMEMBER_EMAIL_KEY = 'interics:auth-remember'
export const SAVED_EMAIL_KEY = 'interics:auth-email'

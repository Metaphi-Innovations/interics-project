import type { VendorListParams, VendorListResult } from './vendors.types'

/** Active Contacts badge: complete-profile, non-deleted vendors. */
export const VENDOR_ACTIVE_TAB_COUNT_PARAMS: VendorListParams = {
  page: 1,
  limit: 1,
  profileStatus: 'complete',
}

/**
 * Pending Contacts badge: pending profile, non-deleted vendors.
 * Matches Vendors → Pending Contacts list (`profileStatus=pending`).
 * Uses limit=1 so the badge is driven by `total`, not paginated rows.
 */
export const VENDOR_PENDING_TAB_COUNT_PARAMS: VendorListParams = {
  page: 1,
  limit: 1,
  profileStatus: 'pending',
}

export type VendorTabCounts = {
  active: number
  pending: number
}

export async function fetchVendorTabCounts(
  getAll: (params?: VendorListParams) => Promise<VendorListResult>,
): Promise<VendorTabCounts> {
  const [activeRes, pendingRes] = await Promise.all([
    getAll({ ...VENDOR_ACTIVE_TAB_COUNT_PARAMS }),
    getAll({ ...VENDOR_PENDING_TAB_COUNT_PARAMS }),
  ])

  return {
    active: activeRes.total,
    pending: pendingRes.total,
  }
}

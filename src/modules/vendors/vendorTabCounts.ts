import type { VendorListParams, VendorListResult } from './vendors.types'

/** Active Contacts badge: all non-deleted vendors (existing convention). */
export const VENDOR_ACTIVE_TAB_COUNT_PARAMS: VendorListParams = {
  page: 1,
  limit: 1,
}

/**
 * Pending Contacts badge: inactive, non-deleted vendors.
 * Matches Vendors → Pending Contacts list (`status: Inactive` → `isActive=false`).
 * Uses limit=1 so the badge is driven by `total`, not paginated rows.
 */
export const VENDOR_PENDING_TAB_COUNT_PARAMS: VendorListParams = {
  page: 1,
  limit: 1,
  isActive: false,
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

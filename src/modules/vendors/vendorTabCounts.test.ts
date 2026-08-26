import { describe, expect, it, vi } from 'vitest'
import type { VendorListParams, VendorListResult } from '@/modules/vendors/vendors.types'
import {
  VENDOR_ACTIVE_TAB_COUNT_PARAMS,
  VENDOR_PENDING_TAB_COUNT_PARAMS,
  fetchVendorTabCounts,
} from '@/modules/vendors/vendorTabCounts'

function emptyResult(total: number): VendorListResult {
  return { items: [], total, page: 1, pageSize: 1 }
}

describe('fetchVendorTabCounts (Pending Contacts badge)', () => {
  it('requests pending total with profileStatus=pending and uses API total (not page rows)', async () => {
    const calls: VendorListParams[] = []
    const getAll = vi.fn(async (params: VendorListParams = {}) => {
      calls.push(params)
      if (params.profileStatus === 'pending') return emptyResult(7)
      return emptyResult(42)
    })

    const counts = await fetchVendorTabCounts(getAll)

    expect(counts).toEqual({ active: 42, pending: 7 })
    expect(calls).toContainEqual(VENDOR_ACTIVE_TAB_COUNT_PARAMS)
    expect(calls).toContainEqual(VENDOR_PENDING_TAB_COUNT_PARAMS)
    expect(VENDOR_PENDING_TAB_COUNT_PARAMS).toMatchObject({
      page: 1,
      limit: 1,
      profileStatus: 'pending',
    })
    expect(VENDOR_PENDING_TAB_COUNT_PARAMS.isActive).toBeUndefined()
  })

  it('pending count stays independent of pagination (limit 1 still returns full total)', async () => {
    const getAll = vi.fn(async (params: VendorListParams = {}) => {
      if (params.profileStatus === 'pending') {
        return { items: [], total: 100, page: 1, pageSize: 1 }
      }
      return emptyResult(5)
    })

    const counts = await fetchVendorTabCounts(getAll)
    expect(counts.pending).toBe(100)
    expect(VENDOR_PENDING_TAB_COUNT_PARAMS.limit).toBe(1)
  })

  it('does not pass search/filters for tab badges (existing unscoped convention)', () => {
    expect(VENDOR_PENDING_TAB_COUNT_PARAMS.search).toBeUndefined()
    expect(VENDOR_PENDING_TAB_COUNT_PARAMS.vendorName).toBeUndefined()
    expect(VENDOR_ACTIVE_TAB_COUNT_PARAMS.isActive).toBeUndefined()
  })
})

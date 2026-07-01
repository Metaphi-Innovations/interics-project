import type { Vendor } from '@/slices/vendors/reducer'

export type VendorProfileStatus = 'pending' | 'complete'

export function getVendorProfileStatus(vendor: Vendor): VendorProfileStatus {
  return vendor.profileStatus ?? 'complete'
}

export function isPendingVendor(vendor: Vendor): boolean {
  return getVendorProfileStatus(vendor) === 'pending'
}

export function isActiveVendorContact(vendor: Vendor): boolean {
  return !isPendingVendor(vendor)
}

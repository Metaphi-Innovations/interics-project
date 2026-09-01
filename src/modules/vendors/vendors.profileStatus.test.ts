import { describe, expect, it } from 'vitest'
import { toCreatePayload, toVendorFromListItem, toUpdatePayload } from '@/modules/vendors/vendors.mapper'
import type { VendorFormInput, VendorListItemApi } from '@/modules/vendors/vendors.types'

describe('Vendor profileStatus mapping', () => {
  it('maps API PENDING to frontend pending on list items', () => {
    const api: VendorListItemApi = {
      id: 'v1',
      vendorName: 'Acme',
      isActive: false,
      profileStatus: 'PENDING',
    }
    expect(toVendorFromListItem(api).profileStatus).toBe('pending')
    expect(toVendorFromListItem(api).status).toBe('Inactive')
  })

  it('maps API COMPLETE + inactive without treating as pending', () => {
    const api: VendorListItemApi = {
      id: 'v2',
      vendorName: 'Done Co',
      isActive: false,
      profileStatus: 'COMPLETE',
    }
    const vendor = toVendorFromListItem(api)
    expect(vendor.profileStatus).toBe('complete')
    expect(vendor.status).toBe('Inactive')
  })

  it('completion payload omits profileStatus so backend evaluates without forcing isActive', () => {
    const form: VendorFormInput = {
      name: 'Acme',
      gstStatus: 'Unregistered',
      contactPerson: 'A',
      phone: '9876543210',
      email: 'a@ex.com',
      city: 'Mumbai',
      state: 'Maharashtra',
    }
    const payload = toUpdatePayload(form)
    expect(payload.profileStatus).toBeUndefined()
    expect(payload.isActive).toBeUndefined()
  })

  it('never sends client profileStatus — backend evaluates completion', () => {
    const form: VendorFormInput = {
      name: 'Acme',
      gstStatus: 'Unregistered',
      contactPerson: 'A',
      phone: '9876543210',
      email: 'a@ex.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      profileStatus: 'complete',
    }
    const payload = toUpdatePayload(form)
    expect(payload.profileStatus).toBeUndefined()
    expect(payload.isActive).toBeUndefined()
  })

  it('create/update payloads omit shipping address fields', () => {
    const form: VendorFormInput = {
      name: 'No Ship Co',
      gstStatus: 'Unregistered',
      contactPerson: 'A',
      phone: '9876543210',
      email: 'a@ex.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Line 1',
      pincode: '400001',
    }
    const payload = toCreatePayload(form)
    expect(payload.shippingAddress).toBeUndefined()
    expect(payload.shippingCity).toBeUndefined()
    expect(payload.shippingState).toBeUndefined()
    expect(payload.shippingPincode).toBeUndefined()
    expect(payload.billingAddress).toBe('Line 1')
    expect(payload.billingPincode).toBe('400001')
  })

  it('full create omits profileStatus so DB default COMPLETE applies', () => {
    const form: VendorFormInput = {
      name: 'Full Vendor',
      gstStatus: 'Registered',
      contactPerson: 'B',
      phone: '9876543210',
      email: 'b@ex.com',
      city: 'Pune',
      state: 'Maharashtra',
    }
    const payload = toCreatePayload(form)
    expect(payload.profileStatus).toBeUndefined()
    expect(payload.isActive).toBeUndefined()
  })
})

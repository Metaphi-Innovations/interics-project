import { createAsyncThunk } from '@reduxjs/toolkit'
import { vendorsService } from '@/modules/vendors'
import { toSettingsRejectPayload } from '@/modules/system-settings/shared/api-errors'
import { VENDOR_FIELD_ALIASES } from '@/modules/vendors/vendors.mapper'
import type { Contact } from '../customers/reducer'
import type { Vendor } from './reducer'
import type { VendorFormInput, VendorListParams } from '@/modules/vendors'

function rejectVendor(err: unknown, fallback: string) {
  return toSettingsRejectPayload(err, fallback, VENDOR_FIELD_ALIASES)
}

export type FetchVendorsParams = VendorListParams & {
  pageSize?: number
  status?: string
  profileStatus?: 'pending' | 'complete'
}

function toListParams(params: FetchVendorsParams = {}): VendorListParams {
  const isActive =
    params.isActive !== undefined
      ? params.isActive
      : params.status === 'Active'
        ? true
        : params.status === 'Inactive'
          ? false
          : undefined

  const gstStatus = params.gstStatus
    ? params.gstStatus.toUpperCase().replace(/\s/g, '_') === 'UNREGISTERED'
      ? 'UNREGISTERED'
      : params.gstStatus.toUpperCase() === 'REGISTERED'
        ? 'REGISTERED'
        : params.gstStatus.toUpperCase()
    : undefined

  return {
    page: params.page,
    limit: Math.min(params.limit ?? params.pageSize ?? 20, 100),
    search: params.search,
    isActive,
    gstStatus,
    state: params.state,
    vendorName: params.vendorName,
    website: params.website,
    location: params.location,
    specialization: params.specialization,
    rating: params.rating,
    contactPerson: params.contactPerson,
    mobile: params.mobile,
    email: params.email,
    designation: params.designation,
    createdOn: params.createdOn,
    columns: params.columns,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  }
}

function isVendorFormInput(data: unknown): data is VendorFormInput {
  return (
    data != null &&
    typeof data === 'object' &&
    'name' in data &&
    'city' in data &&
    'state' in data &&
    'contactPerson' in data
  )
}

export const fetchVendors = createAsyncThunk(
  'vendors/fetchAll',
  async (params: FetchVendorsParams = {}, { rejectWithValue }) => {
    try {
      // Backend has no profileStatus; pending tab is empty until supported.
      if (params.profileStatus === 'pending') {
        return { items: [] as Vendor[], total: 0, page: 1, pageSize: params.pageSize ?? 20 }
      }
      return await vendorsService.getAll(toListParams(params))
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to fetch vendors'))
    }
  },
)

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await vendorsService.getById(id)
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to fetch vendor'))
    }
  },
)

export const createVendor = createAsyncThunk(
  'vendors/create',
  async (data: VendorFormInput | Omit<Vendor, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      if (isVendorFormInput(data)) {
        return await vendorsService.create(data)
      }
      // Legacy Vendor-shaped payloads (e.g. pending create)
      const legacy = data as Omit<Vendor, 'id' | 'createdAt'>
      return await vendorsService.create({
        name: legacy.name,
        website: legacy.website,
        gstStatus: legacy.gstStatus,
        gstin: legacy.gstin,
        pan: legacy.pan,
        contactPerson: legacy.contactPerson,
        designation: legacy.designation,
        phone: legacy.phone,
        email: legacy.email,
        address: legacy.address,
        city: legacy.city || 'Unknown',
        state: legacy.state || 'Unknown',
        pincode: legacy.pincode,
        shippingAddress: legacy.shippingAddress,
        shippingCity: legacy.shippingCity,
        shippingState: legacy.shippingState,
        shippingPincode: legacy.shippingPincode,
        tags: legacy.tags,
        notes: legacy.notes,
        contacts: legacy.contacts,
      })
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to create vendor'))
    }
  },
)

export const updateVendor = createAsyncThunk(
  'vendors/update',
  async (
    { id, data }: { id: string; data: VendorFormInput | Partial<Vendor> },
    { rejectWithValue },
  ) => {
    try {
      const record = data as Record<string, unknown>
      const isDrawerSave =
        'gstCertificateFile' in record ||
        'panCardFile' in record ||
        (typeof record.name === 'string' &&
          typeof record.city === 'string' &&
          typeof record.state === 'string' &&
          typeof record.gstStatus === 'string' &&
          Array.isArray(record.tags))

      if (isDrawerSave) {
        return await vendorsService.update(id, data as VendorFormInput)
      }
      return await vendorsService.updatePartial(id, data as Partial<Vendor>)
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to update vendor'))
    }
  },
)

export const deleteVendor = createAsyncThunk(
  'vendors/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await vendorsService.remove(id)
      return id
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to delete vendor'))
    }
  },
)

export const createVendorContact = createAsyncThunk(
  'vendors/createContact',
  async (
    {
      vendorId,
      data,
    }: { vendorId: string; data: Omit<Contact, 'id'> },
    { rejectWithValue },
  ) => {
    try {
      const contact = await vendorsService.createContact(vendorId, data)
      return { vendorId, contact }
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to create vendor contact'))
    }
  },
)

export const updateVendorContact = createAsyncThunk(
  'vendors/updateContact',
  async (
    {
      vendorId,
      contactId,
      data,
    }: { vendorId: string; contactId: string; data: Partial<Omit<Contact, 'id'>> },
    { rejectWithValue },
  ) => {
    try {
      const contact = await vendorsService.updateContact(vendorId, contactId, data)
      return { vendorId, contact }
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to update vendor contact'))
    }
  },
)

export const deleteVendorContact = createAsyncThunk(
  'vendors/deleteContact',
  async (
    { vendorId, contactId }: { vendorId: string; contactId: string },
    { rejectWithValue },
  ) => {
    try {
      await vendorsService.removeContact(vendorId, contactId)
      return { vendorId, contactId }
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to delete vendor contact'))
    }
  },
)

export interface PendingVendorContactInput {
  vendorId: string
  vendorName: string
  name: string
  phone: string
  email: string
  designation: string
}

export const createPendingVendor = createAsyncThunk(
  'vendors/createPending',
  async (data: PendingVendorContactInput, { rejectWithValue }) => {
    try {
      const trimmedName = data.name.trim()
      const companyName = data.vendorName.trim()
      return await vendorsService.create({
        name: companyName,
        contactPerson: trimmedName,
        designation: data.designation.trim() || null,
        phone: data.phone.trim(),
        email: data.email.trim(),
        city: 'Unknown',
        state: 'Unknown',
        gstStatus: 'Unregistered',
        gstin: null,
        pan: null,
        tags: [],
        notes: null,
        status: 'Inactive',
      })
    } catch (err: unknown) {
      return rejectWithValue(rejectVendor(err, 'Failed to create pending vendor contact'))
    }
  },
)

import { createAsyncThunk } from '@reduxjs/toolkit'
import { customersService } from '@/modules/customers'
import { toSettingsRejectPayload } from '@/modules/system-settings/shared/api-errors'
import { CUSTOMER_FIELD_ALIASES } from '@/modules/customers/customers.mapper'
import type { Customer, Contact } from './reducer'
import type { CustomerFormInput, CustomerListParams } from '@/modules/customers'

function rejectCustomer(err: unknown, fallback: string) {
  return toSettingsRejectPayload(err, fallback, CUSTOMER_FIELD_ALIASES)
}

export type FetchCustomersParams = CustomerListParams & {
  pageSize?: number
  status?: string
}

function toListParams(params: FetchCustomersParams = {}): CustomerListParams {
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
        : params.gstStatus.toUpperCase() === 'COMPOSITION'
          ? 'COMPOSITION'
          : params.gstStatus.toUpperCase() === 'SEZ'
            ? 'SEZ'
            : params.gstStatus.toUpperCase()
    : undefined

  return {
    page: params.page,
    limit: params.limit ?? params.pageSize,
    search: params.search,
    isActive,
    gstStatus,
    state: params.state,
    sector: params.sector,
    projectStatus: params.projectStatus,
    customerName: params.customerName,
    contactPerson: params.contactPerson,
    columns: params.columns,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  }
}

export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  async (params: FetchCustomersParams = {}, { rejectWithValue }) => {
    try {
      return await customersService.getAll(toListParams(params))
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to fetch customers'))
    }
  },
)

export const fetchCustomerFilters = createAsyncThunk(
  'customers/fetchFilters',
  async (_, { rejectWithValue }) => {
    try {
      return await customersService.getFilters()
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to fetch customer filters'))
    }
  },
)

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await customersService.getById(id)
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to fetch customer'))
    }
  },
)

export const createCustomer = createAsyncThunk(
  'customers/create',
  async (data: CustomerFormInput, { rejectWithValue }) => {
    try {
      return await customersService.create(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to create customer'))
    }
  },
)

export const updateCustomer = createAsyncThunk(
  'customers/update',
  async (
    { id, data }: { id: string; data: CustomerFormInput },
    { rejectWithValue },
  ) => {
    try {
      return await customersService.update(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to update customer'))
    }
  },
)

export const setCustomerActive = createAsyncThunk(
  'customers/setActive',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      return await customersService.setActive(id, isActive)
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to update customer status'))
    }
  },
)

export const createCustomerContact = createAsyncThunk(
  'customers/createContact',
  async (
    {
      customerId,
      data,
    }: { customerId: string; data: Omit<Contact, 'id'> },
    { rejectWithValue },
  ) => {
    try {
      const contact = await customersService.createContact(customerId, data)
      return { customerId, contact }
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to create contact person'))
    }
  },
)

export const updateCustomerContact = createAsyncThunk(
  'customers/updateContact',
  async (
    {
      customerId,
      contactId,
      data,
    }: { customerId: string; contactId: string; data: Partial<Omit<Contact, 'id'>> },
    { rejectWithValue },
  ) => {
    try {
      const contact = await customersService.updateContact(customerId, contactId, data)
      return { customerId, contact }
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to update contact person'))
    }
  },
)

export const deleteCustomer = createAsyncThunk(
  'customers/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await customersService.remove(id)
      return id
    } catch (err: unknown) {
      return rejectWithValue(rejectCustomer(err, 'Failed to delete customer'))
    }
  },
)

export type { Customer }

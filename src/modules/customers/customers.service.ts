import client from '@/api/client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type { Customer, Contact } from '@/slices/customers/reducer'
import {
  CUSTOMER_FIELD_ALIASES,
  toCreatePayload,
  toCustomerFromDetail,
  toCustomerFromListItem,
  toCustomerFromSections,
  toUpdatePayload,
} from './customers.mapper'
import type {
  CustomerDetailApi,
  CustomerDetailSectionsApi,
  CustomerDocumentFiles,
  CustomerFiltersApi,
  CustomerFormInput,
  CustomerListItemApi,
  CustomerListParams,
  CustomerListResult,
} from './customers.types'
import type {
  CustomerActivityApiSection,
  CustomerFinancialApi,
} from './customers.activity.mapper'

function buildCustomerMultipart(
  form: CustomerFormInput,
  files?: CustomerDocumentFiles,
): FormData {
  const fd = new FormData()
  fd.append('data', JSON.stringify(toCreatePayload(form)))
  if (files?.gstCertificate) fd.append('gstCertificate', files.gstCertificate)
  if (files?.panDocument) fd.append('panDocument', files.panDocument)
  return fd
}

function resolveDocumentFiles(form: CustomerFormInput): CustomerDocumentFiles | undefined {
  const files: CustomerDocumentFiles = {}
  if (form.gstCertificateFile) files.gstCertificate = form.gstCertificateFile
  if (form.panDocumentFile) files.panDocument = form.panDocumentFile
  return files.gstCertificate || files.panDocument ? files : undefined
}

const BASE = '/customers'

const DEFAULT_LIST_COLUMNS = [
  'id',
  'initials',
  'customerName',
  'contactPerson',
  'designation',
  'contactPersonLabel',
  'phone',
  'email',
  'sector',
  'sectorLabel',
  'projectCount',
  'outstandingAmount',
  'gstStatus',
  'isActive',
  'statusLabel',
  'city',
  'state',
  'createdAt',
] as const

function unwrapListPayload(payload: unknown): {
  items: CustomerListItemApi[]
  total: number
  page: number
  pageSize: number
} {
  const data = unwrapApiData<unknown>(payload)
  if (Array.isArray(data)) {
    return { items: data as CustomerListItemApi[], total: data.length, page: 1, pageSize: data.length }
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const items = Array.isArray(record.items) ? (record.items as CustomerListItemApi[]) : []
    const pagination =
      record.pagination && typeof record.pagination === 'object'
        ? (record.pagination as Record<string, unknown>)
        : {}
    const total =
      typeof pagination.total === 'number'
        ? pagination.total
        : typeof record.total === 'number'
          ? record.total
          : items.length
    const page = typeof pagination.page === 'number' ? pagination.page : 1
    const pageSize = typeof pagination.limit === 'number' ? pagination.limit : items.length || 20
    return { items, total, page, pageSize }
  }
  return { items: [], total: 0, page: 1, pageSize: 20 }
}

function isSectionsPayload(data: unknown): data is CustomerDetailSectionsApi {
  return (
    data != null &&
    typeof data === 'object' &&
    ('overview' in (data as object) || 'documentsAndTax' in (data as object) || 'contacts' in (data as object))
  )
}

export const customersService = {
  fieldAliases: CUSTOMER_FIELD_ALIASES,

  async getFilters(): Promise<CustomerFiltersApi> {
    const res = await client.get(`${BASE}/filters`)
    return unwrapApiData<CustomerFiltersApi>(res.data)
  },

  async getAll(params: CustomerListParams = {}): Promise<CustomerListResult> {
    const columns = params.columns?.length ? params.columns : [...DEFAULT_LIST_COLUMNS]
    const res = await client.get(BASE, {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params.gstStatus ? { gstStatus: params.gstStatus } : {}),
        ...(params.state ? { state: params.state } : {}),
        ...(params.sector ? { sector: params.sector } : {}),
        ...(params.customerName ? { customerName: params.customerName } : {}),
        ...(params.contactPerson ? { contactPerson: params.contactPerson } : {}),
        ...(params.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
        columns: columns.join(','),
      },
    })
    const list = unwrapListPayload(res.data)
    return {
      items: list.items.map(toCustomerFromListItem),
      total: list.total,
      page: list.page,
      pageSize: list.pageSize,
    }
  },

  async getById(id: string): Promise<Customer> {
    const res = await client.get(`${BASE}/${id}`)
    const data = unwrapApiData<CustomerDetailApi | CustomerDetailSectionsApi>(res.data)
    if (isSectionsPayload(data)) {
      return toCustomerFromSections(data)
    }
    return toCustomerFromDetail(data as CustomerDetailApi)
  },

  async create(form: CustomerFormInput): Promise<Customer> {
    const files = resolveDocumentFiles(form)
    const res = files
      ? await client.post(BASE, buildCustomerMultipart(form, files), {
          headers: { 'Content-Type': undefined },
        })
      : await client.post(BASE, toCreatePayload(form))
    const data = unwrapApiData<CustomerDetailApi>(res.data)
    const customer = toCustomerFromDetail(data)
    // Prefer the submitted sector name so list never flashes the internal code
    return { ...customer, sector: form.sector.trim() || customer.sector }
  },

  async update(id: string, form: CustomerFormInput): Promise<Customer> {
    const files = resolveDocumentFiles(form)
    const res = files
      ? await client.put(`${BASE}/${id}`, buildCustomerMultipart(form, files), {
          headers: { 'Content-Type': undefined },
        })
      : await client.put(`${BASE}/${id}`, toUpdatePayload(form))
    const data = unwrapApiData<CustomerDetailApi>(res.data)
    const customer = toCustomerFromDetail(data)
    return { ...customer, sector: form.sector.trim() || customer.sector }
  },

  async setActive(id: string, isActive: boolean): Promise<Customer> {
    const res = await client.patch(`${BASE}/${id}/status`, { isActive })
    const data = unwrapApiData<CustomerDetailApi>(res.data)
    return toCustomerFromDetail(data)
  },

  async remove(id: string): Promise<void> {
    await client.delete(`${BASE}/${id}`)
  },

  async removeContact(customerId: string, contactId: string): Promise<void> {
    await client.delete(`${BASE}/${customerId}/contacts/${contactId}`)
  },

  async getActivity(
    customerId: string,
    params: { type?: string; activityPage?: number; activityLimit?: number } = {},
  ): Promise<CustomerActivityApiSection> {
    const res = await client.get(`${BASE}/${customerId}/activity`, {
      params: {
        activityPage: params.activityPage ?? 1,
        activityLimit: params.activityLimit ?? 50,
        ...(params.type ? { type: params.type } : {}),
      },
    })
    return unwrapApiData<CustomerActivityApiSection>(res.data)
  },

  async getFinancial(customerId: string): Promise<CustomerFinancialApi> {
    const res = await client.get(`${BASE}/${customerId}/financial`)
    return unwrapApiData<CustomerFinancialApi>(res.data)
  },

  async createContact(
    customerId: string,
    data: Omit<Contact, 'id'> & { contactType?: string },
  ): Promise<Contact> {
    const res = await client.post(`${BASE}/${customerId}/contacts`, {
      name: data.name,
      designation: data.designation || undefined,
      phone: data.phone,
      email: data.email,
      contactType: data.contactType ?? (data.isPrimary ? 'PRIMARY' : 'OTHER'),
      isPrimary: data.isPrimary,
    })
    const api = unwrapApiData<{
      id: string
      name: string
      designation?: string | null
      phone: string
      email: string
      isPrimary?: boolean
    }>(res.data)
    return {
      id: api.id,
      name: api.name,
      designation: api.designation ?? '',
      phone: api.phone,
      email: api.email,
      isPrimary: Boolean(api.isPrimary),
    }
  },

  async updateContact(
    customerId: string,
    contactId: string,
    data: Partial<Omit<Contact, 'id'>>,
  ): Promise<Contact> {
    const res = await client.put(`${BASE}/${customerId}/contacts/${contactId}`, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.designation !== undefined && { designation: data.designation || undefined }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    })
    const api = unwrapApiData<{
      id: string
      name: string
      designation?: string | null
      phone: string
      email: string
      isPrimary?: boolean
    }>(res.data)
    return {
      id: api.id,
      name: api.name,
      designation: api.designation ?? '',
      phone: api.phone,
      email: api.email,
      isPrimary: Boolean(api.isPrimary),
    }
  },
}

export type { CustomerFormInput }

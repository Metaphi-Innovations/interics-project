import client from '@/api/client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { toSlug } from '@/utils/formatters'
import type { Contact } from '@/slices/customers/reducer'
import type { Vendor } from '@/slices/vendors/reducer'
import {
  toCreatePayload,
  toPartialUpdatePayload,
  toUpdatePayload,
  toVendorFromListItem,
  toVendorFromSections,
  VENDOR_FIELD_ALIASES,
} from './vendors.mapper'
import { setStoredVendorRating } from '@/utils/vendorRatingStorage'
import type {
  VendorDetailSectionsApi,
  VendorDocumentFiles,
  VendorFiltersApi,
  VendorFormInput,
  VendorListItemApi,
  VendorListParams,
  VendorListResult,
} from './vendors.types'

const BASE = '/vendors'

const DEFAULT_LIST_COLUMNS = [
  'id',
  'initials',
  'vendorName',
  'contactPerson',
  'designation',
  'contactPersonLabel',
  'phone',
  'email',
  'website',
  'location',
  'specialization',
  'complianceStatus',
  'gstStatus',
  'isActive',
  'statusLabel',
  'city',
  'state',
  'createdAt',
] as const

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function unwrapListPayload(payload: unknown): {
  items: VendorListItemApi[]
  total: number
  page: number
  pageSize: number
} {
  const data = unwrapApiData<unknown>(payload)
  if (Array.isArray(data)) {
    return { items: data as VendorListItemApi[], total: data.length, page: 1, pageSize: data.length }
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const items = Array.isArray(record.items) ? (record.items as VendorListItemApi[]) : []
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

function isSectionsPayload(data: unknown): data is VendorDetailSectionsApi {
  return (
    data != null &&
    typeof data === 'object' &&
    ('overview' in (data as object) ||
      'documentsAndTax' in (data as object) ||
      'contacts' in (data as object))
  )
}

function resolveDocumentFiles(form: VendorFormInput): VendorDocumentFiles | undefined {
  const files: VendorDocumentFiles = {}
  if (form.gstCertificateFile) files.gstCertificate = form.gstCertificateFile
  if (form.panCardFile) files.panCard = form.panCardFile
  if (form.cancelledChequeFile) files.cancelledCheque = form.cancelledChequeFile
  if (form.insuranceDocumentFile) files.insuranceDocument = form.insuranceDocumentFile
  if (form.catalogueFile) files.catalogue = form.catalogueFile
  return Object.keys(files).length ? files : undefined
}

function buildVendorMultipart(payload: Record<string, unknown>, files?: VendorDocumentFiles): FormData {
  const fd = new FormData()
  fd.append('data', JSON.stringify(payload))
  if (files?.gstCertificate) fd.append('gstCertificate', files.gstCertificate)
  if (files?.panCard) fd.append('panCard', files.panCard)
  if (files?.cancelledCheque) fd.append('cancelledCheque', files.cancelledCheque)
  if (files?.insuranceDocument) fd.append('insuranceDocument', files.insuranceDocument)
  if (files?.catalogue) fd.append('catalogue', files.catalogue)
  return fd
}

function mapContactResponse(api: Record<string, unknown>): Contact {
  return {
    id: String(api.id),
    name: String(api.name ?? ''),
    designation: String(api.designation ?? ''),
    phone: String(api.phone ?? ''),
    email: String(api.email ?? ''),
    isPrimary: Boolean(api.isPrimary),
  }
}

export const vendorsService = {
  fieldAliases: VENDOR_FIELD_ALIASES,

  async getFilters(): Promise<VendorFiltersApi> {
    const res = await client.get(`${BASE}/filters`)
    return unwrapApiData<VendorFiltersApi>(res.data)
  },

  async getAll(params: VendorListParams = {}): Promise<VendorListResult> {
    const columns = params.columns?.length ? params.columns : [...DEFAULT_LIST_COLUMNS]
    const res = await client.get(BASE, {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params.gstStatus ? { gstStatus: params.gstStatus } : {}),
        ...(params.state ? { state: params.state } : {}),
        ...(params.vendorName ? { vendorName: params.vendorName } : {}),
        ...(params.website ? { website: params.website } : {}),
        ...(params.location ? { location: params.location } : {}),
        ...(params.specialization ? { specialization: params.specialization } : {}),
        ...(params.contactPerson ? { contactPerson: params.contactPerson } : {}),
        ...(params.mobile ? { mobile: params.mobile } : {}),
        ...(params.email ? { email: params.email } : {}),
        ...(params.designation ? { designation: params.designation } : {}),
        ...(params.createdOn ? { createdOn: params.createdOn } : {}),
        ...(params.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
        columns: columns.join(','),
      },
    })
    const list = unwrapListPayload(res.data)
    return {
      items: list.items.map(toVendorFromListItem),
      total: list.total,
      page: list.page,
      pageSize: list.pageSize,
    }
  },

  async getById(idOrSlug: string): Promise<Vendor> {
    let id = idOrSlug
    if (!UUID_RE.test(idOrSlug)) {
      const found = await this.getAll({ search: idOrSlug.replace(/-/g, ' '), limit: 50 })
      const match =
        found.items.find((v) => v.id === idOrSlug) ??
        found.items.find((v) => toSlug(v.name) === idOrSlug)
      if (!match) {
        throw Object.assign(new Error('Vendor not found'), {
          response: { data: { message: 'Vendor not found' }, status: 404 },
        })
      }
      id = match.id
    }

    const res = await client.get(`${BASE}/${id}`)
    const data = unwrapApiData<VendorDetailSectionsApi>(res.data)
    if (isSectionsPayload(data)) {
      return toVendorFromSections(data)
    }
    // Fallback if a flat detail is ever returned
    return toVendorFromSections({ id, ...(data as object) } as VendorDetailSectionsApi)
  },

  async create(form: VendorFormInput): Promise<Vendor> {
    const payload = toCreatePayload(form)
    const files = resolveDocumentFiles(form)
    const res = files
      ? await client.post(BASE, buildVendorMultipart(payload, files), {
          headers: { 'Content-Type': undefined },
        })
      : await client.post(BASE, payload)
    const data = unwrapApiData<VendorDetailSectionsApi>(res.data)
    return toVendorFromSections(data)
  },

  async update(id: string, form: VendorFormInput): Promise<Vendor> {
    const payload = toUpdatePayload(form)
    const files = resolveDocumentFiles(form)
    const res = files
      ? await client.put(`${BASE}/${id}`, buildVendorMultipart(payload, files), {
          headers: { 'Content-Type': undefined },
        })
      : await client.put(`${BASE}/${id}`, payload)
    const data = unwrapApiData<VendorDetailSectionsApi>(res.data)
    return toVendorFromSections(data)
  },

  async updatePartial(id: string, patch: Partial<Vendor>): Promise<Vendor> {
    const rating = patch.rating
    const keys = Object.keys(patch).filter((k) => k !== 'id' && k !== 'rating')

    // Rating is client-persisted (not on vendor schema yet).
    if (keys.length === 0 && rating !== undefined) {
      setStoredVendorRating(id, rating)
      const current = await this.getById(id)
      return { ...current, rating: rating ?? null }
    }

    if (keys.length === 1 && keys[0] === 'status' && patch.status !== undefined) {
      const vendor = await this.setActive(id, patch.status === 'Active')
      if (rating !== undefined) setStoredVendorRating(id, rating)
      return rating !== undefined ? { ...vendor, rating } : vendor
    }

    const body = toPartialUpdatePayload(patch)

    if (patch.status !== undefined) {
      await client.patch(`${BASE}/${id}/status`, { isActive: patch.status === 'Active' })
    }

    if (Object.keys(body).length === 0) {
      const current = await this.getById(id)
      if (rating !== undefined) {
        setStoredVendorRating(id, rating)
        return { ...current, rating: rating ?? null }
      }
      return current
    }

    if (body.contacts && (body.billingCity === undefined || body.billingState === undefined)) {
      const current = await this.getById(id)
      if (body.billingCity === undefined) body.billingCity = current.city || 'Unknown'
      if (body.billingState === undefined) body.billingState = current.state || 'Unknown'
      if (body.vendorName === undefined) body.vendorName = current.name
    }

    const res = await client.put(`${BASE}/${id}`, body)
    const data = unwrapApiData<VendorDetailSectionsApi>(res.data)
    const vendor = toVendorFromSections(data)
    if (rating !== undefined) {
      setStoredVendorRating(id, rating)
      return { ...vendor, rating: rating ?? null }
    }
    return vendor
  },

  /** Upload or remove compliance documents without rewriting the full vendor form. */
  async updateDocuments(
    id: string,
    options: {
      files?: VendorDocumentFiles
      removeDocuments?: VendorFormInput['removeDocuments']
      insuranceExpiryDate?: string | null
    },
  ): Promise<Vendor> {
    const payload: Record<string, unknown> = {}
    if (options.removeDocuments?.length) {
      payload.removeDocuments = options.removeDocuments
    }
    if (options.insuranceExpiryDate !== undefined) {
      payload.insuranceExpiryDate = options.insuranceExpiryDate
    }

    const files = options.files
    const res =
      files && Object.keys(files).length > 0
        ? await client.put(`${BASE}/${id}`, buildVendorMultipart(payload, files), {
            headers: { 'Content-Type': undefined },
          })
        : await client.put(`${BASE}/${id}`, payload)

    const data = unwrapApiData<VendorDetailSectionsApi>(res.data)
    return toVendorFromSections(data)
  },

  async setActive(id: string, isActive: boolean): Promise<Vendor> {
    const res = await client.patch(`${BASE}/${id}/status`, { isActive })
    const data = unwrapApiData<VendorDetailSectionsApi>(res.data)
    return toVendorFromSections(data)
  },

  async remove(id: string): Promise<void> {
    await client.delete(`${BASE}/${id}`)
  },

  async createContact(vendorId: string, data: Omit<Contact, 'id'>): Promise<Contact> {
    const res = await client.post(`${BASE}/${vendorId}/contacts`, {
      name: data.name,
      designation: data.designation || undefined,
      phone: data.phone,
      email: data.email,
      contactType: data.isPrimary ? 'PRIMARY' : 'OTHER',
      isPrimary: data.isPrimary,
    })
    return mapContactResponse(unwrapApiData<Record<string, unknown>>(res.data))
  },

  async updateContact(
    vendorId: string,
    contactId: string,
    data: Partial<Omit<Contact, 'id'>>,
  ): Promise<Contact> {
    const res = await client.put(`${BASE}/${vendorId}/contacts/${contactId}`, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.designation !== undefined && { designation: data.designation || undefined }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    })
    return mapContactResponse(unwrapApiData<Record<string, unknown>>(res.data))
  },

  async removeContact(vendorId: string, contactId: string): Promise<void> {
    await client.delete(`${BASE}/${vendorId}/contacts/${contactId}`)
  },

  async getActivity(
    vendorId: string,
    params: { type?: string; activityPage?: number; activityLimit?: number } = {},
  ) {
    const res = await client.get(`${BASE}/${vendorId}/activity`, {
      params: {
        activityPage: params.activityPage ?? 1,
        activityLimit: params.activityLimit ?? 50,
        ...(params.type ? { type: params.type } : {}),
      },
    })
    return unwrapApiData<{
      type: string
      items: Array<{
        id: string
        type: string
        title: string
        description: string
        performedBy: { id: string; name: string }
        createdAt: string
      }>
      total: number
    }>(res.data)
  },
}

export type { VendorFormInput }

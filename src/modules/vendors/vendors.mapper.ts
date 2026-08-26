import type { Contact } from '@/slices/customers/reducer'
import type {
  Vendor,
  VendorComplianceDocument,
  VendorCompliance,
} from '@/slices/vendors/reducer'
import { buildFileViewUrlFromId, resolveApiAssetUrl } from '@/utils/openAuthenticatedDocument'
import { extractIndianMobileDigits } from '@/utils/mobile'
import { getStoredVendorRating } from '@/utils/vendorRatingStorage'
import type {
  ApiGstStatus,
  UiGstStatus,
  VendorDetailSectionsApi,
  VendorDocumentRefApi,
  VendorFormInput,
  VendorListItemApi,
} from './vendors.types'

const GST_TO_API: Record<UiGstStatus, ApiGstStatus> = {
  Registered: 'REGISTERED',
  Unregistered: 'UNREGISTERED',
}

const GST_TO_UI: Record<string, UiGstStatus> = {
  REGISTERED: 'Registered',
  UNREGISTERED: 'Unregistered',
  COMPOSITION: 'Registered',
  SEZ: 'Registered',
}

function toUiProfileStatus(
  value: string | null | undefined,
): 'pending' | 'complete' {
  if (!value) return 'complete'
  const normalized = value.toUpperCase()
  return normalized === 'PENDING' ? 'pending' : 'complete'
}

export function toApiGstStatus(status: UiGstStatus | string | undefined): ApiGstStatus {
  if (!status) return 'UNREGISTERED'
  if (status === 'Registered' || status === 'Unregistered') return GST_TO_API[status]
  const upper = status.toUpperCase().replace(/\s/g, '_')
  if (upper === 'REGISTERED' || upper === 'COMPOSITION' || upper === 'SEZ') return upper as ApiGstStatus
  return 'UNREGISTERED'
}

export function toUiGstStatus(status: string | null | undefined): UiGstStatus {
  if (!status) return 'Unregistered'
  return GST_TO_UI[status.toUpperCase()] ?? 'Unregistered'
}

function normalizeWebsite(raw?: string | null): string | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function docFromRef(
  ref: VendorDocumentRefApi | null | undefined,
  documentType: VendorComplianceDocument['documentType'],
): VendorComplianceDocument | null {
  if (!ref?.fileName && !ref?.fileId) return null
  return {
    documentType,
    name: ref.fileName ?? 'Document',
    url:
      resolveApiAssetUrl(ref.viewUrl) ??
      resolveApiAssetUrl(ref.downloadUrl) ??
      buildFileViewUrlFromId(ref.fileId) ??
      '',
    description: null,
    uploadedBy: null,
    uploadedOn: null,
    lastUpdatedOn: null,
    expiryDate: null,
  }
}

function complianceFromDocs(
  docs: VendorDetailSectionsApi['documentsAndTax'],
): VendorCompliance | undefined {
  if (!docs) return undefined
  const chip = (uploaded: boolean, expired?: boolean, expiring?: boolean) => {
    if (!uploaded) return 'missing' as const
    if (expired) return 'expired' as const
    if (expiring) return 'expiring_soon' as const
    return 'verified' as const
  }
  return {
    gst: chip(Boolean(docs.gstCertificate)),
    pan: chip(Boolean(docs.panCard)),
    bankCheque: chip(Boolean(docs.cancelledCheque)),
    insurance: {
      status: chip(Boolean(docs.insuranceDocument), docs.isExpired, docs.expiresWithin30Days),
      expiryDate: docs.insuranceExpiryDate ?? null,
    },
  }
}

function mapActivityItems(
  items: NonNullable<VendorDetailSectionsApi['activity']>['items'],
): Vendor['activityLog'] {
  if (!items?.length) return []
  return items.map((item) => ({
    id: item.id,
    type: 'profile_edited' as const,
    description: item.title || item.description,
    user: item.performedBy?.name?.trim() || 'System',
    timestamp: item.createdAt,
  }))
}

export function toVendorFromListItem(api: VendorListItemApi): Vendor {
  const label = api.contactPersonLabel ?? ''
  const [nameFromLabel, ...rest] = label.split(' — ')
  const contactPerson = api.contactPerson || nameFromLabel || ''
  const designation = api.designation ?? (rest.length ? rest.join(' — ') : null)
  const locationParts = (api.location ?? '').split(',').map((p) => p.trim()).filter(Boolean)

  return {
    id: api.id,
    name: api.vendorName ?? '',
    gstin: null,
    pan: null,
    gstStatus: toUiGstStatus(api.gstStatus),
    website: api.website ?? null,
    contactPerson,
    designation,
    phone: api.phone ?? '',
    email: api.email ?? '',
    city: api.city ?? api.billingCity ?? locationParts[0] ?? '',
    state: api.state ?? api.billingState ?? locationParts[1] ?? '',
    address: null,
    pincode: null,
    tags: api.specialization
      ? api.specialization.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
    notes: null,
    status: api.isActive === false || api.statusLabel === 'Inactive' ? 'Inactive' : 'Active',
    profileStatus: toUiProfileStatus(api.profileStatus),
    rating: getStoredVendorRating(api.id),
    activeProjects: 0,
    totalPayables: 0,
    createdAt: api.createdAt ?? new Date().toISOString(),
  }
}

export function toVendorFromSections(api: VendorDetailSectionsApi): Vendor {
  const profile = api.overview?.vendorProfile
  const billing = api.overview?.billingAddress
  const docs = api.documentsAndTax
  const primary = api.overview?.primaryContact ?? api.contacts?.primaryContact
  const contactItems = api.contacts?.items ?? []

  const contacts: Contact[] = contactItems.map((c) => ({
    id: c.id,
    name: c.name,
    designation: c.designation ?? '',
    phone: c.phone,
    email: c.email,
    isPrimary: Boolean(c.isPrimary),
  }))

  if (!contacts.length && primary?.name) {
    contacts.push({
      id: primary.id ?? `${api.id}-primary`,
      name: primary.name,
      designation: primary.designation ?? '',
      phone: primary.phone ?? '',
      email: primary.email ?? '',
      isPrimary: true,
    })
  }

  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0]
  const insuranceDoc = docFromRef(docs?.insuranceDocument, 'insurance')
  if (insuranceDoc && docs?.insuranceExpiryDate) {
    insuranceDoc.expiryDate = docs.insuranceExpiryDate
  }

  const catalogue = api.overview?.catalogue
  const documents =
    catalogue?.fileName || catalogue?.fileId
      ? [
          {
            id: catalogue.fileId ?? `catalogue-${api.id}`,
            name: catalogue.fileName ?? 'Catalogue',
            type: 'Catalogue' as const,
            uploadedAt: new Date().toISOString(),
            url:
              resolveApiAssetUrl(catalogue.viewUrl) ??
              buildFileViewUrlFromId(catalogue.fileId) ??
              '',
          },
        ]
      : undefined

  return {
    id: api.id,
    name: profile?.vendorName ?? '',
    gstin: docs?.gstin ?? profile?.gstin ?? null,
    pan: docs?.panNumber ?? profile?.panNumber ?? null,
    gstStatus: toUiGstStatus(docs?.gstStatus ?? profile?.gstStatus),
    website: api.overview?.procurementSummary?.website ?? null,
    contactPerson: primaryContact?.name ?? primary?.name ?? '',
    designation: primaryContact?.designation ?? primary?.designation ?? null,
    phone: primaryContact?.phone ?? primary?.phone ?? '',
    email: primaryContact?.email ?? primary?.email ?? '',
    city: billing?.city ?? '',
    state: billing?.state ?? '',
    address: billing?.address ?? null,
    pincode: billing?.pincode ?? null,
    tags: api.overview?.specialization?.tags ?? [],
    notes: api.overview?.notes ?? null,
    status: profile?.status === 'Inactive' ? 'Inactive' : 'Active',
    profileStatus: toUiProfileStatus(profile?.profileStatus),
    rating: getStoredVendorRating(api.id),
    activeProjects: Number(api.overview?.procurementSummary?.linkedProjects ?? 0),
    totalPayables: 0,
    createdAt: new Date().toISOString(),
    contacts,
    gstDocument: docFromRef(docs?.gstCertificate, 'gst'),
    panDocument: docFromRef(docs?.panCard, 'pan'),
    bankChequeDocument: docFromRef(docs?.cancelledCheque, 'bank_cheque'),
    insuranceDocument: insuranceDoc,
    compliance: complianceFromDocs(docs),
    activityLog: mapActivityItems(api.activity?.items),
    documents,
  }
}

function buildContactPayload(form: VendorFormInput) {
  if (form.contacts?.length) {
    return form.contacts
      .map((c) => {
        const name = c.name.trim()
        const phone = extractIndianMobileDigits(c.phone)
        const email = c.email.trim()
        if (!name || !phone || !email) return null
        return {
          ...(c.id && !c.id.startsWith('vc-local-') && !c.id.startsWith('pending-')
            ? { id: c.id }
            : {}),
          name,
          designation: c.designation?.trim() || undefined,
          phone,
          email,
          contactType: c.isPrimary ? ('PRIMARY' as const) : ('OTHER' as const),
          isPrimary: Boolean(c.isPrimary),
        }
      })
      .filter((c): c is NonNullable<typeof c> => c != null)
  }

  const phone = extractIndianMobileDigits(form.phone)
  const email = form.email.trim()
  const name = form.contactPerson.trim()
  if (!name || !phone || !email) return []

  return [
    {
      name,
      designation: form.designation?.trim() || undefined,
      phone,
      email,
      contactType: 'PRIMARY' as const,
      isPrimary: true,
    },
  ]
}

export function toCreatePayload(form: VendorFormInput): Record<string, unknown> {
  return {
    vendorName: form.name.trim(),
    website: normalizeWebsite(form.website),
    gstStatus: toApiGstStatus(form.gstStatus),
    gstin: form.gstin?.trim() || undefined,
    panNumber: form.pan?.trim() || undefined,
    contacts: buildContactPayload(form),
    billingAddress: form.address?.trim() || undefined,
    billingCity: form.city.trim() || 'Unknown',
    billingState: form.state.trim() || 'Unknown',
    billingPincode: form.pincode?.trim() || undefined,
    specializationTags: form.tags?.length ? form.tags : undefined,
    notes: form.notes?.trim() || undefined,
    insuranceExpiryDate: form.insuranceExpiryDate || undefined,
    ...(form.status === 'Inactive'
      ? { isActive: false }
      : form.status === 'Active'
        ? { isActive: true }
        : {}),
    ...(form.removeDocuments?.length ? { removeDocuments: form.removeDocuments } : {}),
  }
}

export function toUpdatePayload(form: VendorFormInput): Record<string, unknown> {
  const payload = toCreatePayload(form)
  // Never invent new contacts on update — that collides with existing emails/phones.
  // Only sync when the caller provides an explicit contacts array (with ids when updating).
  if (form.contacts === undefined) {
    delete payload.contacts
  } else {
    const contacts = buildContactPayload(form)
    if (contacts.length) payload.contacts = contacts
    else delete payload.contacts
  }
  return payload
}

/** Map a Partial<Vendor> patch (detail page) into API update body. */
export function toPartialUpdatePayload(patch: Partial<Vendor>): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (patch.name !== undefined) body.vendorName = patch.name.trim()
  if (patch.website !== undefined) body.website = normalizeWebsite(patch.website)
  if (patch.gstStatus !== undefined) body.gstStatus = toApiGstStatus(patch.gstStatus)
  if (patch.gstin !== undefined) body.gstin = patch.gstin?.trim() || undefined
  if (patch.pan !== undefined) body.panNumber = patch.pan?.trim() || undefined
  if (patch.address !== undefined) body.billingAddress = patch.address?.trim() || undefined
  if (patch.city !== undefined) body.billingCity = patch.city.trim()
  if (patch.state !== undefined) body.billingState = patch.state.trim()
  if (patch.pincode !== undefined) body.billingPincode = patch.pincode?.trim() || undefined
  if (patch.tags !== undefined) body.specializationTags = patch.tags
  if (patch.notes !== undefined) body.notes = patch.notes?.trim() || undefined

  if (patch.contacts !== undefined) {
    body.contacts = patch.contacts
      .map((c) => {
        const name = c.name.trim()
        const phone = extractIndianMobileDigits(c.phone)
        const email = c.email.trim()
        if (!name || !phone || !email) return null
        return {
          ...(c.id && !c.id.startsWith('vc-local-') && !c.id.startsWith('pending-')
            ? { id: c.id }
            : {}),
          name,
          designation: c.designation?.trim() || undefined,
          phone,
          email,
          contactType: c.isPrimary ? 'PRIMARY' : 'OTHER',
          isPrimary: Boolean(c.isPrimary),
        }
      })
      .filter((c): c is NonNullable<typeof c> => c != null)
  }

  // Ensure required fields when contacts are sent without city/state (partial contact saves)
  if (body.contacts && patch.city === undefined && patch.state === undefined) {
    // leave city/state out — update schema is partial
  }

  return body
}

export const VENDOR_FIELD_ALIASES: Record<string, string> = {
  vendorName: 'name',
  panNumber: 'pan',
  billingCity: 'city',
  billingState: 'state',
  billingAddress: 'address',
  billingPincode: 'pincode',
  specializationTags: 'tags',
  'contacts.0.name': 'contactPerson',
  'contacts.0.phone': 'phone',
  'contacts.0.email': 'email',
  'contacts.0.designation': 'designation',
}

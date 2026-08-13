import type { Customer, Contact } from '@/slices/customers/reducer'
import { buildFileViewUrlFromId, resolveApiAssetUrl } from '@/utils/openAuthenticatedDocument'
import type {
  ApiGstStatus,
  CustomerDetailApi,
  CustomerDetailSectionsApi,
  CustomerFormInput,
  CustomerListItemApi,
  UiGstStatus,
} from './customers.types'

const GST_TO_API: Record<UiGstStatus, ApiGstStatus> = {
  Registered: 'REGISTERED',
  Unregistered: 'UNREGISTERED',
  Composition: 'COMPOSITION',
  SEZ: 'SEZ',
}

const GST_TO_UI: Record<string, UiGstStatus> = {
  REGISTERED: 'Registered',
  UNREGISTERED: 'Unregistered',
  COMPOSITION: 'Composition',
  SEZ: 'SEZ',
}

export function toApiGstStatus(status: UiGstStatus): ApiGstStatus {
  return GST_TO_API[status] ?? 'UNREGISTERED'
}

export function toUiGstStatus(status: string | null | undefined): UiGstStatus {
  if (!status) return 'Unregistered'
  return GST_TO_UI[status.toUpperCase()] ?? (GST_TO_UI[status] ?? 'Unregistered')
}

function parseContactLabel(label: string | undefined): { name: string; designation: string } {
  if (!label?.trim()) return { name: '', designation: '' }
  const parts = label.split(' — ')
  if (parts.length >= 2) {
    return { name: parts[0].trim(), designation: parts.slice(1).join(' — ').trim() }
  }
  return { name: label.trim(), designation: '' }
}

export function toCustomerFromListItem(api: CustomerListItemApi): Customer {
  const fromLabel = parseContactLabel(api.contactPersonLabel)
  const contactPerson = api.contactPerson?.trim() || fromLabel.name
  const designation = api.designation?.trim() || fromLabel.designation || null
  const phone = api.phone ?? ''
  const email = api.email ?? ''

  // List payload has no contact UUIDs — leave contacts empty so callers fetch detail
  // before using contact IDs (e.g. Create Project). Never invent `${id}-primary`.
  return {
    id: api.id,
    name: api.customerName ?? '',
    gstStatus: toUiGstStatus(api.gstStatus),
    gstin: null,
    pan: null,
    contactPerson,
    designation,
    phone,
    email,
    city: api.city ?? '',
    state: api.state ?? '',
    address: null,
    pincode: null,
    tags: [],
    sector: api.sectorLabel ?? api.sector ?? '',
    notes: null,
    status: api.isActive === false || api.statusLabel === 'Inactive' ? 'Inactive' : 'Active',
    activeProjects: Number(api.projectCount ?? 0),
    totalReceivables: Number(api.outstandingAmount ?? 0),
    createdAt: api.createdAt ? String(api.createdAt) : new Date().toISOString(),
  }
}

export function toCustomerFromDetail(api: CustomerDetailApi): Customer {
  const gstFile = api.gstCertificateFile
  const panFile = api.panDocumentFile

  return {
    id: api.id,
    name: api.customerName,
    gstStatus: toUiGstStatus(api.gstStatus),
    gstin: api.gstin,
    pan: api.panNumber,
    contactPerson: api.contactPerson,
    designation: api.designation,
    phone: api.phone,
    email: api.email,
    city: api.city,
    state: api.state,
    address: api.address,
    pincode: api.pincode,
    tags: api.tags ?? [],
    sector: api.sectorLabel ?? api.sector,
    notes: api.notes,
    status: api.isActive ? 'Active' : 'Inactive',
    activeProjects: 0,
    totalReceivables: 0,
    createdAt: String(api.createdAt),
    gstDocument: gstFile
      ? {
          name: gstFile.originalName ?? 'GST Certificate',
          url:
            resolveApiAssetUrl(gstFile.url) ??
            resolveApiAssetUrl((gstFile as { viewUrl?: string }).viewUrl) ??
            buildFileViewUrlFromId(gstFile.id) ??
            '',
        }
      : null,
    panDocument: panFile
      ? {
          name: panFile.originalName ?? 'PAN Document',
          url:
            resolveApiAssetUrl(panFile.url) ??
            resolveApiAssetUrl((panFile as { viewUrl?: string }).viewUrl) ??
            buildFileViewUrlFromId(panFile.id) ??
            '',
        }
      : null,
    contacts: [
      {
        id: `${api.id}-primary`,
        name: api.contactPerson,
        designation: api.designation ?? '',
        phone: api.phone,
        email: api.email,
        isPrimary: true,
      },
    ],
  }
}

function resolveDocumentFile(
  document?: {
    fileId?: string
    fileName?: string
    originalName?: string
    url?: string
    viewUrl?: string
  } | null,
  certificateFile?: { id?: string; originalName?: string; url?: string; viewUrl?: string } | null,
  fallbackName = 'Document',
): { name: string; url: string } | null {
  if (document) {
    return {
      name: document.fileName ?? document.originalName ?? fallbackName,
      url:
        resolveApiAssetUrl(document.viewUrl) ??
        resolveApiAssetUrl(document.url) ??
        buildFileViewUrlFromId(document.fileId) ??
        '',
    }
  }
  if (certificateFile) {
    return {
      name: certificateFile.originalName ?? fallbackName,
      url:
        resolveApiAssetUrl(certificateFile.viewUrl) ??
        resolveApiAssetUrl(certificateFile.url) ??
        buildFileViewUrlFromId(certificateFile.id) ??
        '',
    }
  }
  return null
}

export function toCustomerFromSections(api: CustomerDetailSectionsApi): Customer {
  const profile = api.overview?.customerProfile ?? api.overview?.profile
  const address = api.overview?.addressAndLocation ?? api.overview?.address
  const tagsAndNotes = api.overview?.tagsAndNotes
  const primary = api.overview?.primaryContact ?? api.contacts?.primaryContact
  const docs = api.documentsAndTax
  const contactItems = api.contacts?.items ?? []

  const contacts: Contact[] = contactItems.map((c) => ({
    id: c.id,
    name: c.name,
    designation: c.designation ?? '',
    phone: c.phone,
    email: c.email,
    isPrimary: Boolean(c.isPrimary),
  }))

  if (!contacts.length && primary?.name && primary.id) {
    contacts.push({
      id: primary.id,
      name: primary.name,
      designation: primary.designation ?? '',
      phone: primary.phone ?? '',
      email: primary.email ?? '',
      isPrimary: true,
    })
  }

  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0]
  const statusLabel = profile && 'status' in profile ? profile.status : undefined
  const isActiveFlag =
    profile && 'isActive' in profile ? profile.isActive !== false : statusLabel !== 'Inactive'

  const gstDoc = resolveDocumentFile(
    docs?.gstRegistration?.document,
    docs?.gstRegistration?.certificateFile,
    'GST Certificate',
  )
  const panDoc = resolveDocumentFile(
    docs?.panIncomeTax?.document,
    docs?.panIncomeTax?.documentFile,
    'PAN Document',
  )

  return {
    id: api.id,
    name: profile?.customerName ?? '',
    gstStatus: toUiGstStatus(
      docs?.gstRegistration?.gstStatus ?? docs?.gstRegistration?.status ?? profile?.gstStatus,
    ),
    gstin: docs?.gstRegistration?.gstin ?? (profile && 'gstin' in profile ? profile.gstin : null) ?? null,
    pan:
      docs?.panIncomeTax?.panNumber ??
      (profile && 'panNumber' in profile ? profile.panNumber : null) ??
      null,
    contactPerson: primaryContact?.name ?? primary?.name ?? '',
    designation: primaryContact?.designation ?? primary?.designation ?? null,
    phone: primaryContact?.phone ?? primary?.phone ?? '',
    email: primaryContact?.email ?? primary?.email ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    address: address?.address ?? null,
    pincode: address?.pincode ?? null,
    tags: tagsAndNotes?.tags ?? (profile && 'tags' in profile ? profile.tags : undefined) ?? [],
    sector: profile?.sectorLabel ?? profile?.sector ?? '',
    notes: tagsAndNotes?.notes ?? (profile && 'notes' in profile ? profile.notes : null) ?? null,
    status: isActiveFlag ? 'Active' : 'Inactive',
    activeProjects: Number(api.overview?.projectSummary?.activeProjects ?? 0),
    totalReceivables: Number(api.overview?.projectSummary?.outstandingAmount ?? 0),
    createdAt: new Date().toISOString(),
    contacts,
    gstDocument: gstDoc,
    panDocument: panDoc,
  }
}

export function toCreatePayload(form: CustomerFormInput) {
  const contactName = form.contactPerson.trim()
  const contactPhone = form.phone.trim()
  const contactEmail = form.email.trim()
  const hasContact = Boolean(contactName || contactPhone || contactEmail)

  return {
    customerName: form.name.trim(),
    sector: form.sector.trim(),
    gstStatus: toApiGstStatus(form.gstStatus),
    gstin: form.gstin.trim() || undefined,
    panNumber: form.pan.trim() || undefined,
    ...(hasContact
      ? {
          contacts: [
            {
              name: contactName || 'Primary Contact',
              designation: form.designation.trim() || undefined,
              phone: contactPhone,
              email: contactEmail,
              contactType: 'PRIMARY' as const,
              isPrimary: true,
            },
          ],
        }
      : { contacts: [] }),
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    pincode: form.pincode.trim() || undefined,
    tags: form.tags?.length ? form.tags : undefined,
    notes: form.notes.trim() || undefined,
  }
}

export function toUpdatePayload(form: CustomerFormInput) {
  return toCreatePayload(form)
}

/** Map backend Zod paths onto CustomerDrawer form fields. */
export const CUSTOMER_FIELD_ALIASES: Record<string, string> = {
  customerName: 'name',
  panNumber: 'pan',
  'contacts.0.name': 'contactPerson',
  'contacts.0.designation': 'designation',
  'contacts.0.phone': 'phone',
  'contacts.0.email': 'email',
  contacts: 'contactPerson',
}

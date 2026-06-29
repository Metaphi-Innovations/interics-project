import { tokens } from '@/design-system/tokens'
import type { Contact, Customer } from '../../slices/customers/reducer'
import type { Vendor } from '../../slices/vendors/reducer'
import type {
  ContactInfo,
  ProjectDocumentFile,
  ProjectDocuments,
} from '../../slices/projects/reducer'
import { getCustomerContactsList } from '../../utils/customerContacts'
import { getVendorContactsList } from '../../utils/vendorContacts'
import { normalizeContacts } from '../../utils/entityContacts'

export type ProjectContactSource = 'customer' | 'vendor'

export interface ProjectContactOption extends Contact {
  sourceType: ProjectContactSource
  entityId: string
  entityName: string
}

export const PROJECT_SETUP_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
} as const

export const CUSTOMER_STEP_GRID_SX = PROJECT_SETUP_GRID_SX

/** Consistent control height for paired Customer / Contact Person fields. */
export const FORM_CONTROL_INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    alignItems: 'center',
  },
  '& input': { fontSize: 13 },
} as const

export const READONLY_CALC_VALUE_SX = {
  minHeight: 40,
  px: 1.5,
  display: 'flex',
  alignItems: 'center',
  borderRadius: 1,
  border: `1px solid ${tokens.color.neutral[200]}`,
  bgcolor: tokens.color.neutral[50],
} as const

function parsePositiveNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function parseRateNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function calcTotalDesignFee(carpetArea: string, designFeePerSqft: string): number | null {
  const area = parsePositiveNumber(carpetArea)
  const rate = parseRateNumber(designFeePerSqft)
  if (area === null || rate === null) return null
  return area * rate
}

export function calcTotalBuildValue(carpetArea: string, buildValuePerSqft: string): number | null {
  const area = parsePositiveNumber(carpetArea)
  const rate = parseRateNumber(buildValuePerSqft)
  if (area === null || rate === null) return null
  return area * rate
}

export function formatProjectValueTotal(value: number | null): string {
  if (value === null) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export interface ProjectSetupWizardFields {
  headcount: string
  workstationSize: string
  meetingRoomCount: string
  serverRoomDetails: string
  upsCapacity: string
  receptionDetails: string
  pantryDetails: string
}

export interface ProjectSetupFieldErrors {
  headcount?: string
  meetingRoomCount?: string
}

function parseOptionalWholeNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null
  return n
}

function isValidOptionalWholeNumber(raw: string): boolean {
  if (!raw.trim()) return true
  return parseOptionalWholeNumber(raw) !== null
}

function parseOptionalText(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed || null
}

export function validateProjectSetupFields(
  fields: ProjectSetupWizardFields,
): ProjectSetupFieldErrors {
  const errors: ProjectSetupFieldErrors = {}
  if (!isValidOptionalWholeNumber(fields.headcount)) {
    errors.headcount = 'Enter a valid whole number'
  }
  if (!isValidOptionalWholeNumber(fields.meetingRoomCount)) {
    errors.meetingRoomCount = 'Enter a valid whole number'
  }
  return errors
}

export function buildProjectSetupPayload(fields: ProjectSetupWizardFields) {
  return {
    headcount: parseOptionalWholeNumber(fields.headcount),
    workstationSize: parseOptionalText(fields.workstationSize),
    meetingRoomCount: parseOptionalWholeNumber(fields.meetingRoomCount),
    serverRoomDetails: parseOptionalText(fields.serverRoomDetails),
    upsCapacity: parseOptionalText(fields.upsCapacity),
    receptionDetails: parseOptionalText(fields.receptionDetails),
    pantryDetails: parseOptionalText(fields.pantryDetails),
  }
}

export function getContactsForCustomer(customer: Customer | null | undefined): Contact[] {
  if (!customer) return []
  return normalizeContacts(getCustomerContactsList(customer))
}

export function buildProjectContactOptions(
  customer: Customer | null | undefined,
  vendors: Vendor[],
): ProjectContactOption[] {
  const options: ProjectContactOption[] = []
  if (customer) {
    for (const contact of getContactsForCustomer(customer)) {
      options.push({
        ...contact,
        sourceType: 'customer',
        entityId: customer.id,
        entityName: customer.name,
      })
    }
  }
  for (const vendor of vendors) {
    for (const contact of normalizeContacts(getVendorContactsList(vendor))) {
      options.push({
        ...contact,
        sourceType: 'vendor',
        entityId: vendor.id,
        entityName: vendor.name,
      })
    }
  }
  return options
}

export function findProjectContactsByIds(
  options: ProjectContactOption[],
  contactIds: string[],
): ProjectContactOption[] {
  if (!contactIds.length) return []
  return contactIds
    .map((id) => options.find((c) => c.id === id))
    .filter((c): c is ProjectContactOption => Boolean(c))
}

/** Compare phone numbers ignoring spaces, dashes, and country-code formatting. */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function contactPhoneExists(contacts: Contact[], phone: string): boolean {
  const normalized = normalizePhoneNumber(phone)
  if (!normalized) return false
  return contacts.some((c) => normalizePhoneNumber(c.phone) === normalized)
}

export function getDefaultContactId(contacts: Contact[]): string {
  if (!contacts.length) return ''
  const primary = contacts.find((c) => c.isPrimary)
  return primary?.id ?? contacts[0].id
}

export function getDefaultContactIds(contacts: Contact[]): string[] {
  const id = getDefaultContactId(contacts)
  return id ? [id] : []
}

export function clientTeamFromContacts(
  contacts: ProjectContactOption[],
  defaultCompanyName: string,
): ContactInfo[] | undefined {
  if (!contacts.length) return undefined
  return contacts.map((contact) => ({
    name: contact.name,
    designation: contact.designation,
    email: contact.email,
    phone: contact.phone,
    company:
      contact.sourceType === 'vendor' ? contact.entityName : defaultCompanyName,
  }))
}

/** @deprecated Use findProjectContactsByIds with buildProjectContactOptions */
export function findContactsByIds(
  customer: Customer | null | undefined,
  contactIds: string[],
): ProjectContactOption[] {
  return findProjectContactsByIds(
    buildProjectContactOptions(customer, []),
    contactIds,
  )
}

/** Returns a trimmed http(s) URL when the field contains a valid URL. */
export function parseHttpUrl(value: string): string | undefined {
  const text = value.trim()
  if (!text) return undefined
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : undefined
  } catch {
    return undefined
  }
}

export function fileToProjectDocument(file: File): ProjectDocumentFile {
  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    blobUrl: URL.createObjectURL(file),
  }
}

export interface ProjectDocumentFormFields {
  finalLayoutDescription: string
  finalRcpDescription: string
  finalViewsDescription: string
  finalPhotographsDescription: string
  finalHandoverDescription: string
  finalLayoutFile: File | null
  finalRcpFile: File | null
  finalViewsFile: File | null
  finalPhotographsFile: File | null
  finalHandoverFiles: File[]
}

export function buildProjectDocumentsFromForm(
  form: ProjectDocumentFormFields,
): ProjectDocuments | undefined {
  const docs: ProjectDocuments = {
    finalLayoutDescription: form.finalLayoutDescription.trim() || undefined,
    finalLayoutLink: parseHttpUrl(form.finalLayoutDescription),
    finalRcpDescription: form.finalRcpDescription.trim() || undefined,
    finalRcpLink: parseHttpUrl(form.finalRcpDescription),
    finalViewsDescription: form.finalViewsDescription.trim() || undefined,
    finalViewsLink: parseHttpUrl(form.finalViewsDescription),
    finalPhotographsDescription: form.finalPhotographsDescription.trim() || undefined,
    finalPhotographsLink: parseHttpUrl(form.finalPhotographsDescription),
    finalHandoverDescription: form.finalHandoverDescription.trim() || undefined,
    finalHandoverLink: parseHttpUrl(form.finalHandoverDescription),
    finalLayoutFile: form.finalLayoutFile
      ? fileToProjectDocument(form.finalLayoutFile)
      : undefined,
    finalRcpFile: form.finalRcpFile ? fileToProjectDocument(form.finalRcpFile) : undefined,
    finalViewsFile: form.finalViewsFile ? fileToProjectDocument(form.finalViewsFile) : undefined,
    finalPhotographsFile: form.finalPhotographsFile
      ? fileToProjectDocument(form.finalPhotographsFile)
      : undefined,
    finalHandoverDocuments:
      form.finalHandoverFiles.length > 0
        ? form.finalHandoverFiles.map((f) => fileToProjectDocument(f))
        : undefined,
    finalHandoverFile:
      form.finalHandoverFiles.length > 0
        ? fileToProjectDocument(form.finalHandoverFiles[0])
        : undefined,
  }

  const hasContent = Object.values(docs).some((v) => {
    if (v == null) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  })
  return hasContent ? docs : undefined
}

import { tokens } from '@/design-system/tokens'
import type { Contact, Customer } from '../../slices/customers/reducer'
import type {
  ContactInfo,
  ProjectDocumentFile,
  ProjectDocuments,
} from '../../slices/projects/reducer'
import { getCustomerContactsList } from '../../utils/customerContacts'
import { normalizeContacts } from '../../utils/entityContacts'

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

export function getContactsForCustomer(customer: Customer | null | undefined): Contact[] {
  if (!customer) return []
  return normalizeContacts(getCustomerContactsList(customer))
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
  contacts: Contact[],
  companyName: string,
): ContactInfo[] | undefined {
  if (!contacts.length) return undefined
  return contacts.map((contact) => ({
    name: contact.name,
    designation: contact.designation,
    email: contact.email,
    phone: contact.phone,
    company: companyName,
  }))
}

export function findContactsByIds(
  customer: Customer | null | undefined,
  contactIds: string[],
): Contact[] {
  if (!customer || !contactIds.length) return []
  const all = getContactsForCustomer(customer)
  return contactIds
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is Contact => Boolean(c))
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

import type {
  Vendor,
  VendorComplianceDocument,
  VendorDocument,
} from '@/slices/vendors/reducer'
import { buildVendorComplianceSnapshot } from '@/utils/vendorCompliance'

export type ComplianceRegistrationDocKey =
  | 'gst'
  | 'pan'
  | 'bank_cheque'
  | 'insurance'
  | 'catalogue'

export const COMPLIANCE_DOC_LABELS: Record<ComplianceRegistrationDocKey, string> = {
  gst: 'GST Registration',
  pan: 'PAN / Income Tax',
  bank_cheque: 'Bank Cancelled Cheque',
  insurance: 'Insurance',
  catalogue: 'Catalogue',
}

/** Labels used inside the bulk upload drawer. */
export const COMPLIANCE_DOC_UPLOAD_SECTION_LABELS: Record<ComplianceRegistrationDocKey, string> = {
  gst: 'GST Registration',
  pan: 'PAN Card',
  bank_cheque: 'Bank Cancelled Cheque',
  insurance: 'Insurance Document',
  catalogue: 'Catalogue',
}

export const COMPLIANCE_REGISTRATION_DOC_KEYS: ComplianceRegistrationDocKey[] = [
  'gst',
  'pan',
  'bank_cheque',
  'insurance',
  'catalogue',
]

/** Same file types as Project Documents → Upload Document drawer. */
export const COMPLIANCE_UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png'

export interface ComplianceUploadFormValues {
  file: File | null
  description: string
  expiryDate: string
}

export function catalogueDocumentToCompliance(doc: VendorDocument): VendorComplianceDocument {
  return {
    documentType: 'catalogue',
    name: doc.name,
    url: doc.url,
    description: doc.description ?? null,
    uploadedBy: doc.uploadedBy ?? null,
    uploadedOn: doc.uploadedAt ?? null,
    lastUpdatedOn: doc.lastUpdatedOn ?? doc.uploadedAt ?? null,
    expiryDate: doc.expiryDate ?? null,
  }
}

export function getVendorComplianceRegistrationDoc(
  vendor: Vendor,
  key: ComplianceRegistrationDocKey,
): VendorComplianceDocument | null {
  switch (key) {
    case 'gst':
      return vendor.gstDocument ?? null
    case 'pan':
      return vendor.panDocument ?? null
    case 'bank_cheque':
      return vendor.bankChequeDocument ?? null
    case 'insurance':
      return vendor.insuranceDocument ?? null
    case 'catalogue': {
      const catalogue = vendor.documents?.find((d) => d.type === 'Catalogue')
      return catalogue ? catalogueDocumentToCompliance(catalogue) : null
    }
    default:
      return null
  }
}

export function getInsuranceExpiryDate(vendor: Vendor): string | null {
  return vendor.compliance?.insurance?.expiryDate ?? null
}

/** Map a user-entered document name to a fixed compliance registration slot. */
export function resolveComplianceDocKeyFromDocumentName(
  name: string,
): ComplianceRegistrationDocKey | null {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return null

  const matchers: { key: ComplianceRegistrationDocKey; tokens: string[] }[] = [
    { key: 'gst', tokens: ['gst'] },
    { key: 'pan', tokens: ['pan'] },
    { key: 'bank_cheque', tokens: ['cheque', 'check', 'bank cancelled', 'cancelled cheque'] },
    { key: 'insurance', tokens: ['insurance'] },
    { key: 'catalogue', tokens: ['catalog', 'catalogue'] },
  ]

  for (const { key, tokens } of matchers) {
    if (tokens.some((token) => normalized.includes(token))) return key
  }

  for (const key of COMPLIANCE_REGISTRATION_DOC_KEYS) {
    const labels = [COMPLIANCE_DOC_LABELS[key], COMPLIANCE_DOC_UPLOAD_SECTION_LABELS[key]]
    if (labels.some((label) => normalized.includes(label.toLowerCase()))) return key
  }

  return null
}

export interface GenericComplianceUploadInput {
  documentName: string
  file: File | null
  notes: string
  uploadedBy: string
  expiryDate?: string | null
}

/** Save a single generic upload to the matching compliance card or additional documents. */
export function buildGenericComplianceUploadPatch(
  vendor: Vendor,
  input: GenericComplianceUploadInput,
): Partial<Vendor> {
  const docKey = resolveComplianceDocKeyFromDocumentName(input.documentName)
  const now = new Date().toISOString()

  if (docKey) {
    return buildComplianceUploadPatch({
      vendor,
      docKey,
      file: input.file,
      description: input.notes,
      uploadedBy: input.uploadedBy,
      expiryDate:
        docKey === 'insurance'
          ? (input.expiryDate ?? getInsuranceExpiryDate(vendor))
          : null,
    })
  }

  const url = input.file
    ? URL.createObjectURL(input.file)
    : URL.createObjectURL(
        new Blob([`Document: ${input.documentName}\n${input.notes}`], { type: 'text/plain' }),
      )

  const additionalDoc = {
    id: `vac-${Date.now()}`,
    name: input.documentName.trim(),
    fileName: input.file?.name ?? null,
    url,
    description: input.notes.trim() || null,
    uploadedBy: input.uploadedBy,
    uploadedOn: now,
    lastUpdatedOn: now,
    expiryDate: input.expiryDate ?? null,
  }

  return {
    additionalComplianceDocuments: [...(vendor.additionalComplianceDocuments ?? []), additionalDoc],
    activityLog: [
      ...(vendor.activityLog ?? []),
      {
        id: `va-${Date.now()}`,
        type: 'document_uploaded' as const,
        description: `Compliance document uploaded — ${input.documentName.trim()}`,
        user: input.uploadedBy,
        timestamp: now,
      },
    ],
  }
}

export interface BuildComplianceUploadPatchInput {
  vendor: Vendor
  docKey: ComplianceRegistrationDocKey
  file: File | null
  description: string
  uploadedBy: string
  expiryDate?: string | null
}

/** Build a partial vendor update for a compliance registration upload or replace. */
export function buildComplianceUploadPatch({
  vendor,
  docKey,
  file,
  description,
  uploadedBy,
  expiryDate,
}: BuildComplianceUploadPatchInput): Partial<Vendor> {
  const existing = getVendorComplianceRegistrationDoc(vendor, docKey)
  const isReplace = Boolean(existing)
  if (!file && !isReplace) {
    throw new Error('File is required for new uploads')
  }

  const now = new Date().toISOString()
  const docMeta: VendorComplianceDocument = {
    documentType: docKey,
    name: file?.name ?? existing!.name,
    url: file ? URL.createObjectURL(file) : existing!.url,
    description:
      docKey === 'insurance'
        ? (description.trim() || existing?.description || null)
        : description.trim() || null,
    uploadedBy: isReplace ? (existing?.uploadedBy ?? uploadedBy) : uploadedBy,
    uploadedOn: isReplace ? (existing?.uploadedOn ?? now) : now,
    lastUpdatedOn: now,
    expiryDate: docKey === 'insurance' ? (expiryDate ?? null) : null,
  }

  const label = COMPLIANCE_DOC_LABELS[docKey]
  const activityEntry = {
    id: `va-${Date.now()}`,
    type: 'document_uploaded' as const,
    description: isReplace ? `${label} updated` : `${label} uploaded`,
    user: uploadedBy,
    timestamp: now,
  }
  const activityLog = [...(vendor.activityLog ?? []), activityEntry]

  const patch: Partial<Vendor> = { activityLog }

  switch (docKey) {
    case 'gst':
      patch.gstDocument = docMeta
      break
    case 'pan':
      patch.panDocument = docMeta
      break
    case 'bank_cheque':
      patch.bankChequeDocument = docMeta
      break
    case 'insurance':
      patch.insuranceDocument = docMeta
      break
    case 'catalogue': {
      const others = (vendor.documents ?? []).filter((d) => d.type !== 'Catalogue')
      const existingCatalogue = vendor.documents?.find((d) => d.type === 'Catalogue')
      const catalogueDoc: VendorDocument = {
        id: existingCatalogue?.id ?? `vd-${Date.now()}`,
        name: file?.name ?? existingCatalogue!.name,
        type: 'Catalogue',
        uploadedAt: isReplace ? (existingCatalogue?.uploadedAt ?? now) : now,
        lastUpdatedOn: now,
        url: file ? docMeta.url : existingCatalogue!.url,
        description: docMeta.description,
        uploadedBy: docMeta.uploadedBy,
        expiryDate: null,
      }
      patch.documents = [...others, catalogueDoc]
      break
    }
    default:
      break
  }

  const mergedForCompliance: Vendor = {
    ...vendor,
    ...patch,
    gstDocument: patch.gstDocument ?? vendor.gstDocument,
    panDocument: patch.panDocument ?? vendor.panDocument,
    bankChequeDocument: patch.bankChequeDocument ?? vendor.bankChequeDocument,
    insuranceDocument: patch.insuranceDocument ?? vendor.insuranceDocument,
    documents: patch.documents ?? vendor.documents,
  }

  patch.compliance = buildVendorComplianceSnapshot(
    mergedForCompliance,
    docKey === 'insurance'
      ? (expiryDate ?? null)
      : (mergedForCompliance.compliance?.insurance?.expiryDate ?? null),
  )

  return patch
}

/** Remove a compliance registration document from a vendor. */
export function buildComplianceDeletePatch(
  vendor: Vendor,
  docKey: ComplianceRegistrationDocKey,
  deletedBy: string,
): Partial<Vendor> {
  const label = COMPLIANCE_DOC_LABELS[docKey]
  const now = new Date().toISOString()
  const activityEntry = {
    id: `va-${Date.now()}`,
    type: 'document_uploaded' as const,
    description: `${label} document removed`,
    user: deletedBy,
    timestamp: now,
  }

  const patch: Partial<Vendor> = {
    activityLog: [...(vendor.activityLog ?? []), activityEntry],
  }

  switch (docKey) {
    case 'gst':
      patch.gstDocument = null
      break
    case 'pan':
      patch.panDocument = null
      break
    case 'bank_cheque':
      patch.bankChequeDocument = null
      break
    case 'insurance':
      patch.insuranceDocument = null
      break
    case 'catalogue':
      patch.documents = (vendor.documents ?? []).filter((d) => d.type !== 'Catalogue')
      break
    default:
      break
  }

  const mergedForCompliance: Vendor = {
    ...vendor,
    ...patch,
    gstDocument: patch.gstDocument !== undefined ? patch.gstDocument : vendor.gstDocument,
    panDocument: patch.panDocument !== undefined ? patch.panDocument : vendor.panDocument,
    bankChequeDocument:
      patch.bankChequeDocument !== undefined ? patch.bankChequeDocument : vendor.bankChequeDocument,
    insuranceDocument:
      patch.insuranceDocument !== undefined ? patch.insuranceDocument : vendor.insuranceDocument,
    documents: patch.documents ?? vendor.documents,
  }

  patch.compliance = buildVendorComplianceSnapshot(
    mergedForCompliance,
    mergedForCompliance.compliance?.insurance?.expiryDate ?? null,
  )

  return patch
}

export interface ComplianceSectionUploadInput {
  docKey: ComplianceRegistrationDocKey
  file: File | null
  description: string
  expiryDate?: string | null
}

export function sectionHasChanges(
  vendor: Vendor,
  section: ComplianceSectionUploadInput,
): boolean {
  const existing = getVendorComplianceRegistrationDoc(vendor, section.docKey)
  const desc = section.description.trim()
  const prevDesc = existing?.description?.trim() ?? ''
  const descChanged = section.docKey !== 'insurance' && desc !== prevDesc

  if (section.file) return true
  if (!existing) return false

  if (descChanged) return true

  if (section.docKey === 'insurance') {
    const prevExpiry = getInsuranceExpiryDate(vendor)?.slice(0, 10) ?? ''
    const nextExpiry = section.expiryDate?.slice(0, 10) ?? ''
    if (nextExpiry && nextExpiry !== prevExpiry) return true
  }

  return false
}

/** Merge multiple compliance document uploads into one vendor update payload. */
export function buildComplianceBatchUploadPatch(
  vendor: Vendor,
  sections: ComplianceSectionUploadInput[],
  uploadedBy: string,
): Partial<Vendor> | null {
  const changed = sections.filter((section) => sectionHasChanges(vendor, section))
  if (changed.length === 0) return null

  let workingVendor = vendor
  const newActivity: NonNullable<Vendor['activityLog']> = []

  for (const section of changed) {
    const existing = getVendorComplianceRegistrationDoc(workingVendor, section.docKey)
    if (section.docKey === 'insurance' && section.file && !section.expiryDate) {
      throw new Error('Insurance expiry date is required when uploading an insurance document')
    }
    if (
      section.docKey === 'insurance' &&
      !section.expiryDate &&
      !getInsuranceExpiryDate(workingVendor) &&
      (section.file || existing)
    ) {
      throw new Error('Insurance expiry date is required')
    }

    const patch = buildComplianceUploadPatch({
      vendor: workingVendor,
      docKey: section.docKey,
      file: section.file,
      description: section.description,
      uploadedBy,
      expiryDate:
        section.docKey === 'insurance'
          ? (section.expiryDate ?? getInsuranceExpiryDate(workingVendor))
          : null,
    })

    const addedEntries = (patch.activityLog ?? []).slice(workingVendor.activityLog?.length ?? 0)
    newActivity.push(...addedEntries)

    workingVendor = {
      ...workingVendor,
      ...patch,
      gstDocument: patch.gstDocument ?? workingVendor.gstDocument,
      panDocument: patch.panDocument ?? workingVendor.panDocument,
      bankChequeDocument: patch.bankChequeDocument ?? workingVendor.bankChequeDocument,
      insuranceDocument: patch.insuranceDocument ?? workingVendor.insuranceDocument,
      documents: patch.documents ?? workingVendor.documents,
      compliance: patch.compliance ?? workingVendor.compliance,
      activityLog: [
        ...(workingVendor.activityLog ?? []),
        ...addedEntries,
      ],
    }
  }

  return {
    gstDocument: workingVendor.gstDocument,
    panDocument: workingVendor.panDocument,
    bankChequeDocument: workingVendor.bankChequeDocument,
    insuranceDocument: workingVendor.insuranceDocument,
    documents: workingVendor.documents,
    compliance: workingVendor.compliance,
    activityLog: [...(vendor.activityLog ?? []), ...newActivity],
  }
}

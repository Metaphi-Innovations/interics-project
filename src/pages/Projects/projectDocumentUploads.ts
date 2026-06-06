import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'

/** Document upload categories (aligned with Documents tab). */
export type UploadCategory =
  | 'client_quotation'
  | 'client_po'
  | 'vendor_quotation'
  | 'vendor_po'
  | 'vendor_invoice_doc'
  | 'internal_requirements'
  | 'internal_attachments'
  | 'other'

/** Former "Internal" tab uploads — surfaced under Project Documents. */
export const LEGACY_INTERNAL_UPLOAD_CATEGORIES: UploadCategory[] = [
  'internal_requirements',
  'internal_attachments',
  'other',
]

export function isLegacyInternalUploadCategory(
  category: UploadCategory,
): boolean {
  return LEGACY_INTERNAL_UPLOAD_CATEGORIES.includes(category)
}

export interface UploadedProjectDocument {
  id: string
  projectId: string
  displayName: string
  category: UploadCategory
  fileName: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  uploadedByUserId: string
  notes: string
  blobUrl: string
}

const uploadsByProject = new Map<string, UploadedProjectDocument[]>()
const listeners = new Set<() => void>()

/** Stable empty snapshot for useSyncExternalStore (must not allocate per read). */
const EMPTY_UPLOADS: UploadedProjectDocument[] = []

function notify(): void {
  listeners.forEach((l) => l())
}

function snapshotForProject(projectId: string): UploadedProjectDocument[] {
  return uploadsByProject.get(projectId) ?? EMPTY_UPLOADS
}

export function getProjectUploads(projectId: string): UploadedProjectDocument[] {
  return [...snapshotForProject(projectId)]
}

export function addProjectUpload(doc: UploadedProjectDocument): void {
  const list = uploadsByProject.get(doc.projectId) ?? []
  uploadsByProject.set(doc.projectId, [...list, doc])
  notify()
}

export function removeProjectUpload(id: string): UploadedProjectDocument | undefined {
  for (const [projectId, list] of uploadsByProject.entries()) {
    const found = list.find((u) => u.id === id)
    if (!found) continue
    URL.revokeObjectURL(found.blobUrl)
    uploadsByProject.set(
      projectId,
      list.filter((u) => u.id !== id),
    )
    notify()
    return found
  }
  return undefined
}

export function clearProjectUploads(projectId: string): void {
  const list = uploadsByProject.get(projectId) ?? []
  list.forEach((u) => URL.revokeObjectURL(u.blobUrl))
  uploadsByProject.set(projectId, [])
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getServerSnapshot(): UploadedProjectDocument[] {
  return EMPTY_UPLOADS
}

export function useProjectDocumentUploads(projectId: string): {
  uploads: UploadedProjectDocument[]
  setUploads: Dispatch<SetStateAction<UploadedProjectDocument[]>>
  addUpload: (doc: UploadedProjectDocument) => void
  removeUpload: (id: string) => void
} {
  const uploads = useSyncExternalStore(
    subscribe,
    () => snapshotForProject(projectId),
    getServerSnapshot,
  )

  const setUploads = useCallback(
    (action: SetStateAction<UploadedProjectDocument[]>) => {
      const prev = snapshotForProject(projectId)
      const next = typeof action === 'function' ? action(prev) : action
      prev
        .filter((u) => !next.some((n) => n.id === u.id))
        .forEach((u) => URL.revokeObjectURL(u.blobUrl))
      uploadsByProject.set(projectId, next)
      notify()
    },
    [projectId],
  )

  const addUpload = useCallback((doc: UploadedProjectDocument) => {
    addProjectUpload(doc)
  }, [])

  const removeUpload = useCallback((id: string) => {
    removeProjectUpload(id)
  }, [])

  return { uploads, setUploads, addUpload, removeUpload }
}

export interface RegisterVendorQuotationInput {
  projectId: string
  file: File
  vendorName: string
  serviceName: string
  notes?: string
  uploadedBy: string
  uploadedByUserId: string
}

/** Register a vendor quotation file for the Documents tab (Vendor Quotations subsection). */
export function registerVendorQuotationUpload(input: RegisterVendorQuotationInput): UploadedProjectDocument {
  const blobUrl = URL.createObjectURL(input.file)
  const doc: UploadedProjectDocument = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    displayName: `${input.vendorName} — ${input.serviceName}`,
    category: 'vendor_quotation',
    fileName: input.file.name,
    sizeBytes: input.file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
    uploadedByUserId: input.uploadedByUserId,
    notes: input.notes?.trim() ?? '',
    blobUrl,
  }
  addProjectUpload(doc)
  return doc
}

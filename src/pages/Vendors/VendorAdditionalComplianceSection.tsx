import { Stack } from '@mui/material'
import {
  RecordDetailTaxDocCard,
  type RecordDetailTaxDocCardDocument,
} from '@/pages/workspace/recordDetailTabUtils'
import { resolveComplianceDocKeyFromDocumentName } from '@/utils/vendorComplianceDocuments'

export type UploadedCompliancePlacement = 'below-catalogue-insurance' | 'below-catalogue'

/** Session-only upload preview — not persisted after page refresh. */
export interface UploadedCompliancePreview {
  id: string
  name: string
  notes: string
  fileName: string | null
  blobUrl: string | null
  placement: UploadedCompliancePlacement
}

function toCardDocument(doc: UploadedCompliancePreview): RecordDetailTaxDocCardDocument | null {
  const hasFile = Boolean(doc.blobUrl)
  const hasNotes = Boolean(doc.notes.trim())
  if (!hasFile && !hasNotes) return null
  return {
    name: doc.fileName ?? doc.name,
    url: doc.blobUrl ?? '#',
    description: doc.notes.trim() || null,
    uploadedOn: null,
    uploadedBy: null,
  }
}

export interface UploadedCompliancePreviewCardProps {
  doc: UploadedCompliancePreview
  onView: (url: string) => void
  onDownload: (url: string) => void
  onCopySuccess: () => void
  onDelete?: (id: string) => void
}

export function UploadedCompliancePreviewCard({
  doc,
  onView,
  onDownload,
  onCopySuccess,
  onDelete,
}: UploadedCompliancePreviewCardProps) {
  function handleView() {
    if (doc.blobUrl) onView(doc.blobUrl)
  }

  function handleDownload() {
    if (doc.blobUrl) onDownload(doc.blobUrl)
  }

  return (
    <RecordDetailTaxDocCard
      variant={doc.placement === 'below-catalogue-insurance' ? 'insurance' : 'catalogue'}
      title={doc.name}
      showHeaderIcon={false}
      showUploadMeta={false}
      fieldLabel="Uploaded"
      fieldValue="Just now"
      document={toCardDocument(doc)}
      emptyDocMessage="No file attached"
      onView={handleView}
      onDownload={handleDownload}
      onCopySuccess={onCopySuccess}
      onDelete={onDelete ? () => onDelete(doc.id) : undefined}
    />
  )
}

export interface UploadedCompliancePreviewStackProps {
  documents: UploadedCompliancePreview[]
  onView: (url: string) => void
  onDownload: (url: string) => void
  onCopySuccess: () => void
  onDelete?: (id: string) => void
  stackTopSpacing?: boolean
}

export function UploadedCompliancePreviewStack({
  documents,
  onView,
  onDownload,
  onCopySuccess,
  onDelete,
  stackTopSpacing = true,
}: UploadedCompliancePreviewStackProps) {
  if (documents.length === 0) return null

  return (
    <Stack gap={1.5} sx={stackTopSpacing ? { mt: 1.5 } : undefined}>
      {documents.map((doc) => (
        <UploadedCompliancePreviewCard
          key={doc.id}
          doc={doc}
          onView={onView}
          onDownload={onDownload}
          onCopySuccess={onCopySuccess}
          onDelete={onDelete}
        />
      ))}
    </Stack>
  )
}

function resolveUploadedCompliancePlacement(documentName: string): UploadedCompliancePlacement {
  return resolveComplianceDocKeyFromDocumentName(documentName) === 'insurance'
    ? 'below-catalogue-insurance'
    : 'below-catalogue'
}

export function createUploadedCompliancePreview(
  values: { documentName: string; file: File | null; notes: string },
): UploadedCompliancePreview {
  const name = values.documentName.trim()
  return {
    id: `local-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    notes: values.notes.trim(),
    fileName: values.file?.name ?? null,
    blobUrl: values.file ? URL.createObjectURL(values.file) : null,
    placement: resolveUploadedCompliancePlacement(name),
  }
}

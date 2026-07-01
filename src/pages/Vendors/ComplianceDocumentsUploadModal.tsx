import { useEffect, useState } from 'react'
import { DocumentUploadFormBody } from '@/components/forms/DocumentUploadFormBody'
import { DrawerForm } from '@/components/templates'

export interface ComplianceDocumentUploadValues {
  documentName: string
  file: File | null
  notes: string
  expiryDate: string | null
}

export interface ComplianceDocumentsUploadModalProps {
  open: boolean
  onClose: () => void
  saving?: boolean
  onSubmit: (values: ComplianceDocumentUploadValues) => void | Promise<void>
}

export function ComplianceDocumentsUploadModal({
  open,
  onClose,
  saving = false,
  onSubmit,
}: ComplianceDocumentsUploadModalProps) {
  const [docName, setDocName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState<Date | null>(null)
  const [nameError, setNameError] = useState<string | undefined>()
  const [uploadResetKey, setUploadResetKey] = useState(0)

  useEffect(() => {
    if (!open) {
      setDocName('')
      setSelectedFiles([])
      setNotes('')
      setExpiryDate(null)
      setNameError(undefined)
      setUploadResetKey((k) => k + 1)
      return
    }
    setNameError(undefined)
    setUploadResetKey((k) => k + 1)
  }, [open])

  async function handleSubmit() {
    if (!docName.trim()) {
      setNameError('Document name is required')
      return
    }
    setNameError(undefined)
    await onSubmit({
      documentName: docName.trim(),
      file: selectedFiles[0] ?? null,
      notes: notes.trim(),
      expiryDate: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
    })
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Upload Document"
      width={480}
      submitLabel={saving ? 'Uploading…' : 'Upload'}
      cancelLabel="Cancel"
      submitLoading={saving}
      onSubmit={() => void handleSubmit()}
    >
      <DocumentUploadFormBody
        docName={docName}
        onDocNameChange={setDocName}
        onFilesChange={setSelectedFiles}
        notes={notes}
        onNotesChange={setNotes}
        nameError={nameError}
        uploadResetKey={uploadResetKey}
        expiryDate={expiryDate}
        onExpiryDateChange={setExpiryDate}
      />
    </DrawerForm>
  )
}

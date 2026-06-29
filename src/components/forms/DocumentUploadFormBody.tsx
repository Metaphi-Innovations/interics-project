import type { ReactNode } from 'react'
import { Box, Stack } from '@mui/material'
import { DatePicker, FileUpload, Input, Textarea } from '@/design-system/components'
import { FormField } from '@/components/templates'

/** Shared accept list — Project Documents upload drawer. */
export const DOCUMENT_UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png'

export interface DocumentUploadFormBodyProps {
  docName: string
  onDocNameChange: (value: string) => void
  onFilesChange: (files: File[]) => void
  notes?: string
  onNotesChange?: (value: string) => void
  nameError?: string
  /** Inserted between Document Name and File (e.g. category select). */
  middleSlot?: ReactNode
  fileHint?: string
  notesLabel?: string
  notesPlaceholder?: string
  uploadResetKey?: number
  expiryDate?: Date | null
  onExpiryDateChange?: (date: Date | null) => void
  expiryDateLabel?: string
  /** When false, hides the notes / description field. Defaults to true. */
  showNotes?: boolean
  /** When false, omits the required asterisk on Document Name. Defaults to true. */
  docNameRequired?: boolean
}

export function DocumentUploadFormBody({
  docName,
  onDocNameChange,
  onFilesChange,
  notes = '',
  onNotesChange,
  nameError,
  middleSlot,
  fileHint = 'Optional',
  notesLabel = 'Notes',
  notesPlaceholder = 'Add context for your team…',
  uploadResetKey = 0,
  expiryDate = null,
  onExpiryDateChange,
  expiryDateLabel = 'Expiry Date',
  showNotes = true,
  docNameRequired = true,
}: DocumentUploadFormBodyProps) {
  return (
    <Stack gap={2}>
      <FormField label="Document Name" required={docNameRequired} error={nameError}>
        <Input value={docName} onChange={onDocNameChange} size="sm" />
      </FormField>

      {middleSlot}

      <FormField label="File" hint={fileHint}>
        <Box sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          <FileUpload
            key={uploadResetKey}
            accept={DOCUMENT_UPLOAD_ACCEPT}
            multiple={false}
            showAcceptText={false}
            onUpload={onFilesChange}
            helperText="PDF, Word, Excel, JPG, PNG"
            sx={{ width: '100%', maxWidth: '100%' }}
          />
        </Box>
      </FormField>

      {onExpiryDateChange ? (
        <FormField label={expiryDateLabel} hint="Optional">
          <DatePicker
            value={expiryDate}
            onChange={onExpiryDateChange}
            fullWidth
            size="sm"
          />
        </FormField>
      ) : null}

      {showNotes ? (
        <FormField label={notesLabel} hint="Optional">
          <Textarea
            value={notes}
            onChange={onNotesChange ?? (() => undefined)}
            minRows={3}
            placeholder={notesPlaceholder}
            fullWidth
          />
        </FormField>
      ) : null}
    </Stack>
  )
}

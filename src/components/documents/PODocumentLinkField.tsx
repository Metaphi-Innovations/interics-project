import { Box, Typography } from '@mui/material'
import { UploadedDocumentLink } from './UploadedDocumentLink'

export function poDocumentOpenUrl(documentUrl?: string | null): string | null {
  if (!documentUrl?.trim() || documentUrl.startsWith('local://')) return null
  return documentUrl
}

export function poDocumentDisplayFileName(fileName?: string | null): string | null {
  const trimmed = fileName?.trim()
  return trimmed || null
}

export interface PODocumentLinkFieldProps {
  label?: string
  fileName?: string | null
  documentUrl?: string | null
  onOpenFailed?: () => void
  emptyLabel?: string
}

export function PODocumentLinkField({
  label = 'PO Document',
  fileName,
  documentUrl,
  onOpenFailed,
  emptyLabel = '—',
}: PODocumentLinkFieldProps) {
  const displayName = poDocumentDisplayFileName(fileName)
  const openUrl = poDocumentOpenUrl(documentUrl)

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.25, minWidth: 0 }}>
        {displayName && openUrl ? (
          <UploadedDocumentLink
            fileName={displayName}
            documentUrl={openUrl}
            onOpenFailed={onOpenFailed}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}
          >
            {emptyLabel}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

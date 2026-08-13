import { Box, Typography } from '@mui/material'
import { UploadedDocumentLink } from './UploadedDocumentLink'
import { resolveApiAssetUrl } from '@/utils/openAuthenticatedDocument'

export function poDocumentOpenUrl(documentUrl?: string | null): string | null {
  return resolveApiAssetUrl(documentUrl)
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
  /** Align the link with the bottom of an adjacent form input (e.g. Executed Value). */
  alignWithInput?: boolean
}

export function PODocumentLinkField({
  label = 'PO Document',
  fileName,
  documentUrl,
  onOpenFailed,
  emptyLabel = '—',
  alignWithInput = false,
}: PODocumentLinkFieldProps) {
  const displayName = poDocumentDisplayFileName(fileName)
  const openUrl = poDocumentOpenUrl(documentUrl)

  // Keep the filename visible even if URL resolution fails — click still reports failure.
  const valueContent = displayName ? (
    <UploadedDocumentLink
      fileName={displayName}
      documentUrl={openUrl}
      onOpenFailed={onOpenFailed}
      compact={false}
    />
  ) : (
    <Typography
      variant="body2"
      sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}
    >
      {emptyLabel}
    </Typography>
  )

  if (alignWithInput) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          height: '100%',
          minWidth: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          {label}
        </Typography>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', minWidth: 0 }}>
          {valueContent}
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
      <Box
        sx={{
          mt: 0.25,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          minHeight: 20,
        }}
      >
        {valueContent}
      </Box>
    </Box>
  )
}

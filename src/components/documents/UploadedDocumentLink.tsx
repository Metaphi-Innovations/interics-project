import { Box, Stack, Typography } from '@mui/material'
import { FileText } from 'lucide-react'
import { tokens } from '@/design-system/tokens'

export interface UploadedDocumentLinkProps {
  fileName: string
  documentUrl?: string | null
  onOpen?: () => void
  onOpenFailed?: () => void
  /** Match read-only field value typography (13px) instead of compact link style (12px). */
  compact?: boolean
}

export function UploadedDocumentLink({
  fileName,
  documentUrl,
  onOpen,
  onOpenFailed,
  compact = true,
}: UploadedDocumentLinkProps) {
  function handleOpen(): void {
    if (onOpen) {
      onOpen()
      return
    }
    if (documentUrl) {
      window.open(documentUrl, '_blank', 'noopener,noreferrer')
      return
    }
    onOpenFailed?.()
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{
        minWidth: 0,
        maxWidth: '100%',
        cursor: 'pointer',
        '&:hover .uploaded-document-link-label': {
          textDecoration: 'underline',
        },
      }}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${fileName}`}
    >
      <Box sx={{ color: tokens.color.primary[500], flexShrink: 0, display: 'flex' }}>
        <FileText size={compact ? 16 : 14} strokeWidth={2} color={tokens.color.primary[500]} />
      </Box>
      <Typography
        className="uploaded-document-link-label"
        variant="body2"
        title={fileName}
        sx={{
          fontSize: compact ? 12 : 13,
          fontWeight: compact ? 600 : 500,
          lineHeight: compact ? undefined : 1.5,
          color: 'primary.main',
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {fileName}
      </Typography>
    </Stack>
  )
}

import { Box, Stack, Typography } from '@mui/material'
import { FileText } from 'lucide-react'
import { tokens } from '@/design-system/tokens'

export interface UploadedDocumentLinkProps {
  fileName: string
  documentUrl?: string | null
  onOpen?: () => void
  onOpenFailed?: () => void
}

export function UploadedDocumentLink({
  fileName,
  documentUrl,
  onOpen,
  onOpenFailed,
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
        <FileText size={16} strokeWidth={2} color={tokens.color.primary[500]} />
      </Box>
      <Typography
        className="uploaded-document-link-label"
        variant="body2"
        title={fileName}
        sx={{
          fontSize: 12,
          fontWeight: 600,
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

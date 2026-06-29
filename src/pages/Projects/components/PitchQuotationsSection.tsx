import { useMemo, useState } from 'react'
import {
  Box,
  Button as MuiButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton as MuiIconButton,
  Stack,
  Typography,
} from '@mui/material'
import { Delete, Upload as MuiUploadIcon } from '@mui/icons-material'
import { alpha, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { FileText } from 'lucide-react'
import { useToast } from '@/design-system/components'
import { DocumentUploadFormBody } from '@/components/forms/DocumentUploadFormBody'
import { tokens } from '@/design-system/tokens'
import { useAppSelector } from '@/store/hooks'
import {
  openProjectUploadInNewTab,
  registerClientQuotationUpload,
  useProjectDocumentUploads,
  type UploadedProjectDocument,
} from '../projectDocumentUploads'

const CARD_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  px: 2,
  py: 1,
  bgcolor: 'background.paper',
  mb: 3,
} as const

const QUOTATION_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 1,
  mt: 1,
} as const

function viewQuotationDocument(
  doc: UploadedProjectDocument,
  showToast: ReturnType<typeof useToast>['showToast'],
): void {
  const opened = openProjectUploadInNewTab(doc)
  if (!opened) {
    showToast({
      title: 'Unable to open document',
      description: 'The file is no longer available in this session. Upload it again.',
      variant: 'error',
    })
  }
}

function quotationDocCardSx(theme: Theme) {
  return {
    px: 1.25,
    py: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    border: '1px solid',
    borderColor: theme.palette.mode === 'dark' ? tokens.color.neutral[700] : theme.palette.divider,
    borderRadius: 1,
    transition: 'background-color 0.15s ease',
    '&:hover': {
      bgcolor: alpha(theme.palette.primary.main, 0.03),
    },
  } as const
}

interface PitchQuotationsSectionProps {
  projectId: string
}

export function PitchQuotationsSection({ projectId }: PitchQuotationsSectionProps) {
  const theme = useTheme()
  const { showToast } = useToast()
  const authUser = useAppSelector((s) => s.auth.user)
  const { uploads, removeUpload } = useProjectDocumentUploads(projectId)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UploadedProjectDocument | null>(null)
  const [docName, setDocName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadResetKey, setUploadResetKey] = useState(0)

  const clientQuotations = useMemo(() => {
    return uploads
      .filter((u) => u.projectId === projectId && u.category === 'client_quotation')
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  }, [uploads, projectId])

  function resetUploadForm(): void {
    setDocName('')
    setSelectedFiles([])
    setUploadResetKey((k) => k + 1)
  }

  function openCreateDialog(): void {
    resetUploadForm()
    setUploadOpen(true)
  }

  function closeUploadDialog(): void {
    setUploadOpen(false)
    resetUploadForm()
  }

  function handleUploadSubmit(): void {
    const file = selectedFiles[0]
    if (!file) {
      showToast({ title: 'Please select a file to upload', variant: 'error' })
      return
    }

    const uid = authUser?.id ?? 'unknown'
    const uname = authUser?.name ?? 'Unknown'
    const displayName = docName.trim() || file.name.replace(/\.[^/.]+$/, '') || file.name

    registerClientQuotationUpload({
      projectId,
      file,
      displayName,
      uploadedBy: uname,
      uploadedByUserId: uid,
    })
    showToast({ title: 'Quotation uploaded', variant: 'success' })

    closeUploadDialog()
  }

  function handleDelete(): void {
    if (!deleteTarget) return
    removeUpload(deleteTarget.id)
    showToast({ title: 'Quotation deleted', variant: 'success' })
    setDeleteTarget(null)
  }

  function canDelete(doc: UploadedProjectDocument): boolean {
    if (!authUser?.id) return false
    return doc.uploadedByUserId === authUser.id
  }

  return (
    <>
      <Box sx={CARD_SX}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography variant="subtitle1" sx={{ fontSize: 15, fontWeight: 600 }}>
            Quotation{clientQuotations.length > 0 ? ` (${clientQuotations.length})` : ''}
          </Typography>
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<MuiUploadIcon fontSize="small" />}
            sx={{ height: 32, fontSize: 12 }}
            onClick={openCreateDialog}
          >
            Upload Quotation
          </MuiButton>
        </Stack>

        {clientQuotations.length > 0 ? (
          <Box sx={QUOTATION_GRID_SX}>
            {clientQuotations.map((doc) => (
              <Box key={doc.id} sx={quotationDocCardSx(theme)}>
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                  onClick={() => viewQuotationDocument(doc, showToast)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      viewQuotationDocument(doc, showToast)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${doc.displayName}`}
                >
                  <Box sx={{ color: tokens.color.primary[500], flexShrink: 0, display: 'flex' }}>
                    <FileText size={16} strokeWidth={2} color={tokens.color.primary[500]} />
                  </Box>
                  <Typography
                    variant="body2"
                    title={doc.displayName}
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
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {doc.displayName}
                  </Typography>
                </Stack>
                {canDelete(doc) ? (
                  <MuiIconButton
                    size="small"
                    aria-label="Delete quotation"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(doc)
                    }}
                    sx={{ color: 'error.main', p: 0.25, ml: 0.5, flexShrink: 0 }}
                  >
                    <Delete sx={{ fontSize: 16 }} />
                  </MuiIconButton>
                ) : null}
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>

      <Dialog open={uploadOpen} onClose={closeUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Upload Quotation</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <DocumentUploadFormBody
              docName={docName}
              onDocNameChange={setDocName}
              onFilesChange={setSelectedFiles}
              fileHint="Required"
              showNotes={false}
              docNameRequired={false}
              uploadResetKey={uploadResetKey}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={closeUploadDialog}>
            Cancel
          </MuiButton>
          <MuiButton size="small" variant="contained" onClick={handleUploadSubmit}>
            Upload
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>Delete quotation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 13, pt: 0.5 }}>
            Delete &ldquo;{deleteTarget?.displayName}&rdquo;? This removes it from Pitch and Documents.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setDeleteTarget(null)}>
            Cancel
          </MuiButton>
          <MuiButton size="small" variant="contained" color="error" onClick={handleDelete}>
            Delete
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  )
}

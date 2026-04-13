import type { ReactNode } from 'react'
import { Drawer, Box, Stack } from '@mui/material'
import { Typography } from '@mui/material'
import { CircularProgress } from '@mui/material'
import { Button as MuiButton, IconButton as MuiIconButton } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloseIcon from '@mui/icons-material/Close'
import { tokens } from '@/design-system/tokens'

interface DrawerFormProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  /** Used by the default footer; omit when using `footer` or `hideFooter`. */
  onSubmit?: () => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  submitLoading?: boolean
  submitDisabled?: boolean
  children: ReactNode
  width?: number
  /** When set, replaces the default Cancel / Submit footer. */
  footer?: ReactNode
  /** Hide footer entirely (e.g. read-only drawer with actions in header). */
  hideFooter?: boolean
}

export function DrawerForm({
  open,
  onClose,
  title,
  subtitle,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitLoading = false,
  submitDisabled = false,
  children,
  width = 520,
  footer,
  hideFooter = false,
}: DrawerFormProps) {
  const handleCancel = onCancel ?? onClose

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', lg: `${width}px` },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: '1px solid #E2E8E6',
          borderRadius: '12px 0 0 12px',
        },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{
          px: '20px',
          py: '16px',
          flexShrink: 0,
          borderBottom: `1px solid ${tokens.color.neutral[100]}`,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} lineHeight={1.3}>
            {title}
          </Typography>
          {subtitle != null && subtitle !== '' && (
            <Box sx={{ mt: 0.5 }}>
              {typeof subtitle === 'string' || typeof subtitle === 'number' ? (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : (
                subtitle
              )}
            </Box>
          )}
        </Box>
        <MuiIconButton
          size="small"
          onClick={onClose}
          sx={{
            color: tokens.color.neutral[400],
            '&:hover': { bgcolor: tokens.color.neutral[100] },
          }}
        >
          <CloseIcon fontSize="small" />
        </MuiIconButton>
      </Stack>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: '20px' }}>
        {children}
      </Box>

      {/* Footer */}
      {footer !== undefined ? (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${tokens.color.neutral[100]}`,
            bgcolor: 'background.paper',
          }}
        >
          {footer}
        </Box>
      ) : hideFooter ? null : (
        <Stack
          direction="row"
          justifyContent="flex-end"
          gap={1}
          sx={{
            px: '20px',
            py: '14px',
            flexShrink: 0,
            borderTop: `1px solid ${tokens.color.neutral[100]}`,
            bgcolor: 'background.paper',
          }}
        >
          <MuiButton
            variant="outlined"
            size="small"
            onClick={handleCancel}
            disabled={submitLoading}
            sx={{ height: 32 }}
          >
            {cancelLabel}
          </MuiButton>
          <MuiButton
            variant="contained"
            size="small"
            onClick={onSubmit ?? (() => {})}
            disabled={submitDisabled || submitLoading}
            endIcon={
              submitLoading
                ? <CircularProgress size={12} color="inherit" />
                : <ArrowForwardIcon fontSize="small" />
            }
            sx={{ height: 32, minWidth: 90 }}
          >
            {submitLabel}
          </MuiButton>
        </Stack>
      )}
    </Drawer>
  )
}

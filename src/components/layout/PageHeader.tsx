import { Box, Stack, Typography, IconButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import { Breadcrumb, Divider } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: { label: string; href?: string }[]
  backHref?: string
  onBack?: () => void
  actions?: ReactNode
  sx?: SxProps<Theme>
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumb,
  backHref,
  onBack,
  actions,
  sx,
}: PageHeaderProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) {
      onBack()
      return
    }
    if (backHref) {
      navigate(backHref)
    }
  }

  return (
    <Box sx={[{ mb: 3 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {breadcrumb ? (
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 2 }}>
          {(backHref || onBack) ? (
            <IconButton
              size="small"
              onClick={handleBack}
              aria-label="Go back"
              sx={{ color: tokens.color.neutral[500], p: 0.25, mr: 0.25 }}
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} />
            </IconButton>
          ) : null}
          <Breadcrumb items={breadcrumb} sx={{ mb: 0 }} />
        </Stack>
      ) : null}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={2}
        sx={{ mb: 2 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: subtitle ? 0.75 : 0 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {actions}
          </Box>
        )}
      </Stack>
      <Divider />
    </Box>
  )
}

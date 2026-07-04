import type { ReactNode } from 'react'
import { Box, Stack } from '@mui/material'
import { Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { TREND_COLORS } from '@/design-system/tokens'

const FIELD_LABEL_COLOR = TREND_COLORS.neutral.color

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
  fullWidth?: boolean
}

export function FormField({
  label,
  required = false,
  error,
  hint,
  children,
  fullWidth = true,
}: FormFieldProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {/* Label row */}
      <Box component="span">
        <Typography
          component="span"
          variant="caption"
          sx={{ fontWeight: 500, color: FIELD_LABEL_COLOR, fontSize: '11px' }}
        >
          {label}
        </Typography>
        {required && (
          <Typography
            component="span"
            variant="caption"
            sx={{ color: 'error.main', ml: '2px', fontSize: '11px' }}
          >
            *
          </Typography>
        )}
      </Box>

      {/* Input */}
      {children}

      {/* Error */}
      {error && (
        <Stack direction="row" alignItems="center" gap={0.5}>
          <ErrorOutlineIcon sx={{ fontSize: 11, color: 'error.main' }} />
          <Typography variant="caption" color="error.main">
            {error}
          </Typography>
        </Stack>
      )}

      {/* Hint (only if no error) */}
      {!error && hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  )
}

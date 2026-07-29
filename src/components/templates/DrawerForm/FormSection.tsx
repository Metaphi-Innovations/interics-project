import type { ReactNode } from 'react'
import { Box, Divider } from '@mui/material'
import { Typography } from '@mui/material'
import { TREND_COLORS } from '@/design-system/tokens'

const SECTION_TITLE_COLOR = TREND_COLORS.neutral.color

interface FormSectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  columns?: 1 | 2 | 3
  divider?: boolean
}

export function FormSection({
  title,
  subtitle,
  children,
  columns = 1,
  divider = true,
}: FormSectionProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {divider && <Divider sx={{ mb: 2 }} />}
      {title && (
        <Typography
          component="span"
          variant="overline"
          sx={{
            display: 'block',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.8px',
            color: SECTION_TITLE_COLOR,
            textTransform: 'uppercase',
            mb: '12px',
          }}
        >
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: '-8px', mb: '12px' }}
        >
          {subtitle}
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '12px',
          minWidth: 0,
          maxWidth: '100%',
          '& > *': { minWidth: 0, maxWidth: '100%' },
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

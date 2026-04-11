import type { ReactNode } from 'react'
import { Box, Card, CardContent, Divider } from '@mui/material'
import { Typography } from '@mui/material'
import { tokens } from '@/design-system/tokens'

interface FullPageFormSectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  columns?: 1 | 2 | 3
  divider?: boolean
}

export function FullPageFormSection({
  title,
  subtitle,
  children,
  columns = 2,
  divider = true,
}: FullPageFormSectionProps) {
  return (
    <Card
      sx={{
        mb: '20px',
        border: `1px solid ${tokens.color.neutral[100]}`,
        boxShadow: 'none',
        borderRadius: '8px',
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          px: '16px',
          py: '12px',
          borderBottom: divider ? `1px solid ${tokens.color.neutral[100]}` : 'none',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, fontSize: '13px' }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Card content */}
      <CardContent sx={{ p: '16px !important' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '14px',
          }}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  )
}

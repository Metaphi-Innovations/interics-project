import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface DashboardSectionProps {
  title: string
  children: ReactNode
}

export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        {title.toUpperCase()}
      </Typography>
      {children}
    </Box>
  )
}

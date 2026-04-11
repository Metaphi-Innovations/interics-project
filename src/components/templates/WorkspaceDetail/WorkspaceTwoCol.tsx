import { Box } from '@mui/material'
import type { ReactNode } from 'react'

interface WorkspaceTwoColProps {
  children: ReactNode
  sidebarWidth?: number
}

export function WorkspaceTwoCol({ children, sidebarWidth = 320 }: WorkspaceTwoColProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `1fr ${sidebarWidth}px`,
        },
        gap: '16px',
        alignItems: 'start',
      }}
    >
      {children}
    </Box>
  )
}

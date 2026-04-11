import { Box, Card, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { tokens } from '@/design-system/tokens'

interface WorkspaceSectionProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  noPadding?: boolean
}

export function WorkspaceSection({
  title,
  subtitle,
  action,
  children,
  noPadding = false,
}: WorkspaceSectionProps) {
  return (
    <Card
      sx={{
        mb: 2,
        border: '1px solid #E8EEEC',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderRadius: '10px',
      }}
    >
      {title && (
        <Box
          sx={{
            p: '12px 16px',
            borderBottom: `1px solid ${tokens.color.neutral[100]}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && <Box>{action}</Box>}
        </Box>
      )}
      <Box sx={{ p: noPadding ? 0 : 2 }}>{children}</Box>
    </Card>
  )
}

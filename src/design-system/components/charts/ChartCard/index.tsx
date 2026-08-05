import type { ReactNode } from 'react'
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material'

export interface ChartCardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  loading?: boolean
  action?: ReactNode
  height?: number
}

export default function ChartCard({
  title,
  subtitle,
  children,
  loading = false,
  action,
  height,
}: ChartCardProps) {
  return (
    <Card variant="outlined" sx={{ height: height ? height + (title ? 80 : 0) : undefined }}>
      <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
        {(title || action) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
              {loading ? (
                <>
                  <Skeleton width={160} height={24} />
                  {subtitle && <Skeleton width={100} height={18} sx={{ mt: 0.5 }} />}
                </>
              ) : (
                <>
                  {title && (
                    <Typography variant="subtitle1" fontWeight={600}>
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {subtitle}
                    </Typography>
                  )}
                </>
              )}
            </Box>
            {action && (
              <Box sx={{ flexShrink: 0, ml: { xs: 0, sm: 'auto' } }}>{action}</Box>
            )}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

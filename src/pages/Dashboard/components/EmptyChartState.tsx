import { Box, Typography } from '@mui/material'
import { BarChart2 } from 'lucide-react'

interface EmptyChartStateProps {
  title: string
  guidance?: string
  height?: number | '100%'
}

export function EmptyChartState({
  title,
  guidance = 'Try expanding the date range or resetting chart filters.',
  height = '100%',
}: EmptyChartStateProps) {
  return (
    <Box
      sx={{
        height,
        minHeight: height === '100%' ? '100%' : height,
        flex: height === '100%' ? 1 : undefined,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 0.5,
        }}
      >
        <BarChart2 size={20} strokeWidth={1.75} color="var(--mui-palette-text-secondary)" />
      </Box>
      <Typography variant="caption" fontWeight={600} color="text.secondary">
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 280 }}>
        {guidance}
      </Typography>
    </Box>
  )
}

/** @deprecated Use EmptyChartState */
export function EmptyChart({ message, height = 220 }: { message: string; height?: number }) {
  return <EmptyChartState title={message} height={height} />
}

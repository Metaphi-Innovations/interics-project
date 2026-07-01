import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { CHART_PLOT_SX } from './chartLayout'

interface ChartPlotContainerProps {
  height: number
  children: ReactNode
}

/** Fixed-height plot region so Recharts ResponsiveContainer can fill 100% width/height. */
export function ChartPlotContainer({ height, children }: ChartPlotContainerProps) {
  return (
    <Box sx={{ ...CHART_PLOT_SX, height, minHeight: height }}>
      {children}
    </Box>
  )
}

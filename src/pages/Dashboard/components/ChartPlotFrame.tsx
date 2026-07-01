import { Box } from '@mui/material'
import type { ReactNode } from 'react'

interface ChartPlotFrameProps {
  /** Full plot region height from the chart card. */
  plotHeight: number
  /** Optional tighter height for sparse charts; centers within `plotHeight`. */
  contentHeight?: number
  children: ReactNode
}

/** Centers a chart vertically when its natural height is smaller than the plot area. */
export function ChartPlotFrame({ plotHeight, contentHeight, children }: ChartPlotFrameProps) {
  const innerHeight = Math.min(plotHeight, contentHeight ?? plotHeight)

  return (
    <Box
      sx={{
        width: '100%',
        height: plotHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: '100%', height: innerHeight, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  )
}

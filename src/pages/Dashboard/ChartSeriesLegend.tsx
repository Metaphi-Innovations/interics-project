/**
 * Compact series legend for ChartCard header (aligned with title).
 */
import { Box, Stack, Typography } from '@mui/material'

export interface ChartSeriesLegendItem {
  label: string
  color: string
}

interface ChartSeriesLegendProps {
  items: ChartSeriesLegendItem[]
}

export function ChartSeriesLegend({ items }: ChartSeriesLegendProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      gap={1.5}
      sx={{ justifyContent: 'flex-end' }}
    >
      {items.map((item) => (
        <Stack key={item.label} direction="row" alignItems="center" gap={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '2px',
              bgcolor: item.color,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 12, whiteSpace: 'nowrap', lineHeight: 1.2 }}
          >
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

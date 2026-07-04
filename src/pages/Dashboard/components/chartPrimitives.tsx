import { Box, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import type { NamedValue } from '../types'
import { EmptyChartState } from './EmptyChartState'

export { ChartPanel } from './ChartPanel'
export { EmptyChart, EmptyChartState } from './EmptyChartState'

export function chartColors(theme: Theme): string[] {
  return [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
  ]
}

export function DonutChartBlock({
  data,
  theme,
  height,
  centerValue,
  centerLabel,
  emptyMessage,
}: {
  data: NamedValue[]
  theme: Theme
  height: number
  centerValue?: string
  centerLabel?: string
  emptyMessage: string
}) {
  const filtered = data.filter((d) => d.value > 0)
  const colors = chartColors(theme)
  const ct = useChartTheme()

  if (filtered.length === 0) {
    return <EmptyChartState title={emptyMessage} />
  }

  const chartData = filtered.map((d, i) => ({
    ...d,
    color: d.color ?? colors[i % colors.length],
  }))

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: '100%',
        minHeight: height,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
        mx: 'auto',
      }}
    >
      <Box
        sx={{
          flex: '1 1 58%',
          minWidth: 0,
          height: '100%',
          maxHeight: height,
          position: 'relative',
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Tooltip contentStyle={ct.tooltipStyle} />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="46%"
              outerRadius="92%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {(centerValue || centerLabel) && (
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              px: 1,
            }}
          >
            {centerValue && (
              <Typography variant="h5" fontWeight={700}>
                {centerValue}
              </Typography>
            )}
            {centerLabel && (
              <Typography variant="caption" color="text.secondary">
                {centerLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Box
        component="ul"
        sx={{
          flex: '0 1 42%',
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 1,
          minWidth: 0,
          maxHeight: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {chartData.map((d) => (
          <Box
            component="li"
            key={d.name}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: d.color,
                flexShrink: 0,
                mt: 0.35,
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: 11,
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              {d.name}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ opacity: 0.85 }}>
                {' '}
                · {d.value}
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export { yAxisCurrencyTick, compactCurrencyLabel } from './charts/chartFormatters'

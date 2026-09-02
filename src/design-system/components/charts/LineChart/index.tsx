import { Skeleton } from '@mui/material'
import type { ReactNode } from 'react'
import {
  LineChart as RechartsLineChart,
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface LineConfig {
  key: string
  label: string
  color?: string
}

export interface LineChartProps {
  data: Record<string, any>[]
  lines: LineConfig[]
  xKey: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  loading?: boolean
  formatX?: (value: any) => string
  formatY?: (value: any) => string
  formatTooltip?: (value: any) => string
  /** Custom tooltip renderer. When set, replaces the default Recharts tooltip content. */
  tooltipContent?: (props: TooltipContentProps) => ReactNode
  /**
   * When false, tooltip shows only the hovered series (item mode).
   * When true/undefined, tooltip shares all series at the active index (axis mode).
   */
  tooltipShared?: boolean
}

export default function LineChart({
  data,
  lines,
  xKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  loading = false,
  formatX,
  formatY,
  formatTooltip,
  tooltipContent,
  tooltipShared,
}: LineChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height

  if (loading) return <Skeleton variant="rectangular" width="100%" height={h} sx={{ borderRadius: 1 }} />

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsLineChart
        data={data}
        margin={{
          top: 16,
          right: ct.isMobile ? 8 : 16,
          left: ct.isMobile ? 4 : 8,
          bottom: 4,
        }}
      >
        {showGrid && (
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
          />
        )}
        <XAxis
          dataKey={xKey}
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={{ stroke: ct.gridProps.stroke }}
          tickFormatter={formatX}
        />
        <YAxis
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={false}
          width={ct.isMobile ? 44 : 58}
          tickMargin={4}
          tickFormatter={formatY}
        />
        {showTooltip && (
          <Tooltip
            content={tooltipContent}
            shared={tooltipShared}
            contentStyle={tooltipContent ? undefined : ct.tooltipStyle}
            isAnimationActive={false}
            animationDuration={0}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            wrapperStyle={ct.tooltipWrapperStyle}
            labelStyle={
              tooltipContent
                ? undefined
                : { color: ct.theme.palette.text.secondary, fontSize: 11, marginBottom: 4 }
            }
            itemStyle={
              tooltipContent
                ? undefined
                : { color: ct.theme.palette.text.primary, fontSize: 12 }
            }
            formatter={tooltipContent ? undefined : (formatTooltip as any)}
          />
        )}
        {showLegend && lines.length > 1 && <Legend {...ct.legendProps} />}
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color ?? ct.colors[i % ct.colors.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            animationDuration={800}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

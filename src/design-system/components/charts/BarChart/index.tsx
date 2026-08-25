import { Skeleton } from '@mui/material'
import type { ReactNode } from 'react'
import {
  BarChart as RechartsBarChart,
  Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface BarConfig {
  key: string
  label: string
  color?: string
}

export interface BarChartProps {
  data: Record<string, any>[]
  bars: BarConfig[]
  xKey: string
  height?: number
  orientation?: 'vertical' | 'horizontal'
  stacked?: boolean
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  loading?: boolean
  formatX?: (value: any) => string
  formatY?: (value: any) => string
  /** Custom tooltip renderer. When set, replaces the default Recharts tooltip content. */
  tooltipContent?: (props: TooltipContentProps) => ReactNode
  barSize?: number
  /** Gap between bars in the same category (grouped charts). */
  barGap?: number | string
  /** Gap between category groups. */
  barCategoryGap?: number | string
  /** When false, numeric axis ticks are whole numbers only (no fractional/duplicate labels). */
  allowDecimals?: boolean
}

export default function BarChart({
  data,
  bars,
  xKey,
  height = 300,
  orientation = 'vertical',
  stacked = false,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  loading = false,
  formatX,
  formatY,
  tooltipContent,
  barSize = 32,
  barGap = 4,
  barCategoryGap = '20%',
  allowDecimals = true,
}: BarChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height
  const isHorizontal = orientation === 'horizontal'

  if (loading) return <Skeleton variant="rectangular" width="100%" height={h} sx={{ borderRadius: 1 }} />

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsBarChart
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        barCategoryGap={barCategoryGap}
        barGap={barGap}
        margin={{
          top: isHorizontal ? 4 : 16,
          right: ct.isMobile ? 8 : 16,
          left: isHorizontal ? (ct.isMobile ? -10 : 0) : (ct.isMobile ? 4 : 8),
          bottom: 4,
        }}
      >
        {showGrid && (
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
            horizontal={!isHorizontal}
            vertical={isHorizontal}
          />
        )}
        {isHorizontal ? (
          <>
            <XAxis
              type="number"
              tick={ct.axisStyle}
              tickLine={false}
              axisLine={{ stroke: ct.gridProps.stroke }}
              tickFormatter={formatX}
              allowDecimals={allowDecimals}
              domain={allowDecimals ? undefined : [0, 'dataMax']}
            />
            <YAxis type="category" dataKey={xKey} tick={ct.axisStyle} tickLine={false} axisLine={{ stroke: ct.gridProps.stroke }} width={ct.isMobile ? 60 : 80} tickFormatter={formatY} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={ct.axisStyle} tickLine={false} axisLine={{ stroke: ct.gridProps.stroke }} tickFormatter={formatX} />
            <YAxis
              tick={ct.axisStyle}
              tickLine={false}
              axisLine={{ stroke: ct.gridProps.stroke }}
              width={ct.isMobile ? 44 : 58}
              tickMargin={4}
              tickFormatter={formatY}
              allowDecimals={allowDecimals}
            />
          </>
        )}
        {showTooltip && (
          <Tooltip
            content={tooltipContent}
            isAnimationActive={false}
            animationDuration={0}
            contentStyle={tooltipContent ? undefined : ct.tooltipStyle}
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
            // Single translucent band only — avoids stacked cursor/activeBar ghosts in Recharts 3
            cursor={{
              fill: ct.theme.palette.action.hover,
              stroke: 'none',
              fillOpacity: 0.45,
            }}
          />
        )}
        {showLegend && bars.length > 1 && <Legend {...ct.legendProps} />}
        {bars.map((bar, i) => {
          const color = bar.color ?? ct.colors[i % ct.colors.length]
          // Only top/end bar gets rounded corners when stacked
          const isLast = i === bars.length - 1
          const radius: [number, number, number, number] =
            stacked && !isLast
              ? [0, 0, 0, 0]
              : isHorizontal
                ? [0, 4, 4, 0]
                : [4, 4, 0, 0]
          return (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.label}
              fill={color}
              radius={radius}
              maxBarSize={barSize}
              stackId={stacked ? 'stack' : undefined}
              // Disable enter/exit layer animations — prevents stuck/ghost hover bars (Recharts 3)
              isAnimationActive={false}
              activeBar={false}
            />
          )
        })}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

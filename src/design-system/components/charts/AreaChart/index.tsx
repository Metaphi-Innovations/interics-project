import { Skeleton } from '@mui/material'
import {
  AreaChart as RechartsAreaChart,
  Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface AreaConfig {
  key: string
  label: string
  color?: string
}

export interface AreaChartProps {
  data: Record<string, any>[]
  lines: AreaConfig[]
  xKey: string
  height?: number
  stacked?: boolean
  fillOpacity?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  loading?: boolean
  formatX?: (value: any) => string
  formatY?: (value: any) => string
  formatTooltip?: (value: any) => string
}

export default function AreaChart({
  data,
  lines,
  xKey,
  height = 300,
  stacked = false,
  fillOpacity = 0.08,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  loading = false,
  formatX,
  formatY,
  formatTooltip,
}: AreaChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height

  if (loading) return <Skeleton variant="rectangular" width="100%" height={h} sx={{ borderRadius: 1 }} />

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsAreaChart
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
            isAnimationActive={false}
            animationDuration={0}
            contentStyle={ct.tooltipStyle}
            labelStyle={{ color: ct.theme.palette.text.secondary, fontSize: 11, marginBottom: 4 }}
            itemStyle={{ color: ct.theme.palette.text.primary, fontSize: 12 }}
            formatter={formatTooltip as any}
            cursor={{
              stroke: ct.theme.palette.divider,
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />
        )}
        {showLegend && lines.length > 1 && <Legend {...ct.legendProps} />}
        {lines.map((area, i) => {
          const color = area.color ?? ct.colors[i % ct.colors.length]
          return (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.label}
              stroke={color}
              fill={color}
              fillOpacity={fillOpacity}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              stackId={stacked ? 'stack' : undefined}
              isAnimationActive={false}
            />
          )
        })}
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}

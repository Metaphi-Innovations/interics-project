import { Skeleton } from '@mui/material'
import {
  PieChart as RechartsPieChart,
  Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface PieSlice {
  key: string
  label: string
  value: number
  color?: string
}

export interface PieChartProps {
  data: PieSlice[]
  height?: number
  showLegend?: boolean
  showTooltip?: boolean
  loading?: boolean
  formatTooltip?: (value: any) => string
}

export default function PieChart({
  data,
  height = 300,
  showLegend = true,
  showTooltip = true,
  loading = false,
  formatTooltip,
}: PieChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height
  const outerRadius = Math.round((h / 2) * 0.8)

  if (loading) return <Skeleton variant="rectangular" width="100%" height={h} sx={{ borderRadius: 1 }} />

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsPieChart>
        {showTooltip && (
          <Tooltip
            contentStyle={ct.tooltipStyle}
            isAnimationActive={false}
            animationDuration={0}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            wrapperStyle={ct.tooltipWrapperStyle}
            labelStyle={{ color: ct.theme.palette.text.secondary, fontSize: 11, marginBottom: 4 }}
            itemStyle={{ color: ct.theme.palette.text.primary, fontSize: 12 }}
            formatter={formatTooltip as any}
          />
        )}
        {showLegend && <Legend {...ct.legendProps} />}
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          outerRadius={outerRadius}
          paddingAngle={2}
          cornerRadius={4}
          animationDuration={800}
        >
          {data.map((slice, i) => (
            <Cell
              key={slice.key}
              fill={slice.color ?? ct.colors[i % ct.colors.length]}
            />
          ))}
        </Pie>
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}

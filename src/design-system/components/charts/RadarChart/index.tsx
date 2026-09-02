import { Skeleton } from '@mui/material'
import {
  RadarChart as RechartsRadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface RadarConfig {
  key: string
  label: string
  color?: string
}

export interface RadarChartProps {
  data: Record<string, any>[]
  radars: RadarConfig[]
  angleKey: string
  height?: number
  fillOpacity?: number
  showLegend?: boolean
  showTooltip?: boolean
  loading?: boolean
}

export default function RadarChart({
  data,
  radars,
  angleKey,
  height = 300,
  fillOpacity = 0.15,
  showLegend = true,
  showTooltip = true,
  loading = false,
}: RadarChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height

  if (loading) return <Skeleton variant="rectangular" width="100%" height={h} sx={{ borderRadius: 1 }} />

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsRadarChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
        <PolarGrid stroke={ct.gridProps.stroke} strokeOpacity={ct.gridProps.strokeOpacity} />
        <PolarAngleAxis dataKey={angleKey} tick={ct.axisStyle} />
        <PolarRadiusAxis tick={{ ...ct.axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
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
          />
        )}
        {showLegend && radars.length > 1 && <Legend {...ct.legendProps} />}
        {radars.map((radar, i) => {
          const color = radar.color ?? ct.colors[i % ct.colors.length]
          return (
            <Radar
              key={radar.key}
              dataKey={radar.key}
              name={radar.label}
              stroke={color}
              fill={color}
              fillOpacity={fillOpacity}
              strokeWidth={2}
              animationDuration={800}
            />
          )
        })}
      </RechartsRadarChart>
    </ResponsiveContainer>
  )
}

import { Skeleton, Typography } from '@mui/material'
import {
  PieChart as RechartsPieChart,
  Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface DonutSlice {
  key: string
  label: string
  value: number
  color?: string
}

export interface DonutChartProps {
  data: DonutSlice[]
  height?: number
  showLegend?: boolean
  showTooltip?: boolean
  loading?: boolean
  centerValue?: string
  centerLabel?: string
  formatTooltip?: (value: any) => string
}

export default function DonutChart({
  data,
  height = 300,
  showLegend = true,
  showTooltip = true,
  loading = false,
  centerValue,
  centerLabel,
  formatTooltip,
}: DonutChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height
  const outerRadius = Math.round((h / 2) * 0.8)
  const innerRadius = Math.round(outerRadius * 0.55)

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
          innerRadius={innerRadius}
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
          {(centerValue || centerLabel) && (
            <foreignObject
              x="50%"
              y="50%"
              width={innerRadius * 2}
              height={innerRadius * 2}
              style={{ transform: `translate(-${innerRadius}px, -${innerRadius}px)`, pointerEvents: 'none' }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: ct.fontFamily,
                }}
              >
                {centerValue && (
                  <Typography
                    variant="h5"
                    component="span"
                    sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}
                  >
                    {centerValue}
                  </Typography>
                )}
                {centerLabel && (
                  <Typography
                    variant="caption"
                    component="span"
                    sx={{ color: 'text.secondary', lineHeight: 1.2 }}
                  >
                    {centerLabel}
                  </Typography>
                )}
              </div>
            </foreignObject>
          )}
        </Pie>
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}

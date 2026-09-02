import { Skeleton } from '@mui/material'
import {
  FunnelChart as RechartsFunnelChart,
  Funnel, LabelList, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface FunnelSlice {
  key: string
  label: string
  value: number
  color?: string
}

export interface FunnelChartProps {
  data: FunnelSlice[]
  height?: number
  showLabels?: boolean
  showTooltip?: boolean
  loading?: boolean
}

export default function FunnelChart({
  data,
  height = 300,
  showLabels = true,
  showTooltip = true,
  loading = false,
}: FunnelChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height

  if (loading) return <Skeleton variant="rectangular" width="100%" height={h} sx={{ borderRadius: 1 }} />

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsFunnelChart>
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
        <Funnel
          dataKey="value"
          data={data}
          isAnimationActive
          animationDuration={800}
        >
          {data.map((slice, i) => (
            <Cell
              key={slice.key}
              fill={slice.color ?? ct.colors[i % ct.colors.length]}
            />
          ))}
          {showLabels && (
            <LabelList
              dataKey="label"
              position="center"
              style={{
                fill: '#fff',
                fontSize: ct.isMobile ? 11 : 13,
                fontFamily: ct.fontFamily,
                fontWeight: 500,
              }}
            />
          )}
        </Funnel>
      </RechartsFunnelChart>
    </ResponsiveContainer>
  )
}

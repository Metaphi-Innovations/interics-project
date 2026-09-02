import { Skeleton } from '@mui/material'
import {
  ScatterChart as RechartsScatterChart,
  Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ZAxis,
} from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface ScatterPoint {
  x: number
  y: number
  z?: number
  [key: string]: any
}

export interface ScatterChartProps {
  data: ScatterPoint[]
  xKey?: string
  yKey?: string
  zKey?: string
  height?: number
  showGrid?: boolean
  showTooltip?: boolean
  loading?: boolean
  formatX?: (value: any) => string
  formatY?: (value: any) => string
}

export default function ScatterChart({
  data,
  xKey = 'x',
  yKey = 'y',
  zKey = 'z',
  height = 300,
  showGrid = true,
  showTooltip = true,
  loading = false,
  formatX,
  formatY,
}: ScatterChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height
  const color = ct.colors[0]

  if (loading) return <Skeleton variant="rectangular" width="100%" height={h} sx={{ borderRadius: 1 }} />

  const hasZ = data.some(d => d[zKey] !== undefined)

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsScatterChart
        margin={{ top: 4, right: ct.isMobile ? 4 : 16, left: ct.isMobile ? -20 : 0, bottom: 4 }}
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
          type="number"
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={{ stroke: ct.gridProps.stroke }}
          tickFormatter={formatX}
        />
        <YAxis
          dataKey={yKey}
          type="number"
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={false}
          width={ct.isMobile ? 30 : 42}
          tickFormatter={formatY}
        />
        {hasZ && <ZAxis dataKey={zKey} range={[40, 400]} />}
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
            cursor={{ strokeDasharray: '3 3' }}
          />
        )}
        <Scatter
          data={data}
          fill={color}
          fillOpacity={0.8}
          animationDuration={800}
        />
      </RechartsScatterChart>
    </ResponsiveContainer>
  )
}

import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'
import { useChartTheme } from '../utils/chartTheme'

export interface SparkLineProps {
  data: number[]
  width?: number | `${number}%`
  height?: number
  positive?: boolean
  showTooltip?: boolean
  color?: string
}

export default function SparkLine({
  data,
  width = '100%' as `${number}%`,
  height = 40,
  positive,
  showTooltip = false,
  color,
}: SparkLineProps) {
  const ct = useChartTheme()

  const resolvedColor = color
    ?? (positive === true
      ? ct.theme.palette.success.main
      : positive === false
        ? ct.theme.palette.error.main
        : ct.colors[0])

  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={resolvedColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={ct.tooltipStyle}
            isAnimationActive={false}
            animationDuration={0}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            wrapperStyle={ct.tooltipWrapperStyle}
            itemStyle={{ color: ct.theme.palette.text.primary, fontSize: 11 }}
            formatter={(v: any) => [v, '']}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

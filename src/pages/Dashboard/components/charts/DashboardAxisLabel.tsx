import { Label } from 'recharts'

interface DashboardAxisLabelProps {
  value: string
  angle?: number
  position: 'insideLeft' | 'insideRight' | 'insideBottom' | 'bottom' | 'left'
  offset?: number
}

export function DashboardAxisLabel({
  value,
  angle = -90,
  position,
  offset = 0,
}: DashboardAxisLabelProps) {
  return (
    <Label
      value={value}
      angle={angle}
      position={position}
      offset={offset}
      style={{ fontSize: 11, fill: 'var(--mui-palette-text-secondary)', fontWeight: 500 }}
    />
  )
}

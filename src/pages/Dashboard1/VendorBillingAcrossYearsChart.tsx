/**
 * Vendor Billing Across Years — multi-series line chart with hover highlight.
 * Local to Dashboard 1 so the shared LineChart API stays unchanged.
 */
import { useState, type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'

export interface VendorAcrossYearsLine {
  key: string
  label: string
  color: string
}

interface VendorBillingAcrossYearsChartProps {
  data: Array<{ year: string } & Record<string, string | number>>
  lines: VendorAcrossYearsLine[]
  height?: number
}

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function ChartTooltipShell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${tokens.color.neutral[200]}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        px: 1.5,
        py: 1,
        minWidth: 160,
        maxWidth: 260,
      }}
    >
      {children}
    </Box>
  )
}

function VendorBillingAcrossYearsTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  const entry = payload.find((item) => item.value != null) ?? payload[0]
  if (!entry) return null

  const year =
    label != null
      ? String(label)
      : String((entry.payload as { year?: string } | undefined)?.year ?? '')
  const amount = typeof entry.value === 'number' ? entry.value : Number(entry.value)
  if (Number.isNaN(amount)) return null

  return (
    <ChartTooltipShell>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
        {String(entry.name ?? '')}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
      >
        Year: {year}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
      >
        Billing Amount: {formatAxisAmount(amount)}
      </Typography>
    </ChartTooltipShell>
  )
}

export function VendorBillingAcrossYearsChart({
  data,
  lines,
  height = 300,
}: VendorBillingAcrossYearsChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsLineChart
        data={data}
        margin={{
          top: 12,
          right: ct.isMobile ? 12 : 20,
          left: ct.isMobile ? 4 : 8,
          bottom: 4,
        }}
        onMouseMove={(state) => {
          const key = state?.activeDataKey
          setHoveredKey(key != null ? String(key) : null)
        }}
        onMouseLeave={() => setHoveredKey(null)}
      >
        <CartesianGrid
          stroke={ct.gridProps.stroke}
          strokeDasharray={ct.gridProps.strokeDasharray}
          strokeOpacity={ct.gridProps.strokeOpacity}
        />
        <XAxis
          dataKey="year"
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={{ stroke: ct.gridProps.stroke }}
          padding={{ left: 16, right: 16 }}
          interval={0}
        />
        <YAxis
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={false}
          width={ct.isMobile ? 44 : 58}
          tickMargin={4}
          tickFormatter={formatAxisAmount}
          domain={[0, 'auto']}
          allowDecimals={false}
        />
        <Tooltip
          content={VendorBillingAcrossYearsTooltip}
          shared={false}
          cursor={{ stroke: tokens.color.neutral[300], strokeDasharray: '4 4' }}
        />
        {lines.map((line) => {
          const isDimmed = hoveredKey != null && hoveredKey !== line.key
          const isActive = hoveredKey === line.key

          return (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={isActive ? 3 : 2}
              strokeOpacity={isDimmed ? 0.22 : 1}
              dot={{
                r: isActive ? 4 : 3,
                strokeWidth: 0,
                fill: line.color,
                fillOpacity: isDimmed ? 0.22 : 1,
              }}
              activeDot={{
                r: 5,
                strokeWidth: 0,
                fill: line.color,
              }}
              animationDuration={800}
              connectNulls
            />
          )
        })}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

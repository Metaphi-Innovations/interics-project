/**
 * Dashboard — Sector & Project Type Analytics
 */
import { useMemo, useState } from 'react'
import { Box, Grid, MenuItem, Select as MuiSelect, Typography } from '@mui/material'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import {
  ChartCard,
} from '@/design-system/components'
import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import { tokens } from '@/design-system/tokens'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import {
  buildSectorPerformanceChartData,
  getSectorPerformanceMetricMeta,
  SECTOR_FILTER_OPTIONS,
  SECTOR_PERFORMANCE_METRIC_OPTIONS,
  type SectorFilterValue,
  type SectorPerformanceMetric,
} from './sectorAnalyticsData'

const SELECT_SX = { minWidth: 120, fontSize: 12, height: 32 } as const
const METRIC_SELECT_SX = { minWidth: 220, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const

const FILTER_LABEL_SX = {
  display: 'block',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  mb: 0.5,
} as const

function formatSqft(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${n.toLocaleString('en-IN')} sqft`
}

function formatCompletedCount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return Math.round(n).toLocaleString('en-IN')
}

function formatBarEndLabel(
  value: number | string,
  metric: SectorPerformanceMetric,
): string {
  if (metric === 'avgCompletedSqft') {
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(n)) return String(value)
    return n.toLocaleString('en-IN')
  }
  return formatCompletedCount(value)
}

function SectorLimitSelect({
  value,
  onChange,
}: {
  value: SectorFilterValue
  onChange: (value: SectorFilterValue) => void
}) {
  return (
    <MuiSelect
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value as SectorFilterValue)}
      sx={SELECT_SX}
    >
      {SECTOR_FILTER_OPTIONS.map((opt) => (
        <MenuItem key={opt.value} value={opt.value} sx={MENU_ITEM_SX}>
          {opt.label}
        </MenuItem>
      ))}
    </MuiSelect>
  )
}

function SectorPerformanceTooltip({
  active,
  payload,
  metric,
}: TooltipContentProps & { metric: SectorPerformanceMetric }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  if (!entry) return null
  const sector = String((entry.payload as { sector?: string } | undefined)?.sector ?? '')
  const raw = typeof entry.value === 'number' ? entry.value : Number(entry.value)
  if (Number.isNaN(raw)) return null
  const meta = getSectorPerformanceMetricMeta(metric)

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${tokens.color.neutral[200]}`,
        borderRadius: '8px',
        boxShadow: tokens.shadow.sm,
        px: 1.5,
        py: 1,
        minWidth: 160,
      }}
    >
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
        {sector}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: 0.25 }}>
        {meta.label}:{' '}
        <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {metric === 'avgCompletedSqft' ? formatSqft(raw) : formatCompletedCount(raw)}
        </Box>
      </Typography>
    </Box>
  )
}

function SectorPerformanceChart({
  data,
  metric,
  xAxisLabel,
  height = 300,
}: {
  data: Array<{ sector: string; value: number; color: string }>
  metric: SectorPerformanceMetric
  xAxisLabel: string
  height?: number
}) {
  const ct = useChartTheme()
  // Grow with row count so every Y label fits (esp. All Sectors) — no inner scroll.
  const pxPerRow = ct.isMobile ? 34 : 38
  const sizedHeight = Math.max(height, data.length * pxPerRow + 56)
  const h = ct.isMobile ? Math.round(sizedHeight * 0.92) : sizedHeight
  const formatX =
    metric === 'avgCompletedSqft'
      ? (v: number | string) => {
          const n = typeof v === 'number' ? v : Number(v)
          if (Number.isNaN(n)) return String(v)
          return n.toLocaleString('en-IN')
        }
      : (v: number | string) => formatCompletedCount(v)

  return (
    <Box sx={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={h}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          barCategoryGap="28%"
          margin={{
            top: 8,
            right: ct.isMobile ? 36 : 48,
            left: ct.isMobile ? 4 : 8,
            bottom: 28,
          }}
        >
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
            horizontal={false}
            vertical
          />
          <XAxis
            type="number"
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            tickFormatter={formatX}
            label={{
              value: xAxisLabel,
              position: 'insideBottom',
              offset: -16,
              style: {
                fill: tokens.color.neutral[500],
                fontSize: 11,
                fontFamily: ct.fontFamily,
              },
            }}
          />
          <YAxis
            type="category"
            dataKey="sector"
            interval={0}
            minTickGap={0}
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            width={ct.isMobile ? 72 : 96}
            label={{
              value: 'Sectors',
              angle: -90,
              position: 'insideLeft',
              offset: 4,
              style: {
                fill: tokens.color.neutral[500],
                fontSize: 11,
                fontFamily: ct.fontFamily,
              },
            }}
          />
          <Tooltip
            isAnimationActive={false}
            animationDuration={0}
            content={(props) => <SectorPerformanceTooltip {...props} metric={metric} />}
            cursor={{
              fill: ct.theme.palette.action.hover,
              stroke: 'none',
              fillOpacity: 0.45,
            }}
          />
          <Bar
            dataKey="value"
            name={xAxisLabel}
            radius={[0, 8, 8, 0]}
            maxBarSize={22}
            isAnimationActive={false}
            activeBar={false}
          >
            {data.map((row) => (
              <Cell key={row.sector} fill={row.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value) => formatBarEndLabel(value as number | string, metric)}
              style={{
                fill: tokens.color.neutral[700],
                fontSize: 12,
                fontWeight: 600,
                fontFamily: ct.fontFamily,
              }}
            />
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  )
}

export function SectorAnalyticsSection() {
  const [performanceFilter, setPerformanceFilter] = useState<SectorFilterValue>('top5')
  const [performanceMetric, setPerformanceMetric] =
    useState<SectorPerformanceMetric>('completedCount')

  const performanceData = useMemo(
    () => buildSectorPerformanceChartData(performanceFilter, performanceMetric),
    [performanceFilter, performanceMetric],
  )
  const performanceMeta = getSectorPerformanceMetricMeta(performanceMetric)

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Sector & Project Type Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Project distribution by sector and delivery type.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Sector Performance"
            subtitle="Compare completed projects and average project size by sector."
            action={
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'flex-start' },
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={FILTER_LABEL_SX}
                  >
                    Metric
                  </Typography>
                  <MuiSelect
                    size="small"
                    value={performanceMetric}
                    onChange={(e) =>
                      setPerformanceMetric(e.target.value as SectorPerformanceMetric)
                    }
                    sx={METRIC_SELECT_SX}
                  >
                    {SECTOR_PERFORMANCE_METRIC_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value} sx={MENU_ITEM_SX}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={FILTER_LABEL_SX}
                  >
                    Show Top
                  </Typography>
                  <SectorLimitSelect
                    value={performanceFilter}
                    onChange={setPerformanceFilter}
                  />
                </Box>
              </Box>
            }
          >
            <SectorPerformanceChart
              data={performanceData}
              metric={performanceMetric}
              xAxisLabel={performanceMeta.xAxisLabel}
              height={300}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
              <ChartSeriesLegend
                items={performanceData.map((row) => ({
                  label: row.sector,
                  color: row.color,
                }))}
              />
            </Box>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

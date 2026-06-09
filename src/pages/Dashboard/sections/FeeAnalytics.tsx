import { Box } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  billingStackMonthly,
  feeRecoveryMonthly,
} from '../dashboardMetrics'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { DashboardSection } from '../components/DashboardSection'
import { DashboardMiniCard } from '../components/DashboardMiniCard'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { EmptyChartState } from '../components/EmptyChartState'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import { createBillingBarLabelFormatter, yAxisCurrencyTick } from '../components/charts/chartFormatters'
import { CHART_MARGIN_GROUPED_BARS, CHART_MARGIN_WITH_LEGEND, SECTION_CHART_ROW_SX } from '../components/chartLayout'

interface FeeAnalyticsProps {
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  designFeePerSqft: number
  feePctOfValue: number
  avgBillingPerProject: number
  realizedVsContractedPct: number
  ru: (n: number) => string
}

export function FeeAnalytics({
  chartHeight,
  loading,
  globalFilters,
  chartData,
  designFeePerSqft,
  feePctOfValue,
  avgBillingPerProject,
  realizedVsContractedPct,
  ru,
}: FeeAnalyticsProps) {
  const { ct, theme, legendBottom } = useDashboardChartTheme()

  return (
    <DashboardSection title="Fee Metrics">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard
          label="Design Fee Per Sq Ft"
          value={designFeePerSqft > 0 ? ru(designFeePerSqft) : '—'}
        />
        <DashboardMiniCard
          label="Fee As % Of Project Value"
          value={`${Math.round(feePctOfValue)}%`}
        />
        <DashboardMiniCard label="Average Billing Per Project" value={ru(avgBillingPerProject)} />
        <DashboardMiniCard
          label="Realized Fee vs Contracted"
          value={`${Math.round(realizedVsContractedPct)}%`}
        />
      </Box>

      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        }}
      >
        <ScopedChartPanel
          title="Fee Recovery Trend"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, monthBuckets, chartHeight: h }) => {
            const series = feeRecoveryMonthly(
              monthBuckets,
              scope.filteredProjects,
              scope.scopedInvoices,
            )
            const hasFee = series.some(
              (r) => r.contracted > 0 || r.billed > 0 || r.collected > 0,
            )
            if (!hasFee) {
              return (
                <EmptyChartState
                  title="No fee recovery data for selected filters"
                  guidance="Add projects with design fees or widen the date range."
                  height={h}
                />
              )
            }
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <LineChart data={series} margin={CHART_MARGIN_WITH_LEGEND}>
                  <CartesianGrid {...ct.gridProps} vertical={false} />
                  <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={ct.axisStyle}
                    tickFormatter={yAxisCurrencyTick}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={ct.tooltipStyle}
                    formatter={(v, n) => [ru(Number(v ?? 0)), String(n)]}
                  />
                  <Legend {...legendBottom} />
                  <Line
                    type="monotone"
                    dataKey="contracted"
                    name="Contracted Fee"
                    stroke={theme.palette.text.secondary}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="billed"
                    name="Billed Fee"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    name="Collected Fee"
                    stroke={theme.palette.success.main}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Billing Performance"
          subtitle="Billed, collected, and pending amounts by month (grouped bars)"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, monthBuckets, chartHeight: h }) => {
            const billingStack = billingStackMonthly(monthBuckets, scope.scopedInvoices)
            const hasData = billingStack.some((r) => r.billed > 0)
            if (!hasData) {
              return (
                <EmptyChartState
                  title="No billing performance data for selected filters"
                  guidance="Try This Year or All Time in the chart date filter."
                  height={h}
                />
              )
            }
            const billingPeak = Math.max(
              0,
              ...billingStack.flatMap((r) => [r.billed, r.collected, r.pending]),
            )
            const billingTopLabel = createBillingBarLabelFormatter(billingPeak)
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <BarChart
                  data={billingStack}
                  margin={CHART_MARGIN_GROUPED_BARS}
                  barCategoryGap="26%"
                  barGap={6}
                >
                  <CartesianGrid {...ct.gridProps} vertical={false} />
                  <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={ct.axisStyle}
                    tickFormatter={yAxisCurrencyTick}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={ct.tooltipStyle}
                    formatter={(v, n) => [ru(Number(v ?? 0)), String(n)]}
                  />
                  <Legend {...legendBottom} iconSize={8} />
                  <Bar
                    dataKey="billed"
                    name="Billed"
                    fill={theme.palette.primary.main}
                    radius={[4, 4, 0, 0]}
                    barSize={11}
                    maxBarSize={14}
                  >
                    <LabelList dataKey="billed" position="top" fontSize={9} formatter={billingTopLabel} />
                  </Bar>
                  <Bar
                    dataKey="collected"
                    name="Collected"
                    fill={theme.palette.success.main}
                    radius={[4, 4, 0, 0]}
                    barSize={11}
                    maxBarSize={14}
                  />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    fill={theme.palette.warning.main}
                    radius={[4, 4, 0, 0]}
                    barSize={11}
                    maxBarSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>
      </Box>
    </DashboardSection>
  )
}

import { Box } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  buildMonthlyFinancialSeries,
  revenueByClient,
} from '../dashboardMetrics'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { useChartFilterScope } from '../hooks/useChartFilterScope'
import { DashboardSection } from '../components/DashboardSection'
import { ChartPanel } from '../components/ChartPanel'
import { RevenueSummaryPanel } from '../components/RevenueSummaryPanel'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { EmptyChartState } from '../components/EmptyChartState'
import { chartColors } from '../components/chartPrimitives'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import { labelListFormatter, truncateCategoryTick, yAxisCurrencyTick } from '../components/charts/chartFormatters'
import {
  CHART_CATEGORY_AXIS_WIDTH,
  CHART_MARGIN_HORIZONTAL,
  CHART_MARGIN_WITH_LEGEND,
  SECTION_CHART_ROW_SX,
} from '../components/chartLayout'

interface FinancialMetricsProps {
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  ru: (n: number) => string
  onNavigate: (path: string) => void
}

export function FinancialMetrics({
  chartHeight,
  loading,
  globalFilters,
  chartData,
  ru,
  onNavigate,
}: FinancialMetricsProps) {
  const { ct, theme, legendBottom } = useDashboardChartTheme()
  const colors = chartColors(theme)

  const revenueTrendScope = useChartFilterScope(globalFilters, chartData)
  const {
    chartFilters,
    applyFilters,
    resetFilters,
    scope,
    monthBuckets,
    filterOptions,
  } = revenueTrendScope

  const monthlySeries = buildMonthlyFinancialSeries(
    monthBuckets,
    scope.scopedInvoices,
    scope.scopedVendorInvoices,
    scope.scopedExpenses,
  )
  const hasTrend = monthlySeries.some((r) => r.revenue > 0 || r.cost > 0)

  return (
    <DashboardSection title="Financial Metrics">
      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '7fr 3fr' },
        }}
      >
        <ChartPanel
          title="Revenue Trend"
          subtitle="Monthly revenue, profit, and cost"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          chartFilters={chartFilters}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
          filterOptions={filterOptions}
        >
          {hasTrend ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={chartHeight}>
              <LineChart data={monthlySeries} margin={CHART_MARGIN_WITH_LEGEND}>
                <CartesianGrid {...ct.gridProps} vertical={false} />
                <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tick={ct.axisStyle}
                  tickFormatter={yAxisCurrencyTick}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip contentStyle={ct.tooltipStyle} formatter={(v, n) => [ru(Number(v ?? 0)), String(n)]} />
                <Legend {...legendBottom} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke={theme.palette.primary.main} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke={theme.palette.success.main} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" name="Cost" stroke={theme.palette.error.main} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState title="No revenue in this period for chart filters" height={chartHeight} />
          )}
        </ChartPanel>

        <RevenueSummaryPanel
          chartHeight={chartHeight}
          loading={loading}
          scope={scope}
          chartData={chartData}
          ru={ru}
          onNavigate={onNavigate}
        />
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <ScopedChartPanel
          title="Revenue Distribution By Client"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope: clientScope, chartHeight: h }) => {
            const topClients = revenueByClient(clientScope.scopedInvoices, clientScope.filteredProjects)
            if (topClients.length === 0) {
              return <EmptyChartState title="No client revenue for selected chart filters" height={h} />
            }
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <BarChart data={topClients} layout="vertical" margin={CHART_MARGIN_HORIZONTAL}>
                  <CartesianGrid {...ct.gridProps} horizontal={false} />
                  <XAxis type="number" tick={ct.axisStyle} tickFormatter={yAxisCurrencyTick} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={CHART_CATEGORY_AXIS_WIDTH}
                    tick={{ ...ct.axisStyle, fontSize: 10 }}
                    tickFormatter={(v) => truncateCategoryTick(v, 16)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Revenue']} />
                  <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]} barSize={18}>
                    {topClients.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" fontSize={9} formatter={labelListFormatter(ru)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>
      </Box>
    </DashboardSection>
  )
}

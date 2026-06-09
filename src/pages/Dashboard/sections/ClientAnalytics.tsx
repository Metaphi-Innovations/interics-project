import { Box } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo } from 'react'
import { clientRetentionMonthly, industryDistribution, revenueByClient, sumInvoiceRevenue } from '../dashboardMetrics'
import { chartFiltersFromGlobal } from '../chartFilterTypes'
import { scopeForChart } from '../chartScopeUtils'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { DashboardSection } from '../components/DashboardSection'
import { DashboardMiniCard } from '../components/DashboardMiniCard'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { DonutChartBlock } from '../components/chartPrimitives'
import { EmptyChartState } from '../components/EmptyChartState'
import { chartColors } from '../components/chartPrimitives'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import { CHART_MARGIN, SECTION_CHART_ROW_SX } from '../components/chartLayout'
import { truncateCategoryTick, yAxisCurrencyTick } from '../components/charts/chartFormatters'

interface ClientAnalyticsProps {
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  customers: import('@/slices/customers/reducer').Customer[]
  activeClients: number
  repeatPct: number
  ru: (n: number) => string
}

export function ClientAnalytics({
  chartHeight,
  loading,
  globalFilters,
  chartData,
  customers,
  activeClients,
  repeatPct,
  ru,
}: ClientAnalyticsProps) {
  const { ct, theme } = useDashboardChartTheme()
  const colors = chartColors(theme)
  const globalScope = useMemo(
    () =>
      scopeForChart(
        chartData.projects,
        chartData.clientInvoices,
        chartData.vendorInvoices,
        chartData.expenses,
        chartFiltersFromGlobal(globalFilters),
      ),
    [chartData, globalFilters],
  )
  const totalRevenue = sumInvoiceRevenue(globalScope.scopedInvoices)
  const uniqueClientCount = new Set(globalScope.filteredProjects.map((p) => p.customerId)).size

  return (
    <DashboardSection title="Client Metrics">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard label="Active Clients" value={String(activeClients)} />
        <DashboardMiniCard label="Repeat Clients %" value={`${Math.round(repeatPct)}%`} />
        <DashboardMiniCard label="Revenue Per Client" value={ru(totalRevenue / Math.max(1, uniqueClientCount))} />
        <DashboardMiniCard label="Lifetime Client Value" value={ru(totalRevenue)} />
      </Box>

      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          mb: 2.5,
        }}
      >
        <ScopedChartPanel
          title="Client Industry Distribution"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => (
            <DonutChartBlock
              data={industryDistribution(scope.filteredProjects, customers)}
              theme={theme}
              height={h}
              emptyMessage="No industry data for chart filters"
            />
          )}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Top 10 Clients By Revenue"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => {
            const topClients = revenueByClient(scope.scopedInvoices, scope.filteredProjects)
            if (topClients.length === 0) {
              return <EmptyChartState title="No client revenue for chart filters" height={h} />
            }
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <BarChart data={topClients} margin={CHART_MARGIN}>
                  <CartesianGrid {...ct.gridProps} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ ...ct.axisStyle, fontSize: 10 }}
                    interval={0}
                    angle={-32}
                    textAnchor="end"
                    height={48}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => truncateCategoryTick(v, 10)}
                  />
                  <YAxis
                    tick={ct.axisStyle}
                    tickFormatter={yAxisCurrencyTick}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Revenue']} />
                  <Bar dataKey="value" name="Revenue" radius={[4, 4, 0, 0]} barSize={24}>
                    {topClients.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>
      </Box>

      <ScopedChartPanel
        title="Client Retention Trend"
        subtitle="Share of returning clients per month"
        chartHeight={chartHeight}
        loading={loading}
        showStatus={false}
        globalFilters={globalFilters}
        data={chartData}
      >
        {({ scope, monthBuckets, chartHeight: h }) => (
          <ResponsiveContainer width="100%" height="100%" minHeight={h}>
            <LineChart data={clientRetentionMonthly(monthBuckets, scope.filteredProjects)} margin={CHART_MARGIN}>
              <CartesianGrid {...ct.gridProps} vertical={false} />
              <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={ct.axisStyle} unit="%" axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [`${Math.round(Number(v ?? 0))}%`, 'Retention']} />
              <Line type="monotone" dataKey="rate" name="Retention" stroke={theme.palette.primary.main} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ScopedChartPanel>
    </DashboardSection>
  )
}

import { Box } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { profitByClientProjectType, profitByProject, sumCosts, sumInvoiceRevenue } from '../dashboardMetrics'
import { chartFiltersFromGlobal } from '../chartFilterTypes'
import { scopeForChart } from '../chartScopeUtils'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { useMemo } from 'react'
import { DashboardSection } from '../components/DashboardSection'
import { DashboardMiniCard } from '../components/DashboardMiniCard'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { DonutChartBlock } from '../components/chartPrimitives'
import { EmptyChartState } from '../components/EmptyChartState'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import {
  CHART_CATEGORY_AXIS_WIDTH,
  CHART_MARGIN_HORIZONTAL,
  SECTION_CHART_ROW_SX,
} from '../components/chartLayout'
import { labelListFormatter, truncateCategoryTick, yAxisCurrencyTick } from '../components/charts/chartFormatters'

interface ProfitabilityAnalyticsProps {
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  ru: (n: number) => string
}

export function ProfitabilityAnalytics({
  chartHeight,
  loading,
  globalFilters,
  chartData,
  ru,
}: ProfitabilityAnalyticsProps) {
  const { ct, theme } = useDashboardChartTheme()
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
  const totalCost = sumCosts(globalScope.scopedVendorInvoices, globalScope.scopedExpenses)
  const totalProfit = totalRevenue - totalCost
  const projectCount = Math.max(1, globalScope.filteredProjects.length)
  const uniqueClientCount = new Set(globalScope.filteredProjects.map((p) => p.customerId)).size
  const totalArea = globalScope.filteredProjects.reduce((s, p) => s + (p.carpetArea ?? 0), 0)

  return (
    <DashboardSection title="Profitability Analytics">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard label="Profit Per Project" value={ru(totalProfit / projectCount)} />
        <DashboardMiniCard
          label="Profit Margin Per Project"
          value={`${Math.round(totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0)}%`}
        />
        <DashboardMiniCard label="Profit Per Client" value={ru(totalProfit / Math.max(1, uniqueClientCount))} />
        <DashboardMiniCard label="Profit Per Sq Ft" value={ru(totalArea > 0 ? totalProfit / totalArea : 0)} />
      </Box>

      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          mt: 2.5,
        }}
      >
        <ScopedChartPanel
          title="Project Profitability"
          subtitle="Top 10 most profitable projects"
          chartHeight={chartHeight}
          loading={loading}
          showStatus
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => {
            const topProjects = profitByProject(
              scope.scopedInvoices,
              scope.scopedVendorInvoices,
              scope.scopedExpenses,
              scope.filteredProjects,
            )
            if (topProjects.length === 0) {
              return <EmptyChartState title="No project profitability for chart filters" height={h} />
            }
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <BarChart data={topProjects} layout="vertical" margin={CHART_MARGIN_HORIZONTAL}>
                  <CartesianGrid {...ct.gridProps} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={yAxisCurrencyTick}
                    tick={ct.axisStyle}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={CHART_CATEGORY_AXIS_WIDTH}
                    tick={{ ...ct.axisStyle, fontSize: 10 }}
                    tickFormatter={(v) => truncateCategoryTick(v, 16)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Profit']} />
                  <Bar dataKey="value" name="Profit" radius={[0, 4, 4, 0]} barSize={16}>
                    {topProjects.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.value >= 0 ? theme.palette.success.main : theme.palette.error.main}
                      />
                    ))}
                    <LabelList dataKey="value" position="right" fontSize={9} formatter={labelListFormatter(ru)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Project Type Profitability"
          chartHeight={chartHeight}
          loading={loading}
          showStatus
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => {
            const profitByType = profitByClientProjectType(
              scope.scopedInvoices,
              scope.scopedVendorInvoices,
              scope.scopedExpenses,
              scope.filteredProjects,
            )
            return (
              <DonutChartBlock
                data={profitByType}
                theme={theme}
                height={h}
                emptyMessage="No profit by project type for chart filters"
              />
            )
          }}
        </ScopedChartPanel>
      </Box>
    </DashboardSection>
  )
}

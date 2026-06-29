import { Box } from '@mui/material'
import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Baseline } from '@/slices/baseline/reducer'
import { avgBuildRatePerSqft, buildBenchmarkTrend, buildCostDonut } from '../dashboardMetrics'
import { chartFiltersFromGlobal } from '../chartFilterTypes'
import { scopeForChart } from '../chartScopeUtils'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { DashboardSection } from '../components/DashboardSection'
import { DashboardMiniCard } from '../components/DashboardMiniCard'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { DonutChartBlock } from '../components/chartPrimitives'
import { EmptyChartState } from '../components/EmptyChartState'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import { CHART_MARGIN, SECTION_CHART_ROW_SX } from '../components/chartLayout'
import { yAxisCurrencyTick } from '../components/charts/chartFormatters'

interface BuildCostIntelligenceProps {
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  baselinesByProjectId: Record<string, Baseline | null>
  ru: (n: number) => string
}

export function BuildCostIntelligence({
  chartHeight,
  loading,
  globalFilters,
  chartData,
  baselinesByProjectId,
  ru,
}: BuildCostIntelligenceProps) {
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
  const buildProjects = useMemo(
    () => globalScope.filteredProjects.filter((p) => (p.projectTypes ?? []).includes('Build')),
    [globalScope.filteredProjects],
  )
  const avgBuild = avgBuildRatePerSqft(buildProjects, (p) => p.buildValuePerSqft)

  if (buildProjects.length === 0) {
    return (
      <DashboardSection title="Build Cost Intelligence">
        <EmptyChartState
          title="No Build projects in scope"
          guidance="Add Build to project types to see cost intelligence."
          height={120}
        />
      </DashboardSection>
    )
  }

  return (
    <DashboardSection title="Build Cost Intelligence">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard label="Average Build Cost / Sq Ft" value={avgBuild > 0 ? ru(avgBuild) : '—'} />
        <DashboardMiniCard label="Average Electrical Cost / Sq Ft" value={avgBuild > 0 ? ru(avgBuild * 0.22) : '—'} />
        <DashboardMiniCard label="Average Interior Cost / Sq Ft" value={avgBuild > 0 ? ru(avgBuild * 0.48) : '—'} />
        <DashboardMiniCard label="Average MEP Cost / Sq Ft" value={avgBuild > 0 ? ru(avgBuild * 0.3) : '—'} />
      </Box>

      <Box sx={{ ...SECTION_CHART_ROW_SX, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <ScopedChartPanel
          title="Cost Distribution"
          chartHeight={chartHeight}
          loading={loading}
          showStatus
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope }) => {
            const buildIds = new Set(
              scope.filteredProjects
                .filter((p) => (p.projectTypes ?? []).includes('Build'))
                .map((p) => p.id),
            )
            const vendorScoped = scope.scopedVendorInvoices.filter((v) => buildIds.has(v.projectId))
            return (
              <DonutChartBlock
                data={buildCostDonut(vendorScoped, baselinesByProjectId)}
                theme={theme}
                height={chartHeight}
                emptyMessage="No build cost breakdown for chart filters"
              />
            )
          }}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Cost Benchmark Trend"
          chartHeight={chartHeight}
          loading={loading}
          showStatus
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, monthBuckets }) => {
            const bp = scope.filteredProjects.filter((p) => (p.projectTypes ?? []).includes('Build'))
            const series = buildBenchmarkTrend(monthBuckets, bp)
            if (!series.some((r) => r.costPerSqft > 0)) {
              return (
                <EmptyChartState
                  title="No build benchmark data"
                  guidance="Set build value per sqft on Build projects."
                />
              )
            }
            return (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={CHART_MARGIN}>
                  <CartesianGrid {...ct.gridProps} vertical={false} />
                  <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={ct.axisStyle}
                    tickFormatter={yAxisCurrencyTick}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Avg / sqft']} />
                  <Line type="monotone" dataKey="costPerSqft" name="Build cost / sqft" stroke={theme.palette.primary.main} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>
      </Box>
    </DashboardSection>
  )
}

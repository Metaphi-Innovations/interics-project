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
import { durationTrendMonthly, projectsByClientType, projectStatusDonut } from '../dashboardMetrics'
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
import { truncateCategoryTick } from '../components/charts/chartFormatters'

interface ProjectAnalyticsProps {
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  avgDuration: number
  started: number
  completed: number
  total: number
}

export function ProjectAnalytics({
  chartHeight,
  loading,
  globalFilters,
  chartData,
  avgDuration,
  started,
  completed,
  total,
}: ProjectAnalyticsProps) {
  const { ct, theme } = useDashboardChartTheme()
  const colors = chartColors(theme)

  return (
    <DashboardSection title="Project Analytics">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard label="Average Project Duration" value={avgDuration > 0 ? `${avgDuration} days` : '—'} />
        <DashboardMiniCard label="Projects Started" value={String(started)} />
        <DashboardMiniCard label="Projects Completed" value={String(completed)} />
        <DashboardMiniCard label="Total Projects" value={String(total)} />
      </Box>

      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          mb: 2.5,
        }}
      >
        <ScopedChartPanel
          title="Projects By Status"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => {
            const statusDonut = projectStatusDonut(scope.filteredProjects)
            const totalStatus = statusDonut.reduce((s, d) => s + d.value, 0)
            return (
              <DonutChartBlock
                data={statusDonut}
                theme={theme}
                height={h}
                centerValue={String(totalStatus)}
                centerLabel="Projects"
                emptyMessage="No projects for chart filters"
              />
            )
          }}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Projects By Type"
          chartHeight={chartHeight}
          loading={loading}
          showStatus
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => {
            const typeBar = projectsByClientType(scope.filteredProjects)
            if (!typeBar.some((d) => d.value > 0)) {
              return <EmptyChartState title="No projects by type for chart filters" height={h} />
            }
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <BarChart data={typeBar} margin={CHART_MARGIN}>
                  <CartesianGrid {...ct.gridProps} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ ...ct.axisStyle, fontSize: 10 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={44}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => truncateCategoryTick(v, 12)}
                  />
                  <YAxis allowDecimals={false} tick={ct.axisStyle} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={ct.tooltipStyle} />
                  <Bar dataKey="value" name="Projects" radius={[4, 4, 0, 0]} barSize={28}>
                    {typeBar.map((_, i) => (
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
        title="Project Duration Analysis"
        subtitle="Average days to complete by month"
        chartHeight={chartHeight}
        loading={loading}
        showStatus
        globalFilters={globalFilters}
        data={chartData}
      >
        {({ scope, monthBuckets, chartHeight: h }) => (
          <ResponsiveContainer width="100%" height="100%" minHeight={h}>
            <LineChart data={durationTrendMonthly(monthBuckets, scope.filteredProjects)} margin={CHART_MARGIN}>
              <CartesianGrid {...ct.gridProps} vertical={false} />
              <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={ct.axisStyle} unit=" d" axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={ct.tooltipStyle}
                formatter={(v) => [`${v} days`, 'Avg duration']}
              />
              <Line type="monotone" dataKey="days" name="Duration" stroke={theme.palette.info.main} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ScopedChartPanel>
    </DashboardSection>
  )
}

import { Box } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CLIENT_PROJECT_TYPES } from '../dashboardMappings'
import {
  profitabilityPerTeamLeadDetailed,
  projectsPerTeamLead,
  teamRevenueStacked,
} from '../dashboardMetrics'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { DashboardSection } from '../components/DashboardSection'
import { DashboardMiniCard } from '../components/DashboardMiniCard'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { EmptyChartState } from '../components/EmptyChartState'
import { chartColors } from '../components/chartPrimitives'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import {
  marginPercentTick,
  marginPercentTooltip,
  truncateCategoryTick,
  yAxisCurrencyTick,
} from '../components/charts/chartFormatters'
import {
  CHART_CATEGORY_AXIS_WIDTH,
  CHART_MARGIN_HORIZONTAL,
  CHART_MARGIN_STACKED_HORIZONTAL,
  CHART_MARGIN_TEAM_PROFIT,
  SECTION_CHART_ROW_SX,
} from '../components/chartLayout'

interface TeamPerformanceProps {
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  projectCount: number
  pitchCount: number
  conversionRate: number
  profitabilityPerLead: number
  ru: (n: number) => string
}

export function TeamPerformance({
  chartHeight,
  loading,
  globalFilters,
  chartData,
  projectCount,
  pitchCount,
  conversionRate,
  profitabilityPerLead,
  ru,
}: TeamPerformanceProps) {
  const { ct, theme, legendBottom } = useDashboardChartTheme()
  const colors = chartColors(theme)

  return (
    <DashboardSection title="Team Metrics">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard label="Number Of Projects" value={String(projectCount)} />
        <DashboardMiniCard label="Number Of Pitches" value={String(pitchCount)} />
        <DashboardMiniCard label="Conversion Rate" value={`${Math.round(conversionRate)}%`} />
        <DashboardMiniCard
          label="Profitability Per Team Lead"
          value={ru(profitabilityPerLead)}
        />
      </Box>

      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          mb: 2.5,
        }}
      >
        <ScopedChartPanel
          title="Projects Per Team Lead"
          chartHeight={chartHeight}
          loading={loading}
          showStatus
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => {
            const data = projectsPerTeamLead(scope.filteredProjects)
            if (data.length === 0) {
              return (
                <EmptyChartState
                  title="No team lead assignments for selected filters"
                  height={h}
                />
              )
            }
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <BarChart data={data} layout="vertical" margin={CHART_MARGIN_HORIZONTAL}>
                  <CartesianGrid {...ct.gridProps} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={ct.axisStyle} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={CHART_CATEGORY_AXIS_WIDTH}
                    tick={{ ...ct.axisStyle, fontSize: 10 }}
                    tickFormatter={(v) => truncateCategoryTick(v, 16)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={ct.tooltipStyle} />
                  <Bar
                    dataKey="value"
                    name="Projects"
                    fill={theme.palette.primary.main}
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  >
                    <LabelList dataKey="value" position="right" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Profitability Per Team Lead"
          subtitle="Profit amount (bars) and profit margin % (line) by team lead"
          chartHeight={chartHeight}
          loading={loading}
          showStatus
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, chartHeight: h }) => {
            const data = profitabilityPerTeamLeadDetailed(
              scope.scopedInvoices,
              scope.scopedVendorInvoices,
              scope.scopedExpenses,
              scope.filteredProjects,
            )
            if (data.length === 0) {
              return (
                <EmptyChartState
                  title="No profitability by team lead for selected filters"
                  height={h}
                />
              )
            }
            const marginCeil = Math.min(
              100,
              Math.max(25, Math.ceil(Math.max(...data.map((d) => d.marginPct), 0) / 5) * 5),
            )
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
                <ComposedChart data={data} margin={CHART_MARGIN_TEAM_PROFIT}>
                  <CartesianGrid {...ct.gridProps} vertical={false} />
                  <XAxis
                    dataKey="lead"
                    tick={{ ...ct.axisStyle, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={52}
                    tickFormatter={(v) => truncateCategoryTick(v, 10)}
                  />
                  <YAxis
                    yAxisId="profit"
                    tick={ct.axisStyle}
                    tickFormatter={yAxisCurrencyTick}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <YAxis
                    yAxisId="margin"
                    orientation="right"
                    tick={{ ...ct.axisStyle, fontSize: 10 }}
                    tickFormatter={marginPercentTick}
                    domain={[0, marginCeil]}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={ct.tooltipStyle}
                    formatter={(value, name) => {
                      if (name === 'Profit margin %') {
                        return [marginPercentTooltip(value), name]
                      }
                      return [ru(Number(value ?? 0)), name]
                    }}
                  />
                  <Legend {...legendBottom} iconSize={8} />
                  <ReferenceLine yAxisId="profit" y={0} stroke={theme.palette.divider} />
                  <Bar
                    yAxisId="profit"
                    dataKey="profit"
                    name="Profit amount"
                    radius={[4, 4, 0, 0]}
                    barSize={22}
                    maxBarSize={28}
                  >
                    {data.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.profit >= 0
                            ? theme.palette.success.main
                            : theme.palette.error.main
                        }
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="margin"
                    type="monotone"
                    dataKey="marginPct"
                    name="Profit margin %"
                    stroke={theme.palette.info.main}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )
          }}
        </ScopedChartPanel>
      </Box>

      <ScopedChartPanel
        title="Team Revenue Contribution"
        subtitle="Revenue by team lead, stacked by project type"
        chartHeight={chartHeight}
        loading={loading}
        showStatus
        globalFilters={globalFilters}
        data={chartData}
      >
        {({ scope, chartHeight: h }) => {
          const data = teamRevenueStacked(scope.scopedInvoices, scope.filteredProjects)
          if (data.length === 0) {
            return (
              <EmptyChartState
                title="No team revenue contribution for selected filters"
                height={h}
              />
            )
          }
            return (
              <ResponsiveContainer width="100%" height="100%" minHeight={h}>
              <BarChart data={data} layout="vertical" margin={CHART_MARGIN_STACKED_HORIZONTAL}>
                <CartesianGrid {...ct.gridProps} horizontal={false} />
                <XAxis
                  type="number"
                  tick={ct.axisStyle}
                  tickFormatter={yAxisCurrencyTick}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <YAxis
                  type="category"
                  dataKey="lead"
                  width={CHART_CATEGORY_AXIS_WIDTH}
                  tick={{ ...ct.axisStyle, fontSize: 10 }}
                  tickFormatter={(v) => truncateCategoryTick(v, 18)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={ct.tooltipStyle}
                  formatter={(v, n) => [ru(Number(v ?? 0)), String(n)]}
                />
                <Legend {...legendBottom} iconSize={8} wrapperStyle={{ ...legendBottom.wrapperStyle, fontSize: 10 }} />
                {CLIENT_PROJECT_TYPES.map((t, i) => (
                  <Bar
                    key={t}
                    dataKey={t}
                    name={t}
                    stackId="team"
                    fill={colors[i % colors.length]}
                    barSize={20}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )
        }}
      </ScopedChartPanel>
    </DashboardSection>
  )
}

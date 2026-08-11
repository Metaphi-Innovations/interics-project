/**
 * Dashboard 1 — Team section
 * Employee + time filters, KPIs, Team Performance master graph, and existing charts
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Grid,
  MenuItem,
  Paper,
  Select as MuiSelect,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Building2,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  Ruler,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  ChartCard,
  LineChart,
} from '@/design-system/components'
import { CHART_COLORS, tokens, TREND_COLORS } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import {
  getTeamAnalytics,
  getTeamPerformanceAnalytics,
  TEAM_EMPLOYEE_OPTIONS,
  TEAM_METRIC_OPTIONS,
  TEAM_TIME_PERIOD_OPTIONS,
  type TeamKpi,
  type TeamMetric,
  type TeamTimePeriod,
} from './teamAnalyticsData'

const ICON_MAP: Record<TeamKpi['icon'], { node: ReactNode; color: string }> = {
  revenue: {
    node: <CircleDollarSign size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  profit: {
    node: <TrendingUp size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
  sqft: {
    node: <Ruler size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.amber,
  },
  projects: {
    node: <FolderKanban size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
  size: {
    node: <Building2 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.purple,
  },
  duration: {
    node: <Clock3 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.grey,
  },
}

const SELECT_SX = { minWidth: 160, fontSize: 12, height: 32 } as const
const METRIC_SELECT_SX = { minWidth: 200, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const

const FILTER_LABEL_SX = {
  display: 'block',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  mb: 0.5,
} as const

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function formatSqft(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('en-IN')
}

function formatDays(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${Math.round(n)}d`
}

function formatCount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return String(Math.round(n))
}

function TeamKpiCard({ kpi }: { kpi: TeamKpi }) {
  const theme = useTheme()
  const iconMeta = ICON_MAP[kpi.icon]
  const comparisonColor =
    kpi.comparison?.direction === 'up' ? TREND_COLORS.up.color : TREND_COLORS.down.color

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: 2,
        borderRadius: '10px',
        border: `1px solid ${tokens.color.neutral[200]}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ fontSize: 11, letterSpacing: 0.3, lineHeight: 1.35, pr: 0.5 }}
        >
          {kpi.title}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(iconMeta.color, theme.palette.mode === 'dark' ? 0.2 : 0.1),
            color: iconMeta.color,
          }}
        >
          {iconMeta.node}
        </Box>
      </Box>

      <Box>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ fontSize: { xs: 18, md: 20 }, lineHeight: 1.2, letterSpacing: -0.3 }}
        >
          {kpi.value}
        </Typography>
        {kpi.valueLabel ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, fontWeight: 600, display: 'block', mt: 0.25 }}
          >
            {kpi.valueLabel}
          </Typography>
        ) : null}
      </Box>

      {kpi.comparison ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, mt: 'auto' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: comparisonColor,
            }}
          >
            {kpi.comparison.direction === 'up' ? (
              <TrendingUp size={12} strokeWidth={2} />
            ) : (
              <TrendingDown size={12} strokeWidth={2} />
            )}
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, color: 'inherit' }}>
              {kpi.comparison.percent}%
            </Typography>
          </Box>
          {kpi.comparison.previousValue ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              Previous Year:{' '}
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {kpi.comparison.previousValue}
              </Box>
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            {kpi.comparison.label}
          </Typography>
        </Box>
      ) : null}

      {kpi.breakdown ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 'auto' }}>
          {kpi.breakdown.map((item) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: 11, flexShrink: 0 }}
              >
                {item.label}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 8,
                  borderBottom: `1px dotted ${tokens.color.neutral[300]}`,
                  transform: 'translateY(-3px)',
                }}
              />
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ fontSize: 11, color: 'text.primary', flexShrink: 0 }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      {!kpi.comparison && !kpi.breakdown ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mt: 'auto' }}>
          {kpi.subtitle}
        </Typography>
      ) : null}
    </Paper>
  )
}

export function TeamSection() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const projectsLoading = useAppSelector((s) => s.projects.loading)

  const [employeeId, setEmployeeId] = useState('all')
  const [timePeriod, setTimePeriod] = useState<TeamTimePeriod>('This Year')
  const [teamMemberId, setTeamMemberId] = useState('all')
  const [metric, setMetric] = useState<TeamMetric>('Number of Projects')

  useEffect(() => {
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
  }, [dispatch])

  const employeeLabel = useMemo(() => {
    const match = TEAM_EMPLOYEE_OPTIONS.find((o) => o.value === employeeId)
    return match?.label ?? 'All Employees'
  }, [employeeId])

  const analytics = useMemo(
    () => getTeamAnalytics(employeeId, timePeriod),
    [employeeId, timePeriod],
  )

  const performance = useMemo(
    () => getTeamPerformanceAnalytics(projects, timePeriod, teamMemberId, metric),
    [projects, timePeriod, teamMemberId, metric],
  )

  useEffect(() => {
    if (!performance.memberOptions.some((o) => o.value === teamMemberId)) {
      setTeamMemberId('all')
    }
  }, [performance.memberOptions, teamMemberId])

  const scopeLabel = employeeId === 'all' ? 'team' : employeeLabel
  const { sqftSummary } = analytics

  const chart = performance.performanceChart
  const formatPerfY =
    chart.format === 'currency'
      ? formatAxisAmount
      : chart.format === 'sqft'
        ? formatSqft
        : chart.format === 'days'
          ? formatDays
          : formatCount
  const chartHeight = Math.max(300, Math.min(520, chart.data.length * 40 + 80))
  const hasChartData = chart.data.length > 0
  const dualSeries = chart.series.length > 1

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'flex-end' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
            Team
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
            Individual performance across revenue, delivery, and capacity.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
            Employee: {employeeLabel} • Time Period: {timePeriod}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={FILTER_LABEL_SX}
            >
              Employee
            </Typography>
            <MuiSelect
              size="small"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              sx={SELECT_SX}
            >
              {TEAM_EMPLOYEE_OPTIONS.map((opt) => (
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
              Time Period
            </Typography>
            <MuiSelect
              size="small"
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TeamTimePeriod)}
              sx={{ ...SELECT_SX, minWidth: 140 }}
            >
              {TEAM_TIME_PERIOD_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                  {opt}
                </MenuItem>
              ))}
            </MuiSelect>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {analytics.kpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <TeamKpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2 }}>
        <ChartCard
          title="Team Performance"
          subtitle={`${chart.yAxisLabel} by team member`}
          action={
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Team Member
                </Typography>
                <MuiSelect
                  size="small"
                  value={teamMemberId}
                  onChange={(e) => setTeamMemberId(e.target.value)}
                  sx={SELECT_SX}
                >
                  {performance.memberOptions.map((opt) => (
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
                  Metric
                </Typography>
                <MuiSelect
                  size="small"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as TeamMetric)}
                  sx={METRIC_SELECT_SX}
                >
                  {TEAM_METRIC_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                      {opt}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>

              {dualSeries && (
                <Box sx={{ alignSelf: 'center', ml: { xs: 0, sm: 0.5 } }}>
                  <ChartSeriesLegend
                    items={chart.series.map((s) => ({ label: s.label, color: s.color }))}
                  />
                </Box>
              )}
            </Box>
          }
        >
          {projectsLoading && !hasChartData ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              Loading team performance…
            </Typography>
          ) : !hasChartData ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              No team member data for the selected filters.
            </Typography>
          ) : (
            <BarChart
              data={[...chart.data]}
              xKey="member"
              height={chartHeight}
              orientation="horizontal"
              showLegend={false}
              barSize={dualSeries ? 12 : 18}
              bars={chart.series.map((s) => ({
                key: s.key,
                label: s.label,
                color: s.color,
              }))}
              formatX={formatPerfY}
            />
          )}
        </ChartCard>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Revenue Trend"
            subtitle={`Revenue growth for ${scopeLabel} with previous-year comparison`}
            action={
              <ChartSeriesLegend
                items={[
                  { label: 'Current', color: CHART_COLORS.teal },
                  { label: 'Previous Year', color: CHART_COLORS.grey },
                ]}
              />
            }
          >
            <LineChart
              data={[...analytics.revenueTrend]}
              xKey={analytics.revenueTrendXKey}
              height={300}
              lines={[
                { key: 'current', label: 'Current', color: CHART_COLORS.teal },
                { key: 'previous', label: 'Previous Year', color: CHART_COLORS.grey },
              ]}
              showLegend={false}
              formatY={formatAxisAmount}
              formatTooltip={formatAxisAmount}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Projects by Stage"
            subtitle={`Pitch, Live, and Completed mix for ${scopeLabel}`}
            action={
              <ChartSeriesLegend
                items={[
                  { label: 'Pitch', color: CHART_COLORS.blue },
                  { label: 'Live', color: CHART_COLORS.teal },
                  { label: 'Completed', color: CHART_COLORS.green },
                ]}
              />
            }
          >
            <BarChart
              data={[...analytics.projectsByStage]}
              xKey="label"
              height={300}
              orientation="horizontal"
              stacked
              showLegend={false}
              barSize={28}
              bars={[
                { key: 'pitch', label: 'Pitch', color: CHART_COLORS.blue },
                { key: 'live', label: 'Live', color: CHART_COLORS.teal },
                { key: 'completed', label: 'Completed', color: CHART_COLORS.green },
              ]}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Sq.ft Designed Trend" subtitle={`Sq.ft designed for ${scopeLabel}`}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 1, sm: 2.5 },
                mb: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                {sqftSummary.averageLabel} :{' '}
                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {formatSqft(sqftSummary.averageValue)} Sq.ft
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                {sqftSummary.totalLabel} :{' '}
                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {formatSqft(sqftSummary.totalValue)} Sq.ft
                </Box>
              </Typography>
            </Box>
            <BarChart
              data={[...analytics.sqftTrend]}
              xKey="period"
              height={280}
              bars={[{ key: 'sqft', label: 'Sq.ft', color: CHART_COLORS.amber }]}
              showLegend={false}
              formatY={formatSqft}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Revenue vs Profit"
            subtitle={`Current vs previous year for ${scopeLabel}`}
            action={
              <ChartSeriesLegend
                items={[
                  { label: 'Revenue', color: CHART_COLORS.teal },
                  { label: 'Profit', color: CHART_COLORS.green },
                ]}
              />
            }
          >
            <BarChart
              data={[...analytics.revenueVsProfit]}
              xKey="period"
              height={300}
              showLegend={false}
              bars={[
                { key: 'revenue', label: 'Revenue', color: CHART_COLORS.teal },
                { key: 'profit', label: 'Profit', color: CHART_COLORS.green },
              ]}
              formatY={formatAxisAmount}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

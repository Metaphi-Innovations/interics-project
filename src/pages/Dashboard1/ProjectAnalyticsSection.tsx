/**
 * Dashboard 1 — Project Analytics
 * Live project duration / size, repeat clients, completions, conversion KPI
 */
import { useEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from 'react'
import {
  Autocomplete,
  Box,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Clock3, RefreshCw } from 'lucide-react'
import type { TooltipContentProps } from 'recharts'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart as RechartsLineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Props as RechartsLabelProps } from 'recharts/types/component/Label'
import {
  BarChart,
  ChartCard,
} from '@/design-system/components'
import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import {
  ALL_LIVE_PROJECTS_VALUE,
  buildLiveDurationByMonth,
  buildLiveProjectDurationTimeline,
  buildLiveProjectSelectOptions,
  buildLiveProjectSizes,
  filterProjectsForLiveAnalytics,
  PITCH_TO_LIVE_CONVERSION,
  PROJECTS_COMPLETED_BY_YEAR,
  REPEAT_CLIENTS_KPI,
  type LiveDurationByMonthPoint,
  type LiveProjectSelectOption,
  type LiveProjectSizePoint,
  type LiveProjectTimelineMeta,
  type LiveProjectTimelinePoint,
} from './projectAnalyticsData'

const FILTER_LABEL_SX = {
  display: 'block',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  mb: 0.5,
} as const

const AUTOCOMPLETE_SX = {
  minWidth: { xs: '100%', sm: 200 },
  maxWidth: { xs: '100%', sm: 260 },
  '& .MuiOutlinedInput-root': {
    height: 32,
    fontSize: 12,
    bgcolor: 'background.paper',
    '& fieldset': {
      borderColor: tokens.color.neutral[200],
    },
  },
  '& .MuiInputBase-input': {
    fontSize: 12,
    py: 0,
  },
} as const

const ALL_LIVE_OPTION: LiveProjectSelectOption = {
  value: ALL_LIVE_PROJECTS_VALUE,
  label: 'All Live Projects',
}

function formatSqft(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${Math.round(n).toLocaleString('en-IN')}`
}

function formatSqftAxis(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(Math.round(n))
}

function formatDaysAxis(value: number | string): string {
  if (value == null || value === '') return ''
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${Math.round(n)}d`
}

function shortenProjectLabel(value: number | string): string {
  const label = String(value)
  if (label.length <= 14) return label
  return `${label.slice(0, 12)}…`
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
        maxWidth: 280,
      }}
    >
      {children}
    </Box>
  )
}

function LiveDurationTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as LiveDurationByMonthPoint | undefined
  if (!point) return null

  const monthLabel = String(label ?? point.month)

  return (
    <ChartTooltipShell>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
        Month: {monthLabel}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
      >
        Live Projects: {point.liveProjects}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
      >
        Avg Running Duration:{' '}
        {point.avgDurationDays == null ? '—' : `${point.avgDurationDays} days`}
      </Typography>
      {point.projects.length > 0 ? (
        <Box sx={{ mt: 0.75 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, display: 'block', fontWeight: 600 }}
          >
            Projects
          </Typography>
          {point.projects.slice(0, 6).map((p) => (
            <Typography
              key={p.name}
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 11, display: 'block', mt: 0.15 }}
            >
              • {p.name}: {p.durationDays} days
            </Typography>
          ))}
          {point.projects.length > 6 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 11, display: 'block', mt: 0.15 }}
            >
              +{point.projects.length - 6} more
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </ChartTooltipShell>
  )
}

function LiveProjectCountLabel(props: RechartsLabelProps) {
  const { x, y, value } = props
  if (x == null || y == null || value == null || value === '') return null
  const count = Number(value)
  if (!Number.isFinite(count) || count <= 0) return null

  return (
    <text
      x={Number(x)}
      y={Number(y) - 10}
      textAnchor="middle"
      fill={tokens.color.neutral[600]}
      fontSize={10}
      fontWeight={600}
    >
      {count}
    </text>
  )
}

/** Local line chart: Avg Running Duration + Live Project count labels on points. */
function LiveDurationLineChart({
  data,
  height = 300,
}: {
  data: LiveDurationByMonthPoint[]
  height?: number
}) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height

  return (
    <ResponsiveContainer width="100%" height={h}>
        <RechartsLineChart
          data={data}
          margin={{
            top: 20,
            right: ct.isMobile ? 8 : 16,
            left: ct.isMobile ? 4 : 8,
            bottom: 4,
          }}
        >
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
          />
          <XAxis
            dataKey="month"
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
          />
          <YAxis
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={false}
            width={ct.isMobile ? 44 : 58}
            tickMargin={4}
            tickFormatter={formatDaysAxis}
          />
          <Tooltip content={LiveDurationTooltip} isAnimationActive={false} animationDuration={0} />
          <Line
            type="monotone"
            dataKey="avgDurationDays"
            name="Avg Running Duration"
            stroke={CHART_COLORS.blue}
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.blue }}
            activeDot={{ r: 5, strokeWidth: 0, fill: CHART_COLORS.blue }}
            isAnimationActive={false}
          >
            <LabelList dataKey="liveProjects" content={LiveProjectCountLabel} />
          </Line>
        </RechartsLineChart>
      </ResponsiveContainer>
  )
}

function SingleProjectTimelineTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as LiveProjectTimelinePoint | undefined
  if (!point) return null

  return (
    <ChartTooltipShell>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
        {point.month}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
      >
        Running Duration: {point.durationDays} days
      </Typography>
    </ChartTooltipShell>
  )
}

function TimelineMarkerLabel({
  viewBox,
  text,
  color,
}: {
  viewBox?: { x?: number; y?: number }
  text: string
  color: string
}) {
  const x = viewBox?.x ?? 0
  const y = viewBox?.y ?? 0
  return (
    <text
      x={x}
      y={y - 12}
      textAnchor="middle"
      fill={color}
      fontSize={10}
      fontWeight={700}
    >
      {text}
    </text>
  )
}

/** Single Live project: running duration from Start → Today/End. */
function LiveProjectTimelineChart({
  series,
  meta,
  height = 260,
}: {
  series: LiveProjectTimelinePoint[]
  meta: LiveProjectTimelineMeta
  height?: number
}) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height
  const startPoint = series.find((p) => p.marker === 'start')
  const endPoint = series.find((p) => p.marker === 'today' || p.marker === 'end')
  const endMarkerLabel = meta.endIsOngoing ? 'TODAY' : 'END'

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 1, sm: 2.5 },
          mb: 1.5,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
          Running Duration:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {meta.runningDays} days
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
          Start:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {meta.startLabel}
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
          End:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {meta.endLabel}
          </Box>
        </Typography>
      </Box>

      <ResponsiveContainer width="100%" height={h}>
        <RechartsLineChart
          data={series}
          margin={{
            top: 28,
            right: ct.isMobile ? 12 : 20,
            left: ct.isMobile ? 4 : 8,
            bottom: 4,
          }}
        >
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
          />
          <XAxis
            dataKey="monthKey"
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            tickFormatter={(key: string) => {
              const point = series.find((p) => p.monthKey === key)
              return point?.month ?? String(key)
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={false}
            width={ct.isMobile ? 44 : 58}
            tickMargin={4}
            tickFormatter={formatDaysAxis}
          />
          <Tooltip content={SingleProjectTimelineTooltip} isAnimationActive={false} animationDuration={0} />
          <Line
            type="monotone"
            dataKey="durationDays"
            name="Running Duration"
            stroke={CHART_COLORS.teal}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.teal }}
            activeDot={{ r: 5, strokeWidth: 0, fill: CHART_COLORS.teal }}
            isAnimationActive={false}
          />
          {startPoint ? (
            <ReferenceDot
              x={startPoint.monthKey}
              y={startPoint.durationDays}
              r={6}
              fill={CHART_COLORS.green}
              stroke="none"
              label={(props) => (
                <TimelineMarkerLabel {...props} text="START" color={CHART_COLORS.green} />
              )}
            />
          ) : null}
          {endPoint ? (
            <ReferenceDot
              x={endPoint.monthKey}
              y={endPoint.durationDays}
              r={6}
              fill={CHART_COLORS.amber}
              stroke="none"
              label={(props) => (
                <TimelineMarkerLabel
                  {...props}
                  text={endMarkerLabel}
                  color={CHART_COLORS.amber}
                />
              )}
            />
          ) : null}
        </RechartsLineChart>
      </ResponsiveContainer>
    </Box>
  )
}

function LiveSizeTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as LiveProjectSizePoint | undefined
  if (!point) return null

  return (
    <ChartTooltipShell>
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
        {point.project}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
      >
        Project Size: {formatSqft(point.sqft)} sqft
      </Typography>
    </ChartTooltipShell>
  )
}

function MetricKpiCard({
  icon,
  iconColor,
  title,
  value,
  subtitle,
  footer,
}: {
  icon: ReactNode
  iconColor: string
  title: string
  value: string
  subtitle: string
  footer?: ReactNode
}) {
  const theme = useTheme()

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
          {title}
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
            bgcolor: alpha(iconColor, theme.palette.mode === 'dark' ? 0.2 : 0.1),
            color: iconColor,
          }}
        >
          {icon}
        </Box>
      </Box>

      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ fontSize: { xs: 22, md: 26 }, lineHeight: 1.15, letterSpacing: -0.3 }}
      >
        {value}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {subtitle}
      </Typography>

      {footer != null ? <Box sx={{ mt: 'auto', pt: 0.5 }}>{footer}</Box> : null}
    </Paper>
  )
}

export interface ProjectAnalyticsSectionProps {
  dateRange?: string
  clientFilter?: string
  statusFilter?: string
  pmFilter?: string
}

export function ProjectAnalyticsSection({
  dateRange = 'This Year',
  clientFilter = 'All Clients',
  statusFilter = 'All Status',
  pmFilter = 'All Managers',
}: ProjectAnalyticsSectionProps) {
  const dispatch = useAppDispatch()
  const projects = useAppSelector((s) => s.projects.items ?? [])

  const [liveProjectId, setLiveProjectId] = useState(ALL_LIVE_PROJECTS_VALUE)
  const [sizeProjectId, setSizeProjectId] = useState(ALL_LIVE_PROJECTS_VALUE)
  const liveDurationDateRange = 'Last 12 Months' as const

  useEffect(() => {
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
  }, [dispatch])

  const liveProjects = useMemo(
    () =>
      filterProjectsForLiveAnalytics(projects, {
        dateRange,
        clientFilter,
        statusFilter,
        pmFilter,
      }),
    [projects, dateRange, clientFilter, statusFilter, pmFilter],
  )

  const liveProjectOptions = useMemo(
    () => buildLiveProjectSelectOptions(projects),
    [projects],
  )

  const selectedLiveProjectOption = useMemo(() => {
    return (
      liveProjectOptions.find((o) => o.value === liveProjectId) ?? ALL_LIVE_OPTION
    )
  }, [liveProjectOptions, liveProjectId])

  const selectedSizeProjectOption = useMemo(() => {
    return (
      liveProjectOptions.find((o) => o.value === sizeProjectId) ?? ALL_LIVE_OPTION
    )
  }, [liveProjectOptions, sizeProjectId])

  useEffect(() => {
    if (!liveProjectOptions.some((o) => o.value === liveProjectId)) {
      setLiveProjectId(ALL_LIVE_PROJECTS_VALUE)
    }
  }, [liveProjectOptions, liveProjectId])

  useEffect(() => {
    if (!liveProjectOptions.some((o) => o.value === sizeProjectId)) {
      setSizeProjectId(ALL_LIVE_PROJECTS_VALUE)
    }
  }, [liveProjectOptions, sizeProjectId])

  const isAllLiveProjects = liveProjectId === ALL_LIVE_PROJECTS_VALUE

  const liveDuration = useMemo(
    () => buildLiveDurationByMonth(liveProjects, liveDurationDateRange),
    [liveProjects, liveDurationDateRange],
  )

  const selectedLiveProject = useMemo(
    () => projects.find((p) => p.id === liveProjectId && p.status === 'Live') ?? null,
    [projects, liveProjectId],
  )

  const singleTimeline = useMemo(
    () => buildLiveProjectDurationTimeline(selectedLiveProject),
    [selectedLiveProject],
  )

  const liveSizes = useMemo(() => buildLiveProjectSizes(liveProjects), [liveProjects])

  /** Chart series only — Top 5 by sqft when All, or the selected project. */
  const liveSizeChartSeries = useMemo(() => {
    if (sizeProjectId === ALL_LIVE_PROJECTS_VALUE) {
      return liveSizes.series.slice(0, 5)
    }
    return liveSizes.series.filter((row) => row.projectId === sizeProjectId)
  }, [liveSizes.series, sizeProjectId])

  const hasDurationTrend = liveDuration.liveCount > 0
  const sizeChartHeight = Math.max(
    280,
    Math.min(420, liveSizeChartSeries.length * 8 + 260),
  )

  const handleLiveProjectChange = (
    _event: SyntheticEvent,
    value: LiveProjectSelectOption | null,
  ) => {
    if (value == null) return
    setLiveProjectId(value.value)
  }

  const handleSizeProjectChange = (
    _event: SyntheticEvent,
    value: LiveProjectSelectOption | null,
  ) => {
    if (value == null) return
    setSizeProjectId(value.value)
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Project Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Overall project performance across duration, size, and conversion.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Live Project Duration"
            subtitle={
              isAllLiveProjects
                ? 'Month-wise Live Projects count and average running duration (days)'
                : 'Running duration timeline from project start to today'
            }
            action={
              <Box sx={{ width: { xs: '100%', sm: 240 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Project
                </Typography>
                <Autocomplete
                  size="small"
                  disableClearable
                  options={liveProjectOptions}
                  value={selectedLiveProjectOption}
                  onChange={handleLiveProjectChange}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search live projects..."
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select live project',
                      }}
                    />
                  )}
                  slotProps={{
                    paper: {
                      sx: {
                        fontSize: 12,
                        '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                      },
                    },
                  }}
                  sx={{ ...AUTOCOMPLETE_SX, maxWidth: '100%' }}
                />
              </Box>
            }
          >
            {isAllLiveProjects ? (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: { xs: 1, sm: 2.5 },
                    mb: 1.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                    Live Projects:{' '}
                    <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {liveDuration.liveCount}
                    </Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                    Average Live Project Duration:{' '}
                    <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {liveDuration.averageDurationDays == null
                        ? '—'
                        : `${liveDuration.averageDurationDays} days`}
                    </Box>
                  </Typography>
                </Box>
                {!hasDurationTrend ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
                  >
                    No live projects with valid start dates for the selected filters.
                  </Typography>
                ) : (
                  <LiveDurationLineChart data={[...liveDuration.series]} height={300} />
                )}
              </>
            ) : singleTimeline.meta == null || singleTimeline.series.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
              >
                No running-duration data for the selected live project.
              </Typography>
            ) : (
              <LiveProjectTimelineChart
                series={singleTimeline.series}
                meta={singleTimeline.meta}
                height={260}
              />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Live Project Size"
            subtitle="Carpet area (sqft) for each live/active project"
            action={
              <Box sx={{ width: { xs: '100%', sm: 240 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Live Project
                </Typography>
                <Autocomplete
                  size="small"
                  disableClearable
                  options={liveProjectOptions}
                  value={selectedSizeProjectOption}
                  onChange={handleSizeProjectChange}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search live projects..."
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select live project for size graph',
                      }}
                    />
                  )}
                  slotProps={{
                    paper: {
                      sx: {
                        fontSize: 12,
                        '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                      },
                    },
                  }}
                  sx={{ ...AUTOCOMPLETE_SX, maxWidth: '100%' }}
                />
              </Box>
            }
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 1, sm: 2.5 },
                mb: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                Live Projects:{' '}
                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {liveSizes.liveCount}
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                Average Project Size:{' '}
                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {liveSizes.averageSqft == null
                    ? '—'
                    : `${liveSizes.averageSqft.toLocaleString('en-IN')} sqft`}
                </Box>
              </Typography>
            </Box>
            {liveSizeChartSeries.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
              >
                No live projects with size data for the selected filters.
              </Typography>
            ) : (
              <BarChart
                data={[...liveSizeChartSeries]}
                xKey="project"
                height={sizeChartHeight}
                orientation="vertical"
                showLegend={false}
                barSize={28}
                bars={[{ key: 'sqft', label: 'Project Size (sqft)', color: CHART_COLORS.amber }]}
                formatX={shortenProjectLabel}
                formatY={formatSqftAxis}
                tooltipContent={LiveSizeTooltip}
              />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <MetricKpiCard
                icon={<RefreshCw size={18} strokeWidth={1.75} />}
                iconColor={CHART_COLORS.purple}
                title="Repeat Clients"
                value={String(REPEAT_CLIENTS_KPI.total)}
                subtitle="Clients with more than one project."
                footer={
                  <Stack direction="row" alignItems="baseline" gap={0.75}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ fontSize: 16, color: CHART_COLORS.purple }}
                    >
                      {REPEAT_CLIENTS_KPI.percentage}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      of all clients
                    </Typography>
                  </Stack>
                }
              />
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <MetricKpiCard
                icon={<Clock3 size={18} strokeWidth={1.75} />}
                iconColor={CHART_COLORS.teal}
                title="Average Pitch to Live Conversion Time"
                value={`${PITCH_TO_LIVE_CONVERSION.avgDays} days`}
                subtitle={PITCH_TO_LIVE_CONVERSION.subtitle}
              />
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard
            title="Projects Completed by Year"
            subtitle="Yearly completed project count"
          >
            <BarChart
              data={[...PROJECTS_COMPLETED_BY_YEAR]}
              xKey="year"
              height={260}
              bars={[{ key: 'completed', label: 'Completed', color: CHART_COLORS.green }]}
              showLegend={false}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

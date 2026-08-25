/**
 * Dashboard — Team section
 * Team Performance master graph and existing charts
 */
import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode, type SyntheticEvent } from 'react'
import {
  Autocomplete,
  Box,
  Grid,
  MenuItem,
  Select as MuiSelect,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { TooltipContentProps } from 'recharts'
import {
  BarChart,
  ChartCard,
  Checkbox,
  useToast,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import {
  getSqftDesignedByTeamMember,
  getTeamAnalytics,
  getTeamPerformanceAnalytics,
  MAX_SQFT_TEAM_MEMBERS,
  TEAM_METRIC_OPTIONS,
  type TeamMemberOption,
  type TeamMetric,
  type TeamPerformanceChartConfig,
  type TeamTimePeriod,
} from './teamAnalyticsData'

const METRIC_SELECT_SX = { minWidth: 200, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const

/** Match Metric Select theme fill (action.hover, no outline) — do not override bgcolor/border. */
const MEMBER_AUTOCOMPLETE_SX = {
  minWidth: { xs: '100%', sm: 200 },
  maxWidth: { xs: '100%', sm: 240 },
  '& .MuiOutlinedInput-root': {
    height: 32,
    fontSize: 12,
  },
  '& .MuiInputBase-input': {
    fontSize: 12,
    py: 0,
  },
} as const

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

function formatMetricValue(
  value: number | string | null | undefined,
  format: TeamPerformanceChartConfig['format'],
): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  if (format === 'currency') return `₹${formatCurrency(n)}`
  if (format === 'sqft') return `${Math.round(n).toLocaleString('en-IN')} sqft`
  if (format === 'days') return `${Math.round(n)} days`
  return String(Math.round(n))
}

function ChartTooltipShell({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${tokens.color.neutral[200]}`,
        borderRadius: 1,
        px: 1.5,
        py: 1,
        boxShadow: tokens.shadow.md,
        maxWidth: 280,
      }}
    >
      {children}
    </Box>
  )
}

function TeamPerformanceTooltip({
  active,
  payload,
  format,
}: TooltipContentProps & { format: TeamPerformanceChartConfig['format'] }) {
  if (!active || !payload?.length) return null
  const member = String(payload[0]?.payload?.member ?? '')

  // Calculate total projects if it's the Number of Projects status breakdown
  const isNumberProjects = payload.some((entry) =>
    ['pitch', 'live', 'completed', 'cancelled', 'archived'].includes(String(entry.dataKey)),
  )
  let totalProjectsSum = 0
  if (isNumberProjects) {
    payload.forEach(entry => {
      const val = Number(entry.value)
      if (!Number.isNaN(val)) {
        totalProjectsSum += val
      }
    })
  }

  return (
    <ChartTooltipShell>
      {member ? (
        <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block', mb: 0.5 }}>
          {member}
        </Typography>
      ) : null}
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? entry.name ?? '')
        const label = String(entry.name ?? key)
        return (
          <Typography
            key={key}
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
          >
            <Box component="span" sx={{ color: String(entry.color ?? 'inherit') }}>
              ●
            </Box>{' '}
            {label}:{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatMetricValue(entry.value as number | string | undefined, format)}
            </Box>
          </Typography>
        )
      })}
      {isNumberProjects && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: 11, display: 'block', mt: 0.75, pt: 0.5, borderTop: `1px solid ${tokens.color.neutral[200]}` }}
        >
          Total Projects:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {totalProjectsSum}
          </Box>
        </Typography>
      )}
    </ChartTooltipShell>
  )
}

export function TeamSection() {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const projectsLoading = useAppSelector((s) => s.projects.loading)

  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([])
  const [metric, setMetric] = useState<TeamMetric>('Number of Projects')
  const [sqftMemberIds, setSqftMemberIds] = useState<string[]>([])
  const employeeId = 'all'
  const timePeriod: TeamTimePeriod = 'This Year'

  useEffect(() => {
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
  }, [dispatch])

  const analytics = useMemo(
    () => getTeamAnalytics(employeeId, timePeriod),
    [employeeId, timePeriod],
  )

  const performance = useMemo(
    () => getTeamPerformanceAnalytics(projects, timePeriod, teamMemberIds, metric),
    [projects, timePeriod, teamMemberIds, metric],
  )

  // Filter out any selected member IDs that are not present in options
  useEffect(() => {
    const validIds = teamMemberIds.filter((id) =>
      performance.memberOptions.some((o) => o.value === id),
    )
    if (validIds.length !== teamMemberIds.length) {
      setTeamMemberIds(validIds)
    }
  }, [performance.memberOptions, teamMemberIds])

  const selectedTeamMemberOptions = useMemo((): TeamMemberOption[] => {
    return performance.memberOptions.filter((opt) => teamMemberIds.includes(opt.value))
  }, [performance.memberOptions, teamMemberIds])

  const handleTeamMemberChange = (
    _event: SyntheticEvent,
    value: TeamMemberOption[],
  ) => {
    // If selecting "All Team Members" (value contains 'all') or no members selected, clear to default top 10
    if (value.some((o) => o.value === 'all')) {
      setTeamMemberIds([])
    } else {
      setTeamMemberIds(value.map((o) => o.value))
    }
  }

  const scopeLabel = 'team'

  const sqftByMember = useMemo(
    () => getSqftDesignedByTeamMember(projects, timePeriod),
    [projects, timePeriod],
  )

  const selectedSqftMembers = useMemo(
    () =>
      sqftByMember.memberOptions.filter((opt) => sqftMemberIds.includes(opt.value)),
    [sqftByMember.memberOptions, sqftMemberIds],
  )

  const sqftChartData = useMemo(() => {
    const ranked =
      sqftMemberIds.length === 0
        ? sqftByMember.members.slice(0, MAX_SQFT_TEAM_MEMBERS)
        : sqftByMember.members
            .filter((row) => sqftMemberIds.includes(row.userId))
            .sort((a, b) => b.sqft - a.sqft || a.member.localeCompare(b.member))
            .slice(0, MAX_SQFT_TEAM_MEMBERS)
    return [...ranked].reverse()
  }, [sqftByMember.members, sqftMemberIds])

  const sqftChartHeight = Math.max(280, Math.min(420, sqftChartData.length * 36 + 72))

  const handleSqftMembersChange = (
    _event: SyntheticEvent,
    value: TeamMemberOption[],
  ) => {
    if (value.length > MAX_SQFT_TEAM_MEMBERS) {
      toast.warning(
        'Maximum 10 team members',
        'A maximum of 10 team members can be compared at a time.',
      )
      return
    }
    setSqftMemberIds(value.map((opt) => opt.value))
  }

  const chart = performance.performanceChart
  const formatPerfY =
    chart.format === 'currency'
      ? formatAxisAmount
      : chart.format === 'sqft'
        ? formatSqft
        : chart.format === 'days'
          ? formatDays
          : formatCount
  const isYearComparison = metric === 'Completed Projects – Year Comparison'
  // Grouped year-comparison needs taller rows so Current / Previous bars sit side-by-side
  const chartHeight = Math.max(
    300,
    chart.data.length * (isYearComparison ? 64 : 44) + 80,
  )
  const hasChartData = chart.data.length > 0

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Team
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Individual performance across revenue, delivery, and capacity.
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <ChartCard
          title="Team Performance"
          subtitle={chart.subtitle}
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
              <Box sx={{ width: { xs: '100%', sm: 220 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Team Member
                </Typography>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  size="small"
                  options={performance.memberOptions}
                  value={selectedTeamMemberOptions}
                  onChange={handleTeamMemberChange}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props as {
                      key: string
                    } & HTMLAttributes<HTMLLIElement>
                    return (
                      <li key={key} {...rest}>
                        <Checkbox
                          checked={selected}
                          size="sm"
                          sx={{ mr: 1, pointerEvents: 'none' }}
                        />
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {option.label}
                        </Typography>
                      </li>
                    )
                  }}
                  renderTags={(selected) => (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 12, pl: 0.5, whiteSpace: 'nowrap' }}
                    >
                      {selected.length} selected
                    </Typography>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={
                        selectedTeamMemberOptions.length === 0
                          ? 'All Team Members'
                          : undefined
                      }
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select team members',
                      }}
                    />
                  )}
                  slotProps={{
                    listbox: {
                      sx: { maxHeight: 280, overflow: 'auto' },
                    },
                    paper: {
                      sx: {
                        fontSize: 12,
                        '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                      },
                    },
                  }}
                  sx={{
                    ...MEMBER_AUTOCOMPLETE_SX,
                    maxWidth: '100%',
                    '& .MuiOutlinedInput-root': {
                      ...MEMBER_AUTOCOMPLETE_SX['& .MuiOutlinedInput-root'],
                      height: 'auto',
                      minHeight: 32,
                      flexWrap: 'nowrap',
                    },
                  }}
                />
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
            <Box
              sx={{
                maxHeight: 520,
                overflowY: 'auto',
                overflowX: 'hidden',
                // Custom thin scrollbar styling
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'divider',
                  borderRadius: 3,
                },
              }}
            >
              <BarChart
                key={`${teamMemberIds.join(',')}-${metric}`}
                data={[...chart.data]}
                xKey="member"
                height={chartHeight}
                orientation="horizontal"
                stacked={metric === 'Number of Projects'}
                showLegend={false}
                barSize={
                  isYearComparison
                    ? 14
                    : chart.series.length > 1 && metric !== 'Number of Projects'
                      ? 12
                      : 18
                }
                bars={chart.series.map((s) => ({
                  key: s.key,
                  label: s.label,
                  color: s.color,
                }))}
                formatX={formatPerfY}
                tooltipContent={(props) => (
                  <TeamPerformanceTooltip {...props} format={chart.format} />
                )}
              />
              {chart.series.length > 1 ? (
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                  <ChartSeriesLegend
                    items={chart.series.map((s) => ({ label: s.label, color: s.color }))}
                  />
                </Box>
              ) : null}
            </Box>
          )}
        </ChartCard>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Sq.ft Designed by Team Member"
            subtitle="Total sq.ft designed by each team member"
            action={
              <Box sx={{ width: { xs: '100%', sm: 220 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Team Members
                </Typography>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  size="small"
                  options={sqftByMember.memberOptions}
                  value={selectedSqftMembers}
                  onChange={handleSqftMembersChange}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props as {
                      key: string
                    } & HTMLAttributes<HTMLLIElement>
                    return (
                      <li key={key} {...rest}>
                        <Checkbox
                          checked={selected}
                          size="sm"
                          sx={{ mr: 1, pointerEvents: 'none' }}
                        />
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {option.label}
                        </Typography>
                      </li>
                    )
                  }}
                  renderTags={(selected) => (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 12, pl: 0.5, whiteSpace: 'nowrap' }}
                    >
                      {selected.length} selected
                    </Typography>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={
                        selectedSqftMembers.length === 0
                          ? 'Top 10 team members'
                          : undefined
                      }
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select team members',
                      }}
                    />
                  )}
                  slotProps={{
                    listbox: {
                      sx: { maxHeight: 280, overflow: 'auto' },
                    },
                    paper: {
                      sx: {
                        fontSize: 12,
                        '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                      },
                    },
                  }}
                  sx={{
                    ...MEMBER_AUTOCOMPLETE_SX,
                    maxWidth: '100%',
                    '& .MuiOutlinedInput-root': {
                      ...MEMBER_AUTOCOMPLETE_SX['& .MuiOutlinedInput-root'],
                      height: 'auto',
                      minHeight: 32,
                      flexWrap: 'nowrap',
                    },
                  }}
                />
              </Box>
            }
          >
            {projectsLoading && sqftChartData.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
              >
                Loading team sq.ft data…
              </Typography>
            ) : sqftChartData.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
              >
                No sq.ft designed data for team members.
              </Typography>
            ) : (
              <BarChart
                data={sqftChartData}
                xKey="member"
                height={sqftChartHeight}
                orientation="horizontal"
                showLegend={false}
                barSize={22}
                bars={[{ key: 'sqft', label: 'Total Sq.ft Designed', color: CHART_COLORS.amber }]}
                formatX={formatSqft}
              />
            )}
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

/**
 * Dashboard — Project Analytics
 * Project Lifecycle & Size timeline + yearly completions
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
} from 'react'
import {
  Autocomplete,
  Box,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  BarChart,
  ChartCard,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import {
  buildProjectLifecycleData,
  filterProjectsForDashboard,
  PROJECTS_COMPLETED_BY_YEAR,
  type LifecycleEvent,
  type LifecycleEventType,
  type LifecycleProjectLine,
} from './projectAnalyticsData'
import { ChartSeriesLegend } from './ChartSeriesLegend'

/* ─────────────────── constants ─────────────────── */

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
    bgcolor: 'action.hover',
    '& fieldset': {
      border: 'none',
    },
  },
  '& .MuiInputBase-input': {
    fontSize: 12,
    py: 0,
    color: 'text.primary',
    opacity: 1,
  },
} as const

const ALL_PROJECTS_VALUE = 'ALL_PROJECTS'
const ALL_PROJECTS_OPTION = { value: ALL_PROJECTS_VALUE, label: 'All Projects' }

/** Map event type → fixed color */
const EVENT_COLORS: Record<LifecycleEventType, string> = {
  Pitch: CHART_COLORS.blue,
  Live: CHART_COLORS.teal,
  Completed: CHART_COLORS.green,
  Cancelled: CHART_COLORS.red,
  Archived: CHART_COLORS.orange,
}

const LEGEND_ITEMS = [
  { label: 'Pitch', color: CHART_COLORS.blue },
  { label: 'Live', color: CHART_COLORS.teal },
  { label: 'Completed', color: CHART_COLORS.green },
  { label: 'Cancelled', color: CHART_COLORS.red },
  { label: 'Archived', color: CHART_COLORS.orange },
] as const

/** FY month labels shown on the X-axis (Mar → Apr, no years). */
const FY_MONTH_SPECS: { month: number; yearOffset: number }[] = [
  { month: 2, yearOffset: 0 },  // Mar
  { month: 3, yearOffset: 0 },  // Apr
  { month: 4, yearOffset: 0 },  // May
  { month: 5, yearOffset: 0 },  // Jun
  { month: 6, yearOffset: 0 },  // Jul
  { month: 7, yearOffset: 0 },  // Aug
  { month: 8, yearOffset: 0 },  // Sep
  { month: 9, yearOffset: 0 },  // Oct
  { month: 10, yearOffset: 0 }, // Nov
  { month: 11, yearOffset: 0 }, // Dec
  { month: 0, yearOffset: 1 },  // Jan
  { month: 1, yearOffset: 1 },  // Feb
  { month: 2, yearOffset: 1 },  // Mar
  { month: 3, yearOffset: 1 },  // Apr
]

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

const VISIBLE_ROWS = 6
const ROW_HEIGHT = 58
const BAR_HEIGHT = 18
const BAR_RADIUS = 9
const MIN_SEGMENT_PX = 6
const TERMINAL_SEGMENT_MS = 45 * 24 * 3600 * 1000
/** Tight left gutter: names end just before the plot (was oversized empty gap). */
const SVG_LEFT_MARGIN = 128
const SVG_RIGHT_MARGIN = 20
const SVG_TOP_MARGIN = 8
const SVG_BOTTOM_MARGIN = 48
const NAME_GAP_PX = 8

/* ─────────────────── helpers ─────────────────── */

function formatSqft(value: number): string {
  return Math.round(value).toLocaleString('en-IN')
}

function resolveFyStartYear(refTs: number): number {
  const ref = new Date(refTs)
  const month = ref.getMonth()
  const year = ref.getFullYear()
  // Window Mar Y → Apr Y+1. May–Dec belong to Y; Jan–Apr belong to Y-1.
  return month >= 4 ? year : year - 1
}

function buildFyAxis(refTs: number): {
  domainStart: number
  domainEnd: number
  ticks: { ts: number; label: string }[]
} {
  const startYear = resolveFyStartYear(refTs)
  const ticks = FY_MONTH_SPECS.map(({ month, yearOffset }) => {
    const ts = new Date(startYear + yearOffset, month, 1).getTime()
    return { ts, label: MONTH_SHORT[month]! }
  })
  const domainStart = ticks[0]!.ts
  // End of final April
  const last = FY_MONTH_SPECS[FY_MONTH_SPECS.length - 1]!
  const domainEnd = new Date(
    startYear + last.yearOffset,
    last.month + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime()
  return { domainStart, domainEnd, ticks }
}

interface LifecycleSegment {
  event: LifecycleEvent
  start: number
  end: number
}

function buildLifecycleSegments(
  events: LifecycleEvent[],
  now: number,
): LifecycleSegment[] {
  const sorted = [...events].sort((a, b) => a.date - b.date)
  return sorted.map((event, index) => {
    const start = event.date
    let end: number
    if (index < sorted.length - 1) {
      end = sorted[index + 1]!.date
    } else if (event.eventType === 'Pitch' || event.eventType === 'Live') {
      end = Math.max(now, start)
    } else {
      end = start + TERMINAL_SEGMENT_MS
    }
    if (end <= start) {
      end = start + 7 * 24 * 3600 * 1000
    }
    return { event, start, end }
  })
}

/**
 * Shift each project's timeline so its first real stage begins at the plot
 * left edge (domainStart). Durations between stages are preserved; calendar
 * offsets that would leave empty space before the bar are removed.
 */
function alignSegmentsToPlotLeft(
  segments: LifecycleSegment[],
  domainStart: number,
  domainEnd: number,
): LifecycleSegment[] {
  if (segments.length === 0) return []
  const origin = segments[0]!.start
  const aligned: LifecycleSegment[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    const start = domainStart + (seg.start - origin)
    const end = domainStart + (seg.end - origin)
    if (start >= domainEnd) break
    aligned.push({
      event: seg.event,
      start: i === 0 ? domainStart : Math.max(start, domainStart),
      end: Math.min(Math.max(end, start + 1), domainEnd),
    })
  }

  if (aligned[0]) {
    aligned[0] = { ...aligned[0], start: domainStart }
  }
  return aligned.filter((s) => s.end > s.start)
}

/** SVG path for a rect with per-corner radii. */
function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: { tl: number; tr: number; br: number; bl: number },
): string {
  const width = Math.max(w, 0)
  const height = Math.max(h, 0)
  const r = {
    tl: Math.min(radii.tl, width / 2, height / 2),
    tr: Math.min(radii.tr, width / 2, height / 2),
    br: Math.min(radii.br, width / 2, height / 2),
    bl: Math.min(radii.bl, width / 2, height / 2),
  }
  return [
    `M ${x + r.tl} ${y}`,
    `H ${x + width - r.tr}`,
    r.tr > 0 ? `A ${r.tr} ${r.tr} 0 0 1 ${x + width} ${y + r.tr}` : `L ${x + width} ${y}`,
    `V ${y + height - r.br}`,
    r.br > 0 ? `A ${r.br} ${r.br} 0 0 1 ${x + width - r.br} ${y + height}` : `L ${x + width} ${y + height}`,
    `H ${x + r.bl}`,
    r.bl > 0 ? `A ${r.bl} ${r.bl} 0 0 1 ${x} ${y + height - r.bl}` : `L ${x} ${y + height}`,
    `V ${y + r.tl}`,
    r.tl > 0 ? `A ${r.tl} ${r.tl} 0 0 1 ${x + r.tl} ${y}` : `L ${x} ${y}`,
    'Z',
  ].join(' ')
}

function wrapProjectName(name: string, maxChars = 18): string[] {
  if (name.length <= maxChars) return [name]
  const parts = name.split(/\s+[–—-]\s+/)
  if (parts.length >= 2) {
    return [parts[0]!, parts.slice(1).join(' – ')].map((line) =>
      line.length > maxChars ? `${line.slice(0, maxChars - 1)}…` : line,
    )
  }
  const mid = Math.min(maxChars, name.lastIndexOf(' ', maxChars))
  if (mid > 8) {
    return [name.slice(0, mid), name.slice(mid + 1, mid + 1 + maxChars)]
  }
  return [`${name.slice(0, maxChars - 1)}…`]
}

/* ─────────────────── tooltip ─────────────────── */

interface TooltipState {
  event: LifecycleEvent
  x: number
  y: number
}

function LifecycleChartTooltip({ tip }: { tip: TooltipState }) {
  const { event, x, y } = tip
  const stageColor = EVENT_COLORS[event.eventType]
  return (
    <Box
      sx={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, calc(-100% - 12px))',
        zIndex: 9999,
        bgcolor: tokens.color.neutral[900],
        color: tokens.color.neutral[50],
        borderRadius: '8px',
        boxShadow: `0 8px 24px ${alpha(tokens.color.neutral[900], 0.35)}`,
        px: 1.75,
        py: 1.25,
        minWidth: 200,
        pointerEvents: 'none',
        '&::after': {
          content: '""',
          position: 'absolute',
          left: '50%',
          bottom: -6,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${tokens.color.neutral[900]}`,
        },
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 12, display: 'block', mb: 0.5 }}>
        <Box component="span" sx={{ color: tokens.color.neutral[400] }}>
          Project:{' '}
        </Box>
        <Box component="span" sx={{ fontWeight: 600, color: tokens.color.neutral[50] }}>
          {event.projectName}
        </Box>
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 12, display: 'block', mb: 0.25 }}>
        <Box component="span" sx={{ color: tokens.color.neutral[400] }}>
          Stage:{' '}
        </Box>
        <Box component="span" sx={{ fontWeight: 700, color: stageColor }}>
          {event.eventType}
        </Box>
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 12, display: 'block', mb: 0.25 }}>
        <Box component="span" sx={{ color: tokens.color.neutral[400] }}>
          Date:{' '}
        </Box>
        <Box component="span" sx={{ fontWeight: 600, color: tokens.color.neutral[50] }}>
          {event.dateLabel}
        </Box>
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 12, display: 'block' }}>
        <Box component="span" sx={{ color: tokens.color.neutral[400] }}>
          Project Size:{' '}
        </Box>
        <Box component="span" sx={{ fontWeight: 600, color: tokens.color.neutral[50] }}>
          {event.sqft > 0 ? `${formatSqft(event.sqft)} sq.ft.` : '—'}
        </Box>
      </Typography>
    </Box>
  )
}

/* ─────────────────── custom SVG chart ─────────────────── */

interface LifecycleChartProps {
  lines: LifecycleProjectLine[]
  domainStart: number
  domainEnd: number
  ticks: { ts: number; label: string }[]
  onHover: (tip: TooltipState | null) => void
}

function LifecycleChart({
  lines,
  domainStart,
  domainEnd,
  ticks,
  onHover,
}: LifecycleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(700)
  const now = useMemo(() => Date.now(), [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(el)
    setWidth(el.clientWidth || 700)
    return () => ro.disconnect()
  }, [])

  const svgWidth = width
  const plotWidth = Math.max(svgWidth - SVG_LEFT_MARGIN - SVG_RIGHT_MARGIN, 1)
  /** Cap at configured max; no internal scrollbar — extra projects are not rendered. */
  const visibleLines = lines.slice(0, VISIBLE_ROWS)
  const plotHeight = visibleLines.length * ROW_HEIGHT
  const timeRange = domainEnd - domainStart || 1

  const dateToX = useCallback(
    (ts: number) => SVG_LEFT_MARGIN + ((ts - domainStart) / timeRange) * plotWidth,
    [domainStart, timeRange, plotWidth],
  )

  const handleMouseMove = useCallback(
    (ev: ReactMouseEvent<SVGElement>, event: LifecycleEvent) => {
      onHover({ event, x: ev.clientX, y: ev.clientY })
    },
    [onHover],
  )
  const handleMouseLeave = useCallback(() => onHover(null), [onHover])

  return (
    <Box ref={containerRef} sx={{ width: '100%', overflow: 'hidden' }}>
      <svg
        width="100%"
        height={plotHeight + SVG_TOP_MARGIN}
        style={{ display: 'block' }}
      >
        {ticks.map((tick) => {
          const x = dateToX(tick.ts)
          if (x < SVG_LEFT_MARGIN - 1 || x > svgWidth - SVG_RIGHT_MARGIN + 1) return null
          return (
            <line
              key={`grid-${tick.ts}`}
              x1={x}
              y1={SVG_TOP_MARGIN}
              x2={x}
              y2={SVG_TOP_MARGIN + plotHeight}
              stroke={tokens.color.neutral[200]}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          )
        })}

        {visibleLines.map((line, rowIdx) => {
          const rowTop = SVG_TOP_MARGIN + rowIdx * ROW_HEIGHT
          const barY = rowTop + (ROW_HEIGHT - BAR_HEIGHT) / 2
          const nameLines = wrapProjectName(line.projectName)
          const nameBlockHeight = nameLines.length * 14
          const nameStartY = rowTop + (ROW_HEIGHT - nameBlockHeight) / 2 + 11
          const segments = alignSegmentsToPlotLeft(
            buildLifecycleSegments(line.events, now),
            domainStart,
            domainEnd,
          )

          return (
            <g key={line.projectId}>
              {nameLines.map((textLine, i) => (
                <text
                  key={`${line.projectId}-name-${i}`}
                  x={SVG_LEFT_MARGIN - NAME_GAP_PX}
                  y={nameStartY + i * 14}
                  textAnchor="end"
                  fontSize={11}
                  fill={tokens.color.neutral[700]}
                  style={{ userSelect: 'none' }}
                >
                  {textLine}
                </text>
              ))}

              {segments.map((seg, segIdx) => {
                const isFirst = segIdx === 0
                const isLast = segIdx === segments.length - 1
                // First segment is locked to the plot left edge — never indented.
                let x = isFirst ? SVG_LEFT_MARGIN : dateToX(seg.start)
                let w = dateToX(seg.end) - (isFirst ? SVG_LEFT_MARGIN : dateToX(seg.start))
                if (w < MIN_SEGMENT_PX) {
                  w = MIN_SEGMENT_PX
                  if (!isFirst && x + w > svgWidth - SVG_RIGHT_MARGIN) {
                    x = svgWidth - SVG_RIGHT_MARGIN - w
                  }
                }
                // Keep first segment flush left even after min-width bump
                if (isFirst) x = SVG_LEFT_MARGIN
                const path = roundedRectPath(x, barY, w, BAR_HEIGHT, {
                  tl: isFirst ? BAR_RADIUS : 0,
                  bl: isFirst ? BAR_RADIUS : 0,
                  tr: isLast ? BAR_RADIUS : 0,
                  br: isLast ? BAR_RADIUS : 0,
                })
                return (
                  <path
                    key={seg.event.id}
                    d={path}
                    fill={EVENT_COLORS[seg.event.eventType]}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={(e) => handleMouseMove(e, seg.event)}
                    onMouseLeave={handleMouseLeave}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>

      {/* Fixed X-axis */}
      <svg
        width="100%"
        height={SVG_BOTTOM_MARGIN}
        style={{ display: 'block' }}
      >
        <line
          x1={SVG_LEFT_MARGIN}
          y1={0}
          x2={svgWidth - SVG_RIGHT_MARGIN}
          y2={0}
          stroke={tokens.color.neutral[200]}
          strokeWidth={1}
        />
        {ticks.map((tick) => {
          const x = dateToX(tick.ts)
          if (x < SVG_LEFT_MARGIN - 1 || x > svgWidth - SVG_RIGHT_MARGIN + 1) return null
          return (
            <text
              key={`label-${tick.ts}`}
              x={x}
              y={18}
              textAnchor="middle"
              fontSize={11}
              fill={tokens.color.neutral[500]}
            >
              {tick.label}
            </text>
          )
        })}
        <text
          x={SVG_LEFT_MARGIN + plotWidth / 2}
          y={38}
          textAnchor="middle"
          fontSize={11}
          fill={tokens.color.neutral[500]}
        >
          Financial Year Months
        </text>
      </svg>
    </Box>
  )
}

/* ─────────────────── section component ─────────────────── */

export interface ProjectAnalyticsSectionProps {
  dateRange?: string
  clientFilter?: string
  statusFilter?: string
  pmFilter?: string
}

export function ProjectAnalyticsSection({
  clientFilter = 'All Clients',
  statusFilter = 'All Status',
  pmFilter = 'All Managers',
}: ProjectAnalyticsSectionProps) {
  const dispatch = useAppDispatch()
  const projects = useAppSelector((s) => s.projects.items ?? [])

  const [projectId, setProjectId] = useState(ALL_PROJECTS_VALUE)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
  }, [dispatch])

  // Lifecycle chart ignores date-range filter so spans remain visible.
  const lifecycleProjects = useMemo(
    () =>
      filterProjectsForDashboard(projects, {
        dateRange: 'All Time',
        clientFilter,
        statusFilter,
        pmFilter,
      }),
    [projects, clientFilter, statusFilter, pmFilter],
  )

  const lifecycleData = useMemo(
    () => buildProjectLifecycleData(lifecycleProjects),
    [lifecycleProjects],
  )

  const projectOptions = useMemo(() => {
    const ids = new Set(lifecycleData.events.map((e) => e.projectId))
    return lifecycleProjects
      .filter((p) => ids.has(p.id))
      .map((p) => ({ value: p.id, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lifecycleProjects, lifecycleData])

  const selectedProjectOption = useMemo(
    () => projectOptions.find((o) => o.value === projectId) ?? ALL_PROJECTS_OPTION,
    [projectOptions, projectId],
  )

  useEffect(() => {
    if (!projectOptions.some((o) => o.value === projectId)) {
      setProjectId(ALL_PROJECTS_VALUE)
    }
  }, [projectOptions, projectId])

  const handleProjectChange = (
    _event: SyntheticEvent,
    value: typeof ALL_PROJECTS_OPTION | null,
  ) => {
    if (value == null) return
    setProjectId(value.value)
  }

  const { lines } = useMemo(() => {
    if (projectId === ALL_PROJECTS_VALUE) return lifecycleData
    return {
      lines: lifecycleData.lines.filter((l) => l.projectId === projectId),
      events: lifecycleData.events.filter((e) => e.projectId === projectId),
    }
  }, [lifecycleData, projectId])

  const visibleEvents = useMemo(() => {
    if (projectId === ALL_PROJECTS_VALUE) return lifecycleData.events
    return lifecycleData.events.filter((e) => e.projectId === projectId)
  }, [lifecycleData, projectId])

  const fyAxis = useMemo(() => {
    const refTs = visibleEvents.length
      ? Math.max(...visibleEvents.map((e) => e.date))
      : Date.now()
    return buildFyAxis(refTs)
  }, [visibleEvents])

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
        {/* ── Project Lifecycle & Size ── */}
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Project Lifecycle & Size"
            subtitle="Project lifecycle distribution by project (Pitch → Live → Completed/Cancelled/Archived)."
            action={
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'stretch', md: 'flex-start' },
                  gap: { xs: 1.5, md: 3 },
                }}
              >
                <Box sx={{ pt: { md: 0.5 } }}>
                  <ChartSeriesLegend items={[...LEGEND_ITEMS]} />
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 220 } }}>
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
                    options={[ALL_PROJECTS_OPTION, ...projectOptions]}
                    value={selectedProjectOption}
                    onChange={handleProjectChange}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    filterOptions={(options, state) => {
                      const q = state.inputValue.trim().toLowerCase()
                      if (!q) return options
                      return options.filter((o) => o.label.toLowerCase().includes(q))
                    }}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Search projects..." />
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
              </Box>
            }
          >
            {lines.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
              >
                No projects with lifecycle events for the selected filters.
              </Typography>
            ) : (
              <LifecycleChart
                lines={lines}
                domainStart={fyAxis.domainStart}
                domainEnd={fyAxis.domainEnd}
                ticks={fyAxis.ticks}
                onHover={setTooltip}
              />
            )}
            {tooltip && <LifecycleChartTooltip tip={tooltip} />}
          </ChartCard>
        </Grid>

        {/* ── Projects Completed by Year ── */}
        <Grid size={{ xs: 12 }}>
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

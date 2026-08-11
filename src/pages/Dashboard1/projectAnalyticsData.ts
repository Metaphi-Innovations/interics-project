/**
 * Project Analytics chart data — derived from real projects where noted.
 */

import type { Project } from '@/slices/projects/reducer'

export const REPEAT_CLIENTS_KPI = {
  total: 9,
  percentage: 37.5,
  trend: [4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 9, 9],
}

export const PROJECTS_COMPLETED_BY_YEAR = [
  { year: '2022', completed: 6 },
  { year: '2023', completed: 9 },
  { year: '2024', completed: 11 },
  { year: '2025', completed: 14 },
  { year: '2026', completed: 8 },
]

export const PITCH_TO_LIVE_CONVERSION = {
  avgDays: 42,
  subtitle: 'Average days from pitch start to live.',
}

export interface MonthlyPitchesVsLivePoint {
  month: string
  pitches: number
  live: number
}

export interface LiveDurationProjectDetail {
  name: string
  durationDays: number
}

export interface LiveDurationByMonthPoint {
  month: string
  /** Live/Active projects already started by this month. */
  liveProjects: number
  /**
   * Average running duration (days) for those projects, measured as of the
   * month end (or today for the current month). Null if none.
   */
  avgDurationDays: number | null
  projects: LiveDurationProjectDetail[]
}

export interface LiveProjectDurationPoint {
  project: string
  projectId: string
  durationDays: number
  startMonth: string
}

export interface LiveProjectSizePoint {
  project: string
  projectId: string
  sqft: number
}

interface MonthBucket {
  key: string
  label: string
  year: number
  month: number
}

function startOfDay(d: Date): Date {
  const next = new Date(d)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(d: Date): Date {
  const next = new Date(d)
  next.setHours(23, 59, 59, 999)
  return next
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function projectAnchorDate(project: Project): Date | null {
  return parseDate(project.startDate) ?? parseDate(project.createdAt)
}

function getDateRangeBounds(dateRange: string, now = new Date()): { start: Date | null; end: Date } {
  const end = endOfDay(now)
  if (dateRange === 'All Time') return { start: null, end }

  const start = startOfDay(new Date(now))
  if (dateRange === 'This Month') {
    start.setDate(1)
    return { start, end }
  }
  if (dateRange === 'This Quarter') {
    const q = Math.floor(now.getMonth() / 3)
    start.setMonth(q * 3, 1)
    return { start, end }
  }
  // This Year (default) and unknown presets
  start.setMonth(0, 1)
  return { start, end }
}

export function filterProjectsForDashboard(
  projects: Project[],
  filters: {
    dateRange?: string
    clientFilter?: string
    statusFilter?: string
    pmFilter?: string
  },
): Project[] {
  const dateRange = filters.dateRange ?? 'This Year'
  const { start, end } = getDateRangeBounds(dateRange)

  return projects.filter((project) => {
    if (filters.statusFilter && filters.statusFilter !== 'All Status') {
      const wanted =
        filters.statusFilter === 'On Hold' ? 'Archived' : filters.statusFilter
      if (project.status !== wanted) return false
    }

    if (filters.clientFilter && filters.clientFilter !== 'All Clients') {
      const client = filters.clientFilter.trim().toLowerCase()
      if ((project.customerName ?? '').trim().toLowerCase() !== client) return false
    }

    if (filters.pmFilter && filters.pmFilter !== 'All Managers') {
      const pm = filters.pmFilter.trim().toLowerCase()
      if ((project.projectManager ?? '').trim().toLowerCase() !== pm) return false
    }

    if (start) {
      const anchor = projectAnchorDate(project)
      if (!anchor) return false
      if (anchor < start || anchor > end) return false
    }

    return true
  })
}

/**
 * Live/active analytics scope: apply dashboard filters, but keep currently Live
 * projects that already started by the end of the selected period (do not require
 * the start date to fall inside the period — long-running Live projects still count).
 */
export function filterProjectsForLiveAnalytics(
  projects: Project[],
  filters: {
    dateRange?: string
    clientFilter?: string
    statusFilter?: string
    pmFilter?: string
  },
): Project[] {
  const dateRange = filters.dateRange ?? 'This Year'
  const { end } = getDateRangeBounds(dateRange)

  return projects.filter((project) => {
    if (filters.statusFilter && filters.statusFilter !== 'All Status') {
      const wanted =
        filters.statusFilter === 'On Hold' ? 'Archived' : filters.statusFilter
      if (project.status !== wanted) return false
    } else if (project.status !== 'Live') {
      return false
    }

    if (filters.clientFilter && filters.clientFilter !== 'All Clients') {
      const client = filters.clientFilter.trim().toLowerCase()
      if ((project.customerName ?? '').trim().toLowerCase() !== client) return false
    }

    if (filters.pmFilter && filters.pmFilter !== 'All Managers') {
      const pm = filters.pmFilter.trim().toLowerCase()
      if ((project.projectManager ?? '').trim().toLowerCase() !== pm) return false
    }

    const start = parseDate(project.startDate)
    if (!start) return false
    if (startOfDay(start) > end) return false

    return true
  })
}

function buildMonthBuckets(count: number, now = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return buckets
}

function monthBucketCount(dateRange: string): number {
  if (dateRange === 'This Month') return 1
  if (dateRange === 'This Quarter') return 3
  if (dateRange === 'All Time') return 12
  if (dateRange === 'Last 12 Months') return 12
  return 12
}

/** Running duration for a Live project: days from start to today. */
export function liveProjectRunningDays(project: Project, now = new Date()): number | null {
  const start = parseDate(project.startDate)
  if (!start) return null
  const diff = Math.round((endOfDay(now).getTime() - startOfDay(start).getTime()) / 86_400_000)
  return diff >= 0 ? diff : null
}

function projectSqft(project: Project): number | null {
  const area = project.carpetArea ?? project.chargeableArea ?? null
  if (area == null || area <= 0) return null
  return area
}

/**
 * Month-wise Pitch vs Live counts (by project start / created date).
 */
export function buildMonthlyPitchesVsLive(
  projects: Project[],
  dateRange = 'This Year',
): MonthlyPitchesVsLivePoint[] {
  const buckets = buildMonthBuckets(monthBucketCount(dateRange))
  return buckets.map((b) => {
    let pitches = 0
    let live = 0
    for (const project of projects) {
      const anchor = projectAnchorDate(project)
      if (!anchor) continue
      if (anchor.getFullYear() !== b.year || anchor.getMonth() !== b.month) continue
      if (project.status === 'Pitch') pitches += 1
      if (project.status === 'Live') live += 1
    }
    return { month: b.label, pitches, live }
  })
}

/**
 * Live / Active projects only — running duration (days) per project since start.
 */
export function buildLiveProjectDurations(
  projects: Project[],
  now = new Date(),
): {
  series: LiveProjectDurationPoint[]
  averageDurationDays: number | null
  liveCount: number
} {
  const live = projects.filter((p) => p.status === 'Live')
  const series = live
    .map((project) => {
      const days = liveProjectRunningDays(project, now)
      if (days == null) return null
      const anchor = projectAnchorDate(project)
      const startMonth = anchor
        ? anchor.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
        : '—'
      return {
        project: project.name,
        projectId: project.id,
        durationDays: days,
        startMonth,
      }
    })
    .filter((row): row is LiveProjectDurationPoint => row != null)
    .sort((a, b) => b.durationDays - a.durationDays || a.project.localeCompare(b.project))

  const averageDurationDays =
    series.length > 0
      ? Math.round(series.reduce((s, r) => s + r.durationDays, 0) / series.length)
      : null

  return {
    series,
    averageDurationDays,
    liveCount: live.length,
  }
}

/**
 * Live projects only — month-wise Live Project count + average running duration.
 *
 * For each month in the selected period:
 * - Live Projects = Live/Active projects that had already started by that month’s end
 * - Avg Running Duration = average of (month reference date − project start date)
 */
export function buildLiveDurationByMonth(
  projects: Project[],
  dateRange = 'This Year',
  now = new Date(),
): {
  series: LiveDurationByMonthPoint[]
  averageDurationDays: number | null
  liveCount: number
} {
  const live = projects.filter((p) => p.status === 'Live')
  const perProject = buildLiveProjectDurations(live, now)
  const buckets = buildMonthBuckets(monthBucketCount(dateRange), now)

  const series = buckets.map((b) => {
    const monthEnd = endOfDay(new Date(b.year, b.month + 1, 0))
    const asOf =
      monthEnd.getTime() > endOfDay(now).getTime() ? endOfDay(now) : monthEnd

    const details: LiveDurationProjectDetail[] = []
    for (const project of live) {
      const start = parseDate(project.startDate)
      if (!start) continue
      if (startOfDay(start) > asOf) continue

      const days = Math.round(
        (asOf.getTime() - startOfDay(start).getTime()) / 86_400_000,
      )
      if (days < 0) continue

      details.push({
        name: project.name,
        durationDays: days,
      })
    }

    details.sort(
      (a, b) => b.durationDays - a.durationDays || a.name.localeCompare(b.name),
    )

    return {
      month: b.label,
      liveProjects: details.length,
      avgDurationDays:
        details.length > 0
          ? Math.round(details.reduce((s, p) => s + p.durationDays, 0) / details.length)
          : null,
      projects: details,
    }
  })

  return {
    series,
    averageDurationDays: perProject.averageDurationDays,
    liveCount: live.length,
  }
}

export const LIVE_DURATION_DATE_RANGE_OPTIONS = ['Last 12 Months'] as const
export type LiveDurationDateRange = (typeof LIVE_DURATION_DATE_RANGE_OPTIONS)[number]

export const ALL_LIVE_PROJECTS_VALUE = 'all'

export interface LiveProjectSelectOption {
  value: string
  label: string
}

export function buildLiveProjectSelectOptions(
  projects: Project[],
): LiveProjectSelectOption[] {
  const live = projects
    .filter((p) => p.status === 'Live')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  return [
    { value: ALL_LIVE_PROJECTS_VALUE, label: 'All Live Projects' },
    ...live.map((p) => ({ value: p.id, label: p.name })),
  ]
}

export interface LiveProjectTimelinePoint {
  month: string
  monthKey: string
  durationDays: number
  marker: 'start' | 'today' | 'end' | null
}

export interface LiveProjectTimelineMeta {
  projectId: string
  name: string
  status: string
  startLabel: string
  todayLabel: string
  endLabel: string
  endIsOngoing: boolean
  runningDays: number
}

export interface LiveProjectTimelineBundle {
  series: LiveProjectTimelinePoint[]
  meta: LiveProjectTimelineMeta | null
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Single Live project running-duration timeline from Start → Today (or End Date).
 */
export function buildLiveProjectDurationTimeline(
  project: Project | null | undefined,
  now = new Date(),
): LiveProjectTimelineBundle {
  if (!project || project.status !== 'Live') {
    return { series: [], meta: null }
  }

  const start = parseDate(project.startDate)
  if (!start) {
    return {
      series: [],
      meta: {
        projectId: project.id,
        name: project.name,
        status: project.status,
        startLabel: '—',
        todayLabel: formatDisplayDate(now),
        endLabel: 'Ongoing',
        endIsOngoing: true,
        runningDays: 0,
      },
    }
  }

  const startDay = startOfDay(start)
  const endDate = parseDate(project.expectedEndDate)
  const endIsOngoing = endDate == null
  const endRef = endIsOngoing
    ? endOfDay(now)
    : endOfDay(endDate.getTime() > now.getTime() ? now : endDate)

  const runningDays = Math.max(
    0,
    Math.round((endRef.getTime() - startDay.getTime()) / 86_400_000),
  )

  const series: LiveProjectTimelinePoint[] = []

  // Explicit START point at day 0
  series.push({
    month: startDay.toLocaleString('en-IN', { month: 'short' }),
    monthKey: `${startDay.getFullYear()}-${String(startDay.getMonth() + 1).padStart(2, '0')}-start`,
    durationDays: 0,
    marker: 'start',
  })

  let year = startDay.getFullYear()
  let month = startDay.getMonth()
  const endYear = endRef.getFullYear()
  const endMonth = endRef.getMonth()

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const monthEnd = endOfDay(new Date(year, month + 1, 0))
    const asOf = monthEnd.getTime() > endRef.getTime() ? endRef : monthEnd
    const days = Math.max(
      0,
      Math.round((asOf.getTime() - startDay.getTime()) / 86_400_000),
    )
    const isLast = year === endYear && month === endMonth

    series.push({
      month: new Date(year, month, 1).toLocaleString('en-IN', { month: 'short' }),
      monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
      durationDays: isLast ? runningDays : days,
      marker: isLast ? (endIsOngoing ? 'today' : 'end') : null,
    })

    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  return {
    series,
    meta: {
      projectId: project.id,
      name: project.name,
      status: project.status,
      startLabel: formatDisplayDate(startDay),
      todayLabel: formatDisplayDate(now),
      endLabel: endIsOngoing ? 'Ongoing' : formatDisplayDate(endDate!),
      endIsOngoing,
      runningDays,
    },
  }
}

/**
 * Live projects only — size (sqft) per project + average.
 */
export function buildLiveProjectSizes(projects: Project[]): {
  series: LiveProjectSizePoint[]
  averageSqft: number | null
  liveCount: number
  totalSqft: number
} {
  const live = projects.filter((p) => p.status === 'Live')
  const withSize = live
    .map((p) => {
      const sqft = projectSqft(p)
      if (sqft == null) return null
      return {
        project: p.name,
        projectId: p.id,
        sqft: Math.round(sqft),
      }
    })
    .filter((row): row is LiveProjectSizePoint => row != null)
    .sort((a, b) => b.sqft - a.sqft)

  const totalSqft = withSize.reduce((s, r) => s + r.sqft, 0)

  return {
    series: withSize,
    averageSqft: withSize.length > 0 ? Math.round(totalSqft / withSize.length) : null,
    liveCount: live.length,
    totalSqft,
  }
}

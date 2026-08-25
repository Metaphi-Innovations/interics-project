/**
 * Sample data for Dashboard — Projects Overview module.
 */
import { CHART_COLORS } from '@/design-system/tokens'
import type { DonutSlice } from '@/design-system/components'
import type { Project } from '@/slices/projects/reducer'

export interface ProjectOverviewKpi {
  id: string
  title: string
  value: string
  subtitle: string
  percentage?: number
  icon:
    | 'active'
    | 'completed'
    | 'pipeline'
    | 'cancelled'
    | 'archived'
    | 'repeat'
    | 'size'
    | 'conversion'
}

export const PROJECT_OVERVIEW_KPIS: ProjectOverviewKpi[] = [
  {
    id: 'active',
    title: 'Active Projects',
    value: '18',
    subtitle: 'Projects currently in execution.',
    icon: 'active',
  },
  {
    id: 'completed',
    title: 'Completed Projects',
    value: '14',
    subtitle: 'Successfully handed over.',
    icon: 'completed',
  },
  {
    id: 'pipeline',
    title: 'Pipeline Projects',
    value: '12',
    subtitle: 'In pitch or proposal stage.',
    icon: 'pipeline',
  },
  {
    id: 'cancelled',
    title: 'Cancelled Projects',
    value: '2',
    subtitle: 'Closed without delivery.',
    icon: 'cancelled',
  },
  {
    id: 'archived',
    title: 'Archived Projects',
    value: '3',
    subtitle: 'Archived after completion.',
    icon: 'archived',
  },
  {
    id: 'repeat',
    title: 'Repeat Clients',
    value: '9',
    subtitle: 'Clients with more than one project.',
    percentage: 37.5,
    icon: 'repeat',
  },
  {
    id: 'size',
    title: 'Average Project Size',
    value: '4,850 sqft',
    subtitle: 'Mean carpet area across projects.',
    icon: 'size',
  },
  {
    id: 'conversion',
    title: 'Average Pitch to Live Conversion Time',
    value: '42 days',
    subtitle: 'Avg. time from pitch to live.',
    icon: 'conversion',
  },
]

const KPI_STATUS_MAP: Record<string, Project['status']> = {
  active: 'Live',
  completed: 'Completed',
  pipeline: 'Pitch',
  cancelled: 'Cancelled',
  archived: 'Archived',
}

/** Status KPI counts from the Projects module listing (same source as ProjectsPage tabs). */
export function buildProjectOverviewKpis(projects: Project[]): ProjectOverviewKpi[] {
  return PROJECT_OVERVIEW_KPIS.map((kpi) => {
    const status = KPI_STATUS_MAP[kpi.id]
    if (!status) return kpi
    const count = projects.filter((project) => project.status === status).length
    return { ...kpi, value: String(count) }
  })
}

export const PROJECT_STATUS_DISTRIBUTION: DonutSlice[] = [
  { key: 'pipeline', label: 'Pipeline', value: 12, color: CHART_COLORS.blue },
  { key: 'active', label: 'Active', value: 18, color: CHART_COLORS.teal },
  { key: 'completed', label: 'Completed', value: 14, color: CHART_COLORS.green },
  { key: 'cancelled', label: 'Cancelled', value: 2, color: CHART_COLORS.red },
  { key: 'archived', label: 'Archived', value: 3, color: CHART_COLORS.grey },
]

/** Sector tag summary — project counts by Sector Master value. */
export interface SectorTag {
  id: string
  name: string
  count: number
  color: string
}

const SECTOR_TAG_COLORS = [
  CHART_COLORS.teal,
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.purple,
  CHART_COLORS.red,
  CHART_COLORS.grey,
] as const

export interface SectorMasterLike {
  id: string
  name: string
  status: 'active' | 'inactive' | string
}

/**
 * Builds Sector Tag chips from Settings → Sector Master.
 * Counts projects whose `sector` matches each active master sector name.
 */
export function buildSectorTagsFromMaster(
  sectors: SectorMasterLike[],
  projects: Array<{ sector?: string | null }>,
): SectorTag[] {
  const counts = new Map<string, number>()
  for (const project of projects) {
    const key = (project.sector ?? '').trim().toLowerCase()
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return sectors
    .filter((s) => s.status === 'active' && s.name.trim())
    .map((s, index) => {
      const name = s.name.trim()
      return {
        id: s.id,
        name,
        count: counts.get(name.toLowerCase()) ?? 0,
        color: SECTOR_TAG_COLORS[index % SECTOR_TAG_COLORS.length],
      }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Pitch start timeline retained for the legacy dashboard timeline component. */
export interface PitchStartTimelinePoint {
  month: string
  projectCount: number
  projectName: string
  pitchStartDate: string
}

export const PITCH_START_MARKER_MONTH = 'Jun'

export const PITCH_START_TIMELINE: PitchStartTimelinePoint[] = [
  {
    month: 'Jan',
    projectCount: 3,
    projectName: 'Northgate Offices',
    pitchStartDate: '12 Jan 2026',
  },
  {
    month: 'Feb',
    projectCount: 4,
    projectName: 'Cedar Retail Hub',
    pitchStartDate: '04 Feb 2026',
  },
  {
    month: 'Mar',
    projectCount: 5,
    projectName: 'Pulse Clinic Fit-out',
    pitchStartDate: '18 Mar 2026',
  },
  {
    month: 'Apr',
    projectCount: 4,
    projectName: 'Harbor Residence',
    pitchStartDate: '09 Apr 2026',
  },
  {
    month: 'May',
    projectCount: 6,
    projectName: 'Summit Education Wing',
    pitchStartDate: '21 May 2026',
  },
  {
    month: 'Jun',
    projectCount: 7,
    projectName: 'Horizon Corporate Campus',
    pitchStartDate: '03 Jun 2026',
  },
  {
    month: 'Jul',
    projectCount: 5,
    projectName: 'Lumen Hospitality Suite',
    pitchStartDate: '14 Jul 2026',
  },
  {
    month: 'Aug',
    projectCount: 6,
    projectName: 'AeroTech Workspace',
    pitchStartDate: '02 Aug 2026',
  },
]

/**
 * Sample data for Dashboard 1 — Projects Overview module.
 */
import { CHART_COLORS } from '@/design-system/tokens'
import type { DonutSlice, FunnelSlice } from '@/design-system/components'

export interface ProjectOverviewKpi {
  id: string
  title: string
  value: string
  subtitle: string
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

export const PROJECT_STATUS_DISTRIBUTION: DonutSlice[] = [
  { key: 'pipeline', label: 'Pipeline', value: 12, color: CHART_COLORS.blue },
  { key: 'active', label: 'Active', value: 18, color: CHART_COLORS.teal },
  { key: 'completed', label: 'Completed', value: 14, color: CHART_COLORS.green },
  { key: 'cancelled', label: 'Cancelled', value: 2, color: CHART_COLORS.red },
  { key: 'archived', label: 'Archived', value: 3, color: CHART_COLORS.grey },
]

export const PITCH_CONVERSION_FUNNEL: FunnelSlice[] = [
  { key: 'pitch', label: 'Pitch', value: 48, color: CHART_COLORS.blue },
  { key: 'proposal', label: 'Proposal', value: 36, color: CHART_COLORS.purple },
  { key: 'po', label: 'PO Received', value: 28, color: CHART_COLORS.amber },
  { key: 'live', label: 'Live', value: 22, color: CHART_COLORS.teal },
  { key: 'completed', label: 'Completed', value: 14, color: CHART_COLORS.green },
]

/** Sector tag summary — project counts by business sector (sample data). */
export interface SectorTag {
  id: string
  name: string
  count: number
  color: string
}

export const SECTOR_TAG_BASE: SectorTag[] = [
  { id: 'corporate', name: 'Corporate', count: 18, color: CHART_COLORS.teal },
  { id: 'retail', name: 'Retail', count: 7, color: CHART_COLORS.blue },
  { id: 'healthcare', name: 'Healthcare', count: 5, color: CHART_COLORS.green },
  { id: 'hospitality', name: 'Hospitality', count: 4, color: CHART_COLORS.amber },
  { id: 'residential', name: 'Residential', count: 3, color: CHART_COLORS.purple },
  { id: 'education', name: 'Education', count: 2, color: CHART_COLORS.red },
]

export interface SectorTagFilters {
  dateRange: string
  client: string
  status: string
  projectLead: string
}

/** Returns filter-adjusted sector tag counts (dummy scaling only). */
export function getSectorTagsForFilters(filters: SectorTagFilters): SectorTag[] {
  let factor = 1

  if (filters.dateRange === 'This Month') factor = 0.35
  else if (filters.dateRange === 'This Quarter') factor = 0.55
  else if (filters.dateRange === 'All Time') factor = 1.1

  if (filters.status !== 'All Status') factor *= 0.5
  if (filters.client !== 'All Clients') factor *= 0.3
  if (filters.projectLead !== 'All Managers') factor *= 0.4

  return SECTOR_TAG_BASE.map((tag) => ({
    ...tag,
    count: Math.max(1, Math.round(tag.count * factor)),
  }))
}

/** Pitch start timeline — monthly project count with pitch metadata (sample). */
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

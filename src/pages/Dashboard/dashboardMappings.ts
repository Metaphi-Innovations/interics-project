import type { Project } from '@/slices/projects/reducer'
import type { StatusFilter } from './types'
import { getProjectTypes } from '@/pages/Projects/projectTypes'

export type ClientProjectType =
  | 'Interior Design'
  | 'Design Build'
  | 'Consultancy'
  | 'Due Diligence'
  | 'Engineering Services'

export const CLIENT_PROJECT_TYPES: ClientProjectType[] = [
  'Interior Design',
  'Design Build',
  'Consultancy',
  'Due Diligence',
  'Engineering Services',
]

export function displayProjectStatus(status: Project['status']): string {
  if (status === 'Archived') return 'On Hold'
  return status
}

export function matchesStatusFilter(project: Project, filter: StatusFilter): boolean {
  if (filter === 'All Status') return true
  if (filter === 'On Hold') return project.status === 'Archived'
  return project.status === filter
}

export function mapToClientProjectType(project: Project): ClientProjectType {
  const types = getProjectTypes(project)
  if (types.includes('Build')) return 'Design Build'
  if (types.some((t) => t === 'TDD' || t === 'Local Approvals')) return 'Due Diligence'
  if (types.includes('ID')) return 'Interior Design'
  if (
    types.some((t) =>
      ['MEP', 'Lighting', 'Structural', 'AV', 'IT', 'Security', 'Acoustic', 'Kitchen'].includes(t),
    )
  ) {
    return 'Engineering Services'
  }
  if (types.some((t) => t === 'LEED' || t === 'Branding & Styling' || t === 'Other')) {
    return 'Consultancy'
  }
  return 'Consultancy'
}

export function mapIndustrySector(sector: string | undefined | null): string {
  if (!sector || !sector.trim()) return 'Others'
  const s = sector.trim()
  const allowed = ['Commercial', 'Residential', 'Retail', 'Hospitality', 'Industrial']
  if (allowed.includes(s)) return s
  return 'Others'
}

export function projectHasBuild(project: Project): boolean {
  return getProjectTypes(project).includes('Build')
}

export function contractedDesignFee(project: Project): number {
  const area = project.carpetArea ?? 0
  const rate = project.designFeePerSqft ?? 0
  if (area <= 0 || rate <= 0) return 0
  return area * rate
}

export function projectDurationDays(project: Project): number | null {
  if (!project.startDate) return null
  const start = new Date(project.startDate)
  const endIso =
    project.status === 'Completed' && project.expectedEndDate
      ? project.expectedEndDate
      : project.expectedEndDate
  if (!endIso) return null
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

export type BuildCostCategory =
  | 'Civil & Interior'
  | 'Electrical'
  | 'HVAC'
  | 'Plumbing'
  | 'Fire Fighting'
  | 'Others'

export function classifyVendorServiceCost(name: string): BuildCostCategory {
  const n = name.toLowerCase()
  if (n.includes('civil') || n.includes('interior') || n.includes('construction')) {
    return 'Civil & Interior'
  }
  if (n.includes('electrical') || n.includes('electric')) return 'Electrical'
  if (n.includes('hvac') || n.includes('air')) return 'HVAC'
  if (n.includes('plumb')) return 'Plumbing'
  if (n.includes('fire')) return 'Fire Fighting'
  return 'Others'
}

import type { ClientProjectType } from './dashboardMappings'
import type { DashboardFilters, DateRange, StatusFilter } from './types'

export type ProjectTypeFilter = ClientProjectType | 'All Types'

export interface ChartFilters extends DashboardFilters {
  projectType: ProjectTypeFilter
}

export function chartFiltersFromGlobal(global: DashboardFilters): ChartFilters {
  return { ...global, projectType: 'All Types' }
}

export const DATE_RANGE_OPTIONS: DateRange[] = [
  'This Month',
  'This Quarter',
  'This Year',
  'All Time',
]

export const STATUS_FILTER_OPTIONS: StatusFilter[] = [
  'All Status',
  'Pitch',
  'Live',
  'Completed',
  'On Hold',
  'Cancelled',
]

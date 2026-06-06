import type { FilterField } from '@/components/templates/ListingTemplate'
import { CLIENT_PROJECT_TYPES } from './dashboardMappings'
import {
  DATE_RANGE_OPTIONS,
  STATUS_FILTER_OPTIONS,
  chartFiltersFromGlobal,
  type ChartFilters,
} from './chartFilterTypes'
export interface ChartFilterOptions {
  clients: string[]
  projectManagers: string[]
}
import type { DashboardFilters, DateRange, StatusFilter } from './types'
import type { ProjectTypeFilter } from './chartFilterTypes'

export function chartFiltersToRecord(filters: ChartFilters): Record<string, unknown> {
  return {
    dateRange: filters.dateRange,
    clientFilter: filters.clientFilter,
    projectType: filters.projectType,
    pmFilter: filters.pmFilter,
    statusFilter: filters.statusFilter,
  }
}

export function recordToChartFilters(
  record: Record<string, unknown>,
  globalFilters: DashboardFilters,
): ChartFilters {
  const base = chartFiltersFromGlobal(globalFilters)
  return {
    dateRange: (record.dateRange as DateRange) || base.dateRange,
    clientFilter: (record.clientFilter as string) || base.clientFilter,
    projectType: (record.projectType as ProjectTypeFilter) || base.projectType,
    pmFilter: (record.pmFilter as string) || base.pmFilter,
    statusFilter: (record.statusFilter as StatusFilter) || base.statusFilter,
  }
}

export function buildChartFilterConfig(
  options: ChartFilterOptions,
  showStatus: boolean,
): FilterField[] {
  const fields: FilterField[] = [
    {
      field: 'dateRange',
      label: 'Date Range',
      type: 'select',
      options: DATE_RANGE_OPTIONS.map((v) => ({ label: v, value: v })),
    },
    {
      field: 'clientFilter',
      label: 'Client',
      type: 'select',
      options: [
        { label: 'All Clients', value: 'All Clients' },
        ...options.clients.map((c) => ({ label: c, value: c })),
      ],
    },
    {
      field: 'projectType',
      label: 'Project Type',
      type: 'select',
      options: [
        { label: 'All Types', value: 'All Types' },
        ...CLIENT_PROJECT_TYPES.map((t) => ({ label: t, value: t })),
      ],
    },
    {
      field: 'pmFilter',
      label: 'Project Lead',
      type: 'select',
      options: [
        { label: 'All Managers', value: 'All Managers' },
        ...options.projectManagers.map((pm) => ({ label: pm, value: pm })),
      ],
    },
  ]
  if (showStatus) {
    fields.push({
      field: 'statusFilter',
      label: 'Status',
      type: 'select',
      options: STATUS_FILTER_OPTIONS.map((v) => ({ label: v, value: v })),
    })
  }
  return fields
}

export function countActiveChartFilters(
  current: ChartFilters,
  globalFilters: DashboardFilters,
): number {
  const baseline = chartFiltersFromGlobal(globalFilters)
  let count = 0
  if (current.dateRange !== baseline.dateRange) count++
  if (current.clientFilter !== baseline.clientFilter) count++
  if (current.pmFilter !== baseline.pmFilter) count++
  if (current.statusFilter !== baseline.statusFilter) count++
  if (current.projectType !== baseline.projectType) count++
  return count
}

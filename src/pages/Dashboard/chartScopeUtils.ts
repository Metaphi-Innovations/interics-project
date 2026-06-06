import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { VendorInvoice, Expense } from '@/slices/live/reducer'
import { mapToClientProjectType, matchesStatusFilter } from './dashboardMappings'
import type { ChartFilters } from './chartFilterTypes'
import { filterFinancialByDate } from './dashboardMetrics'
import { invoiceDocumentDate } from './dashboardHelpers'

export function filterProjectsForChart(
  projects: Project[],
  filters: ChartFilters,
): Project[] {
  return projects.filter((p) => {
    if (!matchesStatusFilter(p, filters.statusFilter)) return false
    if (filters.clientFilter !== 'All Clients' && p.customerName !== filters.clientFilter) {
      return false
    }
    if (filters.pmFilter !== 'All Managers' && p.projectManager !== filters.pmFilter) {
      return false
    }
    if (filters.projectType !== 'All Types') {
      if (mapToClientProjectType(p) !== filters.projectType) return false
    }
    return true
  })
}

export interface ChartScopeData {
  filteredProjects: Project[]
  projectIds: Set<string> | null
  scopedInvoices: ClientInvoice[]
  scopedVendorInvoices: VendorInvoice[]
  scopedExpenses: Expense[]
}

export function scopeForChart(
  projects: Project[],
  clientInvoices: ClientInvoice[],
  vendorInvoices: VendorInvoice[],
  expenses: Expense[],
  filters: ChartFilters,
): ChartScopeData {
  const filteredProjects = filterProjectsForChart(projects, filters)
  const projectIds =
    projects.length === 0 ? null : new Set(filteredProjects.map((p) => p.id))

  const scopedInvoices = filterFinancialByDate(
    clientInvoices,
    projectIds,
    invoiceDocumentDate,
    filters.dateRange,
  )
  const scopedVendorInvoices = filterFinancialByDate(
    vendorInvoices,
    projectIds,
    (v) => v.invoiceDate,
    filters.dateRange,
  )
  const scopedExpenses = filterFinancialByDate(
    expenses,
    projectIds,
    (e) => e.date,
    filters.dateRange,
  )

  return {
    filteredProjects,
    projectIds,
    scopedInvoices,
    scopedVendorInvoices,
    scopedExpenses,
  }
}

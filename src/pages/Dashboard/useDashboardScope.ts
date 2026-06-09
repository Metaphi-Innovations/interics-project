import { useMemo } from 'react'
import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { Customer } from '@/slices/customers/reducer'
import type { VendorInvoice, Expense } from '@/slices/live/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import { matchesStatusFilter } from './dashboardMappings'
import {
  filterFinancialByBounds,
  filterFinancialByDate,
} from './dashboardMetrics'
import {
  getMonthBuckets,
  getPreviousDateRangeBounds,
  invoiceDocumentDate,
  monthCountForRange,
} from './dashboardHelpers'
import type { DashboardFilters, DashboardScopeResult } from './types'

interface UseDashboardScopeArgs {
  projects: Project[]
  clientInvoices: ClientInvoice[]
  vendorInvoices: VendorInvoice[]
  expenses: Expense[]
  customers: Customer[]
  baselinesByProjectId: Record<string, Baseline | null>
  filters: DashboardFilters
}

/** Status, client, and PM only — date range applies to financials, not project membership. */
function filterProjectsList(
  projects: Project[],
  filters: DashboardFilters,
): Project[] {
  return projects.filter((p) => {
    if (!matchesStatusFilter(p, filters.statusFilter)) return false
    if (filters.clientFilter !== 'All Clients' && p.customerName !== filters.clientFilter) {
      return false
    }
    if (
      filters.pmFilter !== 'All Managers' &&
      p.projectManager !== filters.pmFilter
    ) {
      return false
    }
    return true
  })
}

export function useDashboardScope({
  projects,
  clientInvoices,
  vendorInvoices,
  expenses,
  customers,
  baselinesByProjectId,
  filters,
}: UseDashboardScopeArgs): DashboardScopeResult {
  const filteredProjects = useMemo(
    () => filterProjectsList(projects, filters),
    [projects, filters],
  )

  const buildProjects = useMemo(
    () =>
      filteredProjects.filter((p) =>
        (p.projectTypes ?? []).includes('Build'),
      ),
    [filteredProjects],
  )

  const projectIdsForScope = useMemo(() => {
    if (projects.length === 0) return null as Set<string> | null
    return new Set(filteredProjects.map((p) => p.id))
  }, [projects.length, filteredProjects])

  const scopedInvoices = useMemo(
    () =>
      filterFinancialByDate(
        clientInvoices,
        projectIdsForScope,
        invoiceDocumentDate,
        filters.dateRange,
      ),
    [clientInvoices, projectIdsForScope, filters.dateRange],
  )

  const scopedVendorInvoices = useMemo(
    () =>
      filterFinancialByDate(
        vendorInvoices,
        projectIdsForScope,
        (v) => v.invoiceDate,
        filters.dateRange,
      ),
    [vendorInvoices, projectIdsForScope, filters.dateRange],
  )

  const scopedExpenses = useMemo(
    () =>
      filterFinancialByDate(
        expenses,
        projectIdsForScope,
        (e) => e.date,
        filters.dateRange,
      ),
    [expenses, projectIdsForScope, filters.dateRange],
  )

  const prevBounds = useMemo(
    () => getPreviousDateRangeBounds(filters.dateRange),
    [filters.dateRange],
  )

  const previousScopedInvoices = useMemo(() => {
    if (!prevBounds) return [] as ClientInvoice[]
    return filterFinancialByBounds(
      clientInvoices,
      projectIdsForScope,
      invoiceDocumentDate,
      prevBounds,
    )
  }, [clientInvoices, projectIdsForScope, prevBounds])

  const previousScopedVendorInvoices = useMemo(() => {
    if (!prevBounds) return [] as VendorInvoice[]
    return filterFinancialByBounds(
      vendorInvoices,
      projectIdsForScope,
      (v) => v.invoiceDate,
      prevBounds,
    )
  }, [vendorInvoices, projectIdsForScope, prevBounds])

  const previousScopedExpenses = useMemo(() => {
    if (!prevBounds) return [] as Expense[]
    return filterFinancialByBounds(
      expenses,
      projectIdsForScope,
      (e) => e.date,
      prevBounds,
    )
  }, [expenses, projectIdsForScope, prevBounds])

  /** Same project cohort as current view; period trends use financial previous-period scope. */
  const prevFilteredProjects = useMemo(
    () => filterProjectsList(projects, filters),
    [projects, filters],
  )

  const monthBuckets = useMemo(
    () => getMonthBuckets(monthCountForRange(filters.dateRange)),
    [filters.dateRange],
  )

  const uniqueClients = useMemo(() => {
    const names = new Set(projects.map((p) => p.customerName).filter(Boolean))
    return Array.from(names)
  }, [projects])

  const uniquePMs = useMemo(() => {
    const names = new Set(projects.map((p) => p.projectManager).filter(Boolean))
    return Array.from(names)
  }, [projects])

  return {
    filteredProjects,
    prevFilteredProjects,
    buildProjects,
    projectIdsForScope,
    scopedInvoices,
    scopedVendorInvoices,
    scopedExpenses,
    previousScopedInvoices,
    previousScopedVendorInvoices,
    previousScopedExpenses,
    monthBuckets,
    uniqueClients,
    uniquePMs,
    hasPreviousPeriod: prevBounds !== null,
    customers,
    baselinesByProjectId,
  }
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { VendorInvoice, Expense } from '@/slices/live/reducer'
import { chartFiltersFromGlobal, type ChartFilters } from '../chartFilterTypes'
import { scopeForChart } from '../chartScopeUtils'
import { getMonthBuckets, monthCountForRange } from '../dashboardHelpers'
import type { DashboardFilters } from '../types'

export interface ChartDataSource {
  projects: Project[]
  clientInvoices: ClientInvoice[]
  vendorInvoices: VendorInvoice[]
  expenses: Expense[]
  uniqueClients: string[]
  uniquePMs: string[]
}

export function useChartFilterScope(
  globalFilters: DashboardFilters,
  data: ChartDataSource,
) {
  const [chartFilters, setChartFilters] = useState<ChartFilters>(() =>
    chartFiltersFromGlobal(globalFilters),
  )

  useEffect(() => {
    setChartFilters(chartFiltersFromGlobal(globalFilters))
  }, [
    globalFilters.dateRange,
    globalFilters.statusFilter,
    globalFilters.clientFilter,
    globalFilters.pmFilter,
  ])

  const applyFilters = useCallback((filters: ChartFilters) => {
    setChartFilters(filters)
  }, [])

  const resetFilters = useCallback(() => {
    setChartFilters(chartFiltersFromGlobal(globalFilters))
  }, [globalFilters])

  const scope = useMemo(
    () =>
      scopeForChart(
        data.projects,
        data.clientInvoices,
        data.vendorInvoices,
        data.expenses,
        chartFilters,
      ),
    [
      data.projects,
      data.clientInvoices,
      data.vendorInvoices,
      data.expenses,
      chartFilters,
    ],
  )

  const monthBuckets = useMemo(
    () => getMonthBuckets(monthCountForRange(chartFilters.dateRange)),
    [chartFilters.dateRange],
  )

  const filterOptions = useMemo(
    () => ({
      clients: data.uniqueClients,
      projectManagers: data.uniquePMs,
    }),
    [data.uniqueClients, data.uniquePMs],
  )

  return {
    chartFilters,
    applyFilters,
    resetFilters,
    scope,
    monthBuckets,
    filterOptions,
  }
}

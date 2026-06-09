import type { CSSProperties } from 'react'
import type { Theme } from '@mui/material/styles'
import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { Customer } from '@/slices/customers/reducer'
import type { VendorInvoice, Expense } from '@/slices/live/reducer'
import type { Baseline } from '@/slices/baseline/reducer'

export type DateRange = 'This Month' | 'This Quarter' | 'This Year' | 'All Time'

export type StatusFilter =
  | 'All Status'
  | 'Pitch'
  | 'Live'
  | 'Completed'
  | 'On Hold'
  | 'Cancelled'

export type TrendVariant = 'positive' | 'negative' | 'neutral'

export interface MonthBucket {
  key: string
  label: string
  year: number
  month: number
}

export interface DateRangeBounds {
  start: Date
  end: Date
}

export interface DashboardFilters {
  dateRange: DateRange
  statusFilter: StatusFilter
  clientFilter: string
  pmFilter: string
}

export interface DashboardScopeInput {
  projects: Project[]
  clientInvoices: ClientInvoice[]
  vendorInvoices: VendorInvoice[]
  expenses: Expense[]
  customers: Customer[]
  baselinesByProjectId: Record<string, Baseline | null>
  filters: DashboardFilters
}

export interface DashboardScopeResult {
  filteredProjects: Project[]
  prevFilteredProjects: Project[]
  buildProjects: Project[]
  projectIdsForScope: Set<string> | null
  scopedInvoices: ClientInvoice[]
  scopedVendorInvoices: VendorInvoice[]
  scopedExpenses: Expense[]
  previousScopedInvoices: ClientInvoice[]
  previousScopedVendorInvoices: VendorInvoice[]
  previousScopedExpenses: Expense[]
  monthBuckets: MonthBucket[]
  uniqueClients: string[]
  uniquePMs: string[]
  hasPreviousPeriod: boolean
  customers: Customer[]
  baselinesByProjectId: Record<string, Baseline | null>
}

export interface ChartThemeProps {
  theme: Theme
  chartHeight: number
  tooltipContentStyle: CSSProperties
  dividerColor: string
  tableHeaderBg: string
}

export interface NamedValue {
  name: string
  value: number
  color?: string
}

export interface MonthlyFinancialRow {
  month: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

export interface ExecutiveKpis {
  totalRevenue: number
  totalProfit: number
  activeProjects: number
  activeClients: number
  avgDesignFeePerSqft: number
  avgProfitMargin: number
  outstandingReceivables: number
  repeatClientPct: number
  prevTotalRevenue: number
  prevTotalProfit: number
  prevActiveProjects: number
  prevActiveClients: number
  prevAvgDesignFeePerSqft: number
  prevAvgProfitMargin: number
  prevOutstandingReceivables: number
  prevRepeatClientPct: number
}

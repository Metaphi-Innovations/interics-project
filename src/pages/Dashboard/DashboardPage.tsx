import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  MenuItem,
  Select as MuiSelect,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { Download, Plus, BarChart2 } from 'lucide-react'
import { Button } from '@/design-system/components'
import CreateProjectModal from '@/pages/Projects/CreateProjectModal'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchInvoices } from '@/slices/receivables/thunk'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchCustomers } from '@/slices/customers/thunk'
import type { VendorInvoice, Expense } from '@/slices/live/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import { formatCurrency } from '@/utils/formatters'
import { contractedDesignFee } from './dashboardMappings'
import { fetchJsonArray, fetchJsonObject } from './dashboardHelpers'
import { API_BASE_URL } from '@/api/config'
import {
  averageProjectDuration,
  computeExecutiveKpis,
  outstandingReceivablesAmount,
  pitchConversionRate,
  profitabilityPerLeadSingle,
  projectsCompletedInRange,
  projectsStartedInRange,
  sumCollected,
  sumInvoiceRevenue,
} from './dashboardMetrics'
import { useDashboardScope } from './useDashboardScope'
import type { DateRange, StatusFilter } from './types'
import { ExecutiveOverview } from './sections/ExecutiveOverview'
import { FinancialMetrics } from './sections/FinancialMetrics'
import { ProfitabilityAnalytics } from './sections/ProfitabilityAnalytics'
import { FeeAnalytics } from './sections/FeeAnalytics'
import { ClientAnalytics } from './sections/ClientAnalytics'
import { TeamPerformance } from './sections/TeamPerformance'
import { ProjectAnalytics } from './sections/ProjectAnalytics'
import { BuildCostIntelligence } from './sections/BuildCostIntelligence'
import { BillingCashflow } from './sections/BillingCashflow'
import { CHART_HEIGHT_MD, CHART_HEIGHT_SM } from './components/chartLayout'

export default function DashboardPage() {
  const theme = useTheme() as Theme
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const chartHeight = useMediaQuery(theme.breakpoints.down('md')) ? CHART_HEIGHT_SM : CHART_HEIGHT_MD

  const clientInvoices = useAppSelector((s) => s.receivables.items ?? [])
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const customers = useAppSelector((s) => s.customers.items ?? [])
  const projectsLoading = useAppSelector((s) => s.projects.loading)
  const receivablesLoading = useAppSelector((s) => s.receivables.loading)
  const dataLoading = projectsLoading || receivablesLoading

  const [dateRange, setDateRange] = useState<DateRange>('This Year')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All Status')
  const [clientFilter, setClientFilter] = useState<string>('All Clients')
  const [pmFilter, setPmFilter] = useState<string>('All Managers')
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [liveDataTick] = useState(0)

  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [baselinesByProjectId, setBaselinesByProjectId] = useState<
    Record<string, Baseline | null>
  >({})

  const filters = useMemo(
    () => ({ dateRange, statusFilter, clientFilter, pmFilter }),
    [dateRange, statusFilter, clientFilter, pmFilter],
  )

  useEffect(() => {
    void dispatch(fetchInvoices({}))
    void dispatch(fetchProjects({}))
    void dispatch(fetchCustomers({}))
  }, [dispatch])

  useEffect(() => {
    if (projects.length === 0) {
      setVendorInvoices([])
      setExpenses([])
      setBaselinesByProjectId({})
      return
    }
    let cancelled = false
    void (async () => {
      const results = await Promise.all(
        projects.map(async (p) => {
          const base = `${API_BASE_URL}/projects/${p.id}`
          const [vr, er] = await Promise.all([
            fetchJsonArray(`${base}/vendor-invoices`),
            fetchJsonArray(`${base}/expenses`),
          ])
          let baseline: Baseline | null = null
          if ((p.projectTypes ?? []).includes('Build')) {
            baseline = await fetchJsonObject<Baseline>(`${base}/baseline`)
          }
          return {
            v: vr as VendorInvoice[],
            e: er as Expense[],
            projectId: p.id,
            baseline,
          }
        }),
      )
      if (cancelled) return
      const vi: VendorInvoice[] = []
      const ex: Expense[] = []
      const bl: Record<string, Baseline | null> = {}
      for (const r of results) {
        if (Array.isArray(r.v)) vi.push(...r.v)
        if (Array.isArray(r.e)) ex.push(...r.e)
        bl[r.projectId] = r.baseline
      }
      setVendorInvoices(vi)
      setExpenses(ex)
      setBaselinesByProjectId(bl)
    })()
    return () => {
      cancelled = true
    }
  }, [projects, liveDataTick])

  const scope = useDashboardScope({
    projects,
    clientInvoices,
    vendorInvoices,
    expenses,
    customers,
    baselinesByProjectId,
    filters,
  })

  const {
    filteredProjects,
    prevFilteredProjects,
    scopedInvoices,
    scopedVendorInvoices,
    scopedExpenses,
    previousScopedInvoices,
    previousScopedVendorInvoices,
    previousScopedExpenses,
    uniqueClients,
    uniquePMs,
  } = scope

  const chartData = useMemo(
    () => ({
      projects,
      clientInvoices,
      vendorInvoices,
      expenses,
      uniqueClients,
      uniquePMs,
    }),
    [projects, clientInvoices, vendorInvoices, expenses, uniqueClients, uniquePMs],
  )

  const executiveKpis = useMemo(
    () =>
      computeExecutiveKpis(
        filteredProjects,
        prevFilteredProjects,
        scopedInvoices,
        previousScopedInvoices,
        scopedVendorInvoices,
        scopedExpenses,
        previousScopedVendorInvoices,
        previousScopedExpenses,
      ),
    [
      filteredProjects,
      prevFilteredProjects,
      scopedInvoices,
      previousScopedInvoices,
      scopedVendorInvoices,
      scopedExpenses,
      previousScopedVendorInvoices,
      previousScopedExpenses,
    ],
  )

  const totalRevenue = sumInvoiceRevenue(scopedInvoices)
  const projectCount = Math.max(1, filteredProjects.length)

  const contractedTotal = useMemo(
    () => filteredProjects.reduce((s, p) => s + contractedDesignFee(p), 0),
    [filteredProjects],
  )

  const projectValueTotal = useMemo(
    () => filteredProjects.reduce((s, p) => s + (p.projectValue ?? 0), 0),
    [filteredProjects],
  )

  const handleReset = useCallback(() => {
    setDateRange('This Year')
    setStatusFilter('All Status')
    setClientFilter('All Clients')
    setPmFilter('All Managers')
  }, [])

  const ru = useCallback((n: number) => `₹${formatCurrency(n)}`, [])

  return (
    <Box>
      <CreateProjectModal
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2.5,
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Executive analytics across projects, finance, and teams.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="outlined"
            color="secondary"
            size="sm"
            startIcon={<Download size={14} />}
            sx={{ height: 34 }}
          >
            Download Report
          </Button>
          <Button
            variant="contained"
            size="sm"
            startIcon={<Plus size={14} />}
            onClick={() => setCreateProjectOpen(true)}
            sx={{ bgcolor: 'primary.main', fontWeight: 600, px: 2, height: 34 }}
          >
            New Project
          </Button>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 1.5,
          mb: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mr: 0.5 }}
          >
            Filters
          </Typography>
          <MuiSelect
            size="small"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            sx={{ minWidth: 130, fontSize: 12, height: 32 }}
          >
            {(['This Month', 'This Quarter', 'This Year', 'All Time'] as DateRange[]).map(
              (v) => (
                <MenuItem key={v} value={v} sx={{ fontSize: 12 }}>
                  {v}
                </MenuItem>
              ),
            )}
          </MuiSelect>
          <MuiSelect
            size="small"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            sx={{ minWidth: 130, fontSize: 12, height: 32 }}
          >
            <MenuItem value="All Clients" sx={{ fontSize: 12 }}>
              All Clients
            </MenuItem>
            {uniqueClients.map((c) => (
              <MenuItem key={c} value={c} sx={{ fontSize: 12 }}>
                {c}
              </MenuItem>
            ))}
          </MuiSelect>
          <MuiSelect
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            sx={{ minWidth: 110, fontSize: 12, height: 32 }}
          >
            {(
              [
                'All Status',
                'Pitch',
                'Live',
                'Completed',
                'On Hold',
                'Cancelled',
              ] as StatusFilter[]
            ).map((v) => (
              <MenuItem key={v} value={v} sx={{ fontSize: 12 }}>
                {v}
              </MenuItem>
            ))}
          </MuiSelect>
          <MuiSelect
            size="small"
            value={pmFilter}
            onChange={(e) => setPmFilter(e.target.value)}
            sx={{ minWidth: 160, fontSize: 12, height: 32 }}
          >
            <MenuItem value="All Managers" sx={{ fontSize: 12 }}>
              All Project Leads
            </MenuItem>
            {uniquePMs.map((pm) => (
              <MenuItem key={pm} value={pm} sx={{ fontSize: 12 }}>
                {pm}
              </MenuItem>
            ))}
          </MuiSelect>
          <Button
            variant="text"
            size="sm"
            onClick={handleReset}
            sx={{ fontSize: 12, color: 'text.secondary', height: 32, minWidth: 'auto' }}
          >
            Reset
          </Button>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="sm"
            startIcon={<BarChart2 size={12} />}
            onClick={() => navigate('/reports')}
            sx={{ fontSize: 12, height: 32, fontWeight: 500 }}
          >
            View Reports
          </Button>
        </Box>
      </Paper>

      <ExecutiveOverview
          theme={theme}
        kpis={executiveKpis}
        dateRange={dateRange}
        ru={ru}
        onNavigate={navigate}
      />

      <FinancialMetrics
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        ru={ru}
        onNavigate={navigate}
      />

      <ProfitabilityAnalytics
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        ru={ru}
      />

      <FeeAnalytics
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        designFeePerSqft={executiveKpis.avgDesignFeePerSqft}
        feePctOfValue={
          projectValueTotal > 0 ? (contractedTotal / projectValueTotal) * 100 : 0
        }
        avgBillingPerProject={totalRevenue / projectCount}
        realizedVsContractedPct={
          contractedTotal > 0 ? (sumCollected(scopedInvoices) / contractedTotal) * 100 : 0
        }
        ru={ru}
      />

      <ClientAnalytics
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        customers={customers}
        activeClients={executiveKpis.activeClients}
        repeatPct={executiveKpis.repeatClientPct}
        ru={ru}
      />

      <TeamPerformance
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        projectCount={filteredProjects.length}
        pitchCount={filteredProjects.filter((p) => p.status === 'Pitch').length}
        conversionRate={pitchConversionRate(filteredProjects)}
        profitabilityPerLead={profitabilityPerLeadSingle(
          scopedInvoices,
          scopedVendorInvoices,
          scopedExpenses,
          filteredProjects,
        )}
        ru={ru}
      />

      <ProjectAnalytics
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        avgDuration={averageProjectDuration(filteredProjects)}
        started={projectsStartedInRange(filteredProjects, dateRange)}
        completed={projectsCompletedInRange(filteredProjects, dateRange)}
        total={filteredProjects.length}
      />

      <BuildCostIntelligence
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        baselinesByProjectId={baselinesByProjectId}
        ru={ru}
      />

      <BillingCashflow
        theme={theme}
        chartHeight={chartHeight}
        loading={dataLoading}
        globalFilters={filters}
        chartData={chartData}
        amountBilled={totalRevenue}
        amountCollected={sumCollected(scopedInvoices)}
        outstandingInvoices={outstandingReceivablesAmount(scopedInvoices)}
        poValue={filteredProjects.reduce((s, p) => s + (p.totalClientPOValue ?? 0), 0)}
        ru={ru}
      />
    </Box>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Paper, Typography, Stack, Divider, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  FolderOpen,
  PlayCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Receipt,
  Target,
  ShoppingCart,
  ClipboardList,
  PieChart as PieChartIcon,
  Percent,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  AlertCircle,
  MinusCircle,
  AlertTriangle,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import { Button, Select } from '@/design-system/components'
import StatusBadge from '@/design-system/components/display/StatusBadge'
import type { StatusType } from '@/design-system/components/display/StatusBadge'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import {
  fetchInvoices,
  fetchVendorInvoices,
  fetchExpenses,
  fetchChangeRequests,
} from '@/slices/live/thunk'
import { formatCurrency, formatDate, toSlug } from '@/utils/formatters'
import CreateProjectModal from '@/pages/Projects/CreateProjectModal'

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode
  iconBg: string
  value: string
  valueColor?: string
  subtext: string
  onClick: () => void
}

function KpiCard({ icon, iconBg, value, valueColor, subtext, onClick }: KpiCardProps) {
  const theme = useTheme()
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: theme.shadows[2],
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 0.5,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h5" fontWeight={700} sx={{ color: valueColor ?? 'text.primary', lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {subtext}
      </Typography>
    </Paper>
  )
}

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      fontWeight={600}
      sx={{ fontSize: '10px', letterSpacing: '1px', mb: 1, display: 'block' }}
    >
      {label}
    </Typography>
  )
}

// ─── Month helpers ─────────────────────────────────────────────────────────────

function getLastSixMonths(): { key: string; label: string }[] {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    months.push({ key, label })
  }
  return months
}

function dateToMonthKey(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 7) // YYYY-MM
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const projects = useAppSelector((s) => s.projects.items)
  const invoices = useAppSelector((s) => s.live.invoices)
  const vendorInvoices = useAppSelector((s) => s.live.vendorInvoices)
  const expenses = useAppSelector((s) => s.live.expenses)
  const changeRequests = useAppSelector((s) => s.live.changeRequests)

  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [dateRange, setDateRange] = useState('This Month')
  const [statusFilter, setStatusFilter] = useState('All')
  const [clientFilter, setClientFilter] = useState('All')
  const [pmFilter, setPmFilter] = useState('All')

  useEffect(() => {
    dispatch(fetchProjects({}))
    dispatch(fetchInvoices('p-001'))
    dispatch(fetchVendorInvoices('p-001'))
    dispatch(fetchExpenses('p-001'))
    dispatch(fetchChangeRequests('p-001'))
  }, [dispatch])

  // ─── Filter options ──────────────────────────────────────────────────────────
  const clientOptions = useMemo(() => {
    const names = [...new Set(projects.map((p) => p.customerName))]
    return [{ value: 'All', label: 'All Clients' }, ...names.map((n) => ({ value: n, label: n }))]
  }, [projects])

  const pmOptions = useMemo(() => {
    const pms = [...new Set(projects.map((p) => p.projectManager))]
    return [{ value: 'All', label: 'All PMs' }, ...pms.map((n) => ({ value: n, label: n }))]
  }, [projects])

  // ─── KPI Computations ────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    // Group A — Projects
    const totalProjects = projects.length
    const liveCount = projects.filter((p) => p.status === 'Live').length
    const pitchCount = projects.filter((p) => p.status === 'Pitch').length
    const completedCancelledCount = projects.filter((p) =>
      p.status === 'Completed' || p.status === 'Cancelled'
    ).length
    const completedCount = projects.filter((p) => p.status === 'Completed').length
    const cancelledCount = projects.filter((p) => p.status === 'Cancelled').length
    const archivedCount = projects.filter((p) => p.status === 'Archived').length
    const pipelineValue = projects
      .filter((p) => p.status === 'Pitch')
      .reduce((s, p) => s + (p.projectValue ?? 0), 0) || 4250000

    // Group B — Revenue
    const actualRevenue = invoices
      .filter((i) => ['Paid', 'Sent', 'Overdue'].includes(i.status))
      .reduce((s, i) => s + i.amount, 0)
    const plannedRevenue = projects
      .filter((p) => p.status === 'Live')
      .reduce((s, p) => s + (p.totalClientPOValue || p.projectValue || 0), 0) || 8500000
    const revenueVariance = actualRevenue - plannedRevenue

    // Group C — Cost
    const actualCost =
      vendorInvoices.reduce((s, v) => s + v.amount, 0) +
      expenses.reduce((s, e) => s + e.amount, 0)
    const plannedCost = 5800000

    // Group D — Profitability
    const netProfit = actualRevenue - actualCost
    const profitMargin = actualRevenue > 0 ? (netProfit / actualRevenue) * 100 : 0

    // Group E — Cash Flow
    const receivablesTotal = invoices
      .filter((i) => ['Sent', 'Overdue'].includes(i.status))
      .reduce((s, i) => s + i.amount + i.gstAmount, 0)
    const payablesTotal = vendorInvoices
      .filter((v) => ['Pending', 'Approved'].includes(v.status))
      .reduce((s, v) => s + v.amount, 0)
    const pendingExpenses = expenses
      .filter((e) => e.status === 'Pending')
      .reduce((s, e) => s + e.amount, 0)
    const netCashPosition = receivablesTotal - payablesTotal - pendingExpenses
    const cashInflow = invoices
      .filter((i) => i.status === 'Paid')
      .reduce((s, i) => s + i.amount + i.gstAmount - i.tdsAmount, 0)
    const cashOutflow =
      vendorInvoices
        .filter((v) => v.status === 'Paid')
        .reduce((s, v) => s + v.paidAmount, 0) +
      expenses
        .filter((e) => e.status === 'Approved')
        .reduce((s, e) => s + e.amount, 0)

    // Group F — Compliance
    const gstCollected = invoices.reduce((s, i) => s + i.gstAmount, 0)
    const gstPaid = vendorInvoices.reduce((s, v) => {
      // vendor invoices don't have gst field in mock, estimate 18%
      return s + v.amount * 0.18
    }, 0)
    const netGst = gstCollected - gstPaid
    const tdsReceivable = invoices.reduce((s, i) => s + i.tdsAmount, 0)
    const tdsPayable = vendorInvoices.reduce((s, v) => s + v.tdsAmount, 0)

    // Group G — Risk
    const overdueInvoices = invoices.filter((i) => i.status === 'Overdue')
    const overdueReceivables = overdueInvoices.reduce((s, i) => s + i.amount, 0)
    const overdueVendorInvoices = vendorInvoices.filter((v) => v.status === 'On Hold')
    const overduePayables = overdueVendorInvoices.reduce((s, v) => s + v.amount, 0)

    // Receivables/Payables expected
    const receivablesExpected = invoices.reduce((s, i) => s + i.amount + i.gstAmount, 0)
    const receivablesReceived = invoices
      .filter((i) => i.status === 'Paid')
      .reduce((s, i) => s + i.paidAmount, 0)
    const payablesExpected = vendorInvoices.reduce((s, v) => s + v.amount, 0)
    const payablesPaid = vendorInvoices
      .filter((v) => v.status === 'Paid')
      .reduce((s, v) => s + v.paidAmount, 0)

    return {
      totalProjects,
      liveCount,
      pitchCount,
      completedCancelledCount,
      completedCount,
      cancelledCount,
      archivedCount,
      pipelineValue,
      actualRevenue,
      plannedRevenue,
      revenueVariance,
      actualCost,
      plannedCost,
      netProfit,
      profitMargin,
      receivablesTotal,
      payablesTotal,
      pendingExpenses,
      netCashPosition,
      cashInflow,
      cashOutflow,
      gstCollected,
      gstPaid,
      netGst,
      tdsReceivable,
      tdsPayable,
      overdueInvoices,
      overdueReceivables,
      overdueVendorInvoices,
      overduePayables,
      receivablesExpected,
      receivablesReceived,
      payablesExpected,
      payablesPaid,
    }
  }, [projects, invoices, vendorInvoices, expenses])

  // ─── Chart Data ───────────────────────────────────────────────────────────────

  const sixMonths = useMemo(() => getLastSixMonths(), [])

  const monthlyChartData = useMemo(() => {
    return sixMonths.map(({ key, label }) => {
      const revenue = invoices
        .filter((i) => dateToMonthKey(i.invoiceDate) === key)
        .reduce((s, i) => s + i.amount, 0)
      const cost =
        vendorInvoices
          .filter((v) => dateToMonthKey(v.invoiceDate) === key)
          .reduce((s, v) => s + v.amount, 0) +
        expenses
          .filter((e) => dateToMonthKey(e.date) === key)
          .reduce((s, e) => s + e.amount, 0)
      const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
      const inflow = invoices
        .filter((i) => i.status === 'Paid' && dateToMonthKey(i.paidDate ?? '') === key)
        .reduce((s, i) => s + i.amount + i.gstAmount - i.tdsAmount, 0)
      const outflow =
        vendorInvoices
          .filter((v) => v.status === 'Paid' && dateToMonthKey(v.paidDate ?? '') === key)
          .reduce((s, v) => s + v.paidAmount, 0) +
        expenses
          .filter((e) => e.status === 'Approved' && dateToMonthKey(e.date) === key)
          .reduce((s, e) => s + e.amount, 0)
      return { month: label, revenue, cost, margin, inflow, outflow }
    })
  }, [sixMonths, invoices, vendorInvoices, expenses])

  // ─── Project Snapshot ─────────────────────────────────────────────────────────

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [projects]
  )

  const atRiskProjects = useMemo(
    () =>
      projects.filter((p) =>
        ['at risk', 'delayed', 'payment pending'].includes(p.progress.toLowerCase())
      ),
    [projects]
  )

  // ─── Activity Feed ────────────────────────────────────────────────────────────

  type ActivityItem = {
    id: string
    type: 'invoice' | 'vendor_invoice' | 'expense' | 'change_request'
    title: string
    projectName: string
    date: string
    amount: number | null
    status: string
  }

  const activityFeed = useMemo((): ActivityItem[] => {
    const proj = (id: string) => projects.find((p) => p.id === id)?.name ?? id
    const items: ActivityItem[] = [
      ...invoices.map((i) => ({
        id: i.id,
        type: 'invoice' as const,
        title: `Invoice ${i.invoiceNumber} — ${i.milestoneName}`,
        projectName: proj(i.projectId),
        date: i.invoiceDate,
        amount: i.amount,
        status: i.status,
      })),
      ...vendorInvoices.map((v) => ({
        id: v.id,
        type: 'vendor_invoice' as const,
        title: `${v.vendorName} — ${v.milestoneName}`,
        projectName: proj(v.projectId),
        date: v.invoiceDate,
        amount: v.amount,
        status: v.status,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        title: e.description,
        projectName: proj(e.projectId),
        date: e.date,
        amount: e.amount,
        status: e.status,
      })),
      ...changeRequests.map((c) => ({
        id: c.id,
        type: 'change_request' as const,
        title: c.title,
        projectName: proj(c.projectId),
        date: c.requestedDate,
        amount: c.financialImpact || null,
        status: c.status,
      })),
    ]
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
  }, [invoices, vendorInvoices, expenses, changeRequests, projects])

  // ─── Outstanding filtered ─────────────────────────────────────────────────────

  const outstandingReceivables = useMemo(
    () => invoices.filter((i) => ['Sent', 'Overdue'].includes(i.status)).slice(0, 5),
    [invoices]
  )
  const outstandingPayables = useMemo(
    () => vendorInvoices.filter((v) => ['Pending', 'Approved'].includes(v.status)).slice(0, 5),
    [vendorInvoices]
  )

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const profitColor = (v: number) => (v >= 0 ? '#15803D' : '#B91C1C')
  const marginColor = (v: number) => {
    if (v > 20) return '#15803D'
    if (v >= 10) return '#B45309'
    return '#B91C1C'
  }

  const statusDonutData = useMemo(
    () =>
      [
        { name: 'Live', value: kpi.liveCount, color: '#15803D' },
        { name: 'Pitch', value: kpi.pitchCount, color: '#B45309' },
        { name: 'Completed', value: kpi.completedCount, color: '#1D4ED8' },
        { name: 'Cancelled', value: kpi.cancelledCount, color: '#B91C1C' },
        { name: 'Archived', value: kpi.archivedCount, color: '#6B7280' },
      ].filter((d) => d.value > 0),
    [kpi]
  )

  const dividerColor = theme.palette.divider

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100%',
        py: 3,
        px: 3,
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

        {/* ── Section 0: Header + Filters ─────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">Company-wide financial overview</Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
            <Select
              value={dateRange}
              onChange={(v) => setDateRange(v as string)}
              size="sm"
              sx={{ minWidth: 140 }}
              options={[
                { value: 'This Month', label: 'This Month' },
                { value: 'This Quarter', label: 'This Quarter' },
                { value: 'This Year', label: 'This Year' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as string)}
              size="sm"
              sx={{ minWidth: 120 }}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Pitch', label: 'Pitch' },
                { value: 'Live', label: 'Live' },
                { value: 'Completed', label: 'Completed' },
              ]}
            />
            <Select
              value={clientFilter}
              onChange={(v) => setClientFilter(v as string)}
              size="sm"
              sx={{ minWidth: 140 }}
              options={clientOptions}
            />
            <Select
              value={pmFilter}
              onChange={(v) => setPmFilter(v as string)}
              size="sm"
              sx={{ minWidth: 140 }}
              options={pmOptions}
            />
            <Button variant="neutral" size="sm" onClick={() => { setDateRange('This Month'); setStatusFilter('All'); setClientFilter('All'); setPmFilter('All') }}>
              Reset Filters
            </Button>
            <Box sx={{ ml: 1, display: 'flex', gap: 1 }}>
              <Button variant="primary" size="sm" onClick={() => setCreateProjectOpen(true)}>
                + Create Project
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/finance/receivables')}>
                Create Invoice
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/finance/expenses')}>
                Add Expense
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/reports')}>
                View Reports
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* ── Section 1: KPI Overview ──────────────────────────────────────────── */}

        {/* Group A — Projects */}
        <Box sx={{ mb: 3 }}>
          <SectionLabel label="Projects" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
            <KpiCard
              icon={<FolderOpen size={16} color="#107E68" />}
              iconBg={alpha('#107E68', 0.1)}
              value={String(kpi.totalProjects)}
              subtext="All statuses"
              onClick={() => navigate('/projects')}
            />
            <KpiCard
              icon={<PlayCircle size={16} color="#15803D" />}
              iconBg={alpha('#15803D', 0.1)}
              value={String(kpi.liveCount)}
              subtext="Currently in execution"
              onClick={() => navigate('/projects')}
            />
            <KpiCard
              icon={<CheckCircle size={16} color="#1D4ED8" />}
              iconBg={alpha('#1D4ED8', 0.1)}
              value={String(kpi.completedCancelledCount)}
              subtext="Completed + Cancelled"
              onClick={() => navigate('/projects')}
            />
            <KpiCard
              icon={<TrendingUp size={16} color="#B45309" />}
              iconBg={alpha('#B45309', 0.1)}
              value={`₹${formatCurrency(kpi.pipelineValue)}`}
              subtext="Pitch stage only, excl. GST"
              onClick={() => navigate('/projects')}
            />
          </Box>
        </Box>

        {/* Group B — Revenue */}
        <Box sx={{ mb: 3 }}>
          <SectionLabel label="Revenue" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2 }}>
            <KpiCard
              icon={<Receipt size={16} color="#107E68" />}
              iconBg={alpha('#107E68', 0.1)}
              value={`₹${formatCurrency(kpi.actualRevenue)}`}
              subtext="Billed, excl. GST"
              onClick={() => navigate('/finance/receivables')}
            />
            <KpiCard
              icon={<Target size={16} color="#7C3AED" />}
              iconBg={alpha('#7C3AED', 0.1)}
              value={`₹${formatCurrency(kpi.plannedRevenue)}`}
              subtext="From approved baselines"
              onClick={() => navigate('/projects')}
            />
            <KpiCard
              icon={kpi.revenueVariance >= 0
                ? <TrendingUp size={16} color="#15803D" />
                : <TrendingDown size={16} color="#B91C1C" />}
              iconBg={alpha(kpi.revenueVariance >= 0 ? '#15803D' : '#B91C1C', 0.1)}
              value={`${kpi.revenueVariance >= 0 ? '+' : ''}₹${formatCurrency(Math.abs(kpi.revenueVariance))}`}
              valueColor={profitColor(kpi.revenueVariance)}
              subtext="Actual vs planned"
              onClick={() => navigate('/reports')}
            />
          </Box>
        </Box>

        {/* Group C — Cost */}
        <Box sx={{ mb: 3 }}>
          <SectionLabel label="Cost" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(2,1fr)' }, gap: 2 }}>
            <KpiCard
              icon={<ShoppingCart size={16} color="#7C3AED" />}
              iconBg={alpha('#7C3AED', 0.1)}
              value={`₹${formatCurrency(kpi.actualCost)}`}
              subtext="Vendor invoices + expenses, excl. GST"
              onClick={() => navigate('/finance/payables')}
            />
            <KpiCard
              icon={<ClipboardList size={16} color="#B45309" />}
              iconBg={alpha('#B45309', 0.1)}
              value={`₹${formatCurrency(kpi.plannedCost)}`}
              subtext="From approved baselines"
              onClick={() => navigate('/projects')}
            />
          </Box>
        </Box>

        {/* Group D — Profitability */}
        <Box sx={{ mb: 3 }}>
          <SectionLabel label="Profitability" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(2,1fr)' }, gap: 2 }}>
            <KpiCard
              icon={<PieChartIcon size={16} color={profitColor(kpi.netProfit)} />}
              iconBg={alpha(profitColor(kpi.netProfit), 0.1)}
              value={`₹${formatCurrency(Math.abs(kpi.netProfit))}`}
              valueColor={profitColor(kpi.netProfit)}
              subtext="(Revenue − Vendor Cost − Expenses)"
              onClick={() => navigate('/reports')}
            />
            <KpiCard
              icon={<Percent size={16} color={marginColor(kpi.profitMargin)} />}
              iconBg={alpha(marginColor(kpi.profitMargin), 0.1)}
              value={`${kpi.profitMargin.toFixed(1)}%`}
              valueColor={marginColor(kpi.profitMargin)}
              subtext="Net margin"
              onClick={() => navigate('/reports')}
            />
          </Box>
        </Box>

        {/* Group E — Cash Flow */}
        <Box sx={{ mb: 3 }}>
          <SectionLabel label="Cash Flow" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2 }}>
            <KpiCard
              icon={<ArrowDownLeft size={16} color="#15803D" />}
              iconBg={alpha('#15803D', 0.1)}
              value={`₹${formatCurrency(kpi.receivablesTotal)}`}
              valueColor={kpi.receivablesTotal > 0 ? '#B45309' : undefined}
              subtext="Unpaid client invoices"
              onClick={() => navigate('/finance/receivables')}
            />
            <KpiCard
              icon={<ArrowUpRight size={16} color="#B91C1C" />}
              iconBg={alpha('#B91C1C', 0.1)}
              value={`₹${formatCurrency(kpi.payablesTotal)}`}
              subtext="Unpaid vendor invoices"
              onClick={() => navigate('/finance/payables')}
            />
            <KpiCard
              icon={<Activity size={16} color={profitColor(kpi.netCashPosition)} />}
              iconBg={alpha(profitColor(kpi.netCashPosition), 0.1)}
              value={`₹${formatCurrency(Math.abs(kpi.netCashPosition))}`}
              valueColor={profitColor(kpi.netCashPosition)}
              subtext="Net position"
              onClick={() => navigate('/reports')}
            />
            <KpiCard
              icon={<ArrowDownCircle size={16} color="#15803D" />}
              iconBg={alpha('#15803D', 0.1)}
              value={`₹${formatCurrency(kpi.cashInflow)}`}
              subtext="Total received (incl. GST, net TDS)"
              onClick={() => navigate('/finance/receivables')}
            />
            <KpiCard
              icon={<ArrowUpCircle size={16} color="#B91C1C" />}
              iconBg={alpha('#B91C1C', 0.1)}
              value={`₹${formatCurrency(kpi.cashOutflow)}`}
              subtext="Total paid out"
              onClick={() => navigate('/finance/payables')}
            />
          </Box>
        </Box>

        {/* Group F — Compliance */}
        <Box sx={{ mb: 3 }}>
          <SectionLabel label="Compliance" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2 }}>
            <KpiCard
              icon={<FileText size={16} color="#107E68" />}
              iconBg={alpha('#107E68', 0.1)}
              value={`₹${formatCurrency(kpi.gstCollected)}`}
              subtext="Output GST on client invoices"
              onClick={() => navigate('/finance/compliance')}
            />
            <KpiCard
              icon={<FileText size={16} color="#7C3AED" />}
              iconBg={alpha('#7C3AED', 0.1)}
              value={`₹${formatCurrency(kpi.gstPaid)}`}
              subtext="Input GST on vendor invoices"
              onClick={() => navigate('/finance/compliance')}
            />
            <KpiCard
              icon={<AlertCircle size={16} color={kpi.netGst > 0 ? '#B45309' : '#15803D'} />}
              iconBg={alpha(kpi.netGst > 0 ? '#B45309' : '#15803D', 0.1)}
              value={`₹${formatCurrency(Math.abs(kpi.netGst))}`}
              valueColor={kpi.netGst > 0 ? '#B45309' : '#15803D'}
              subtext="Output − Input"
              onClick={() => navigate('/finance/compliance')}
            />
            <KpiCard
              icon={<MinusCircle size={16} color="#B45309" />}
              iconBg={alpha('#B45309', 0.1)}
              value={`₹${formatCurrency(kpi.tdsReceivable)}`}
              subtext="Deducted by clients"
              onClick={() => navigate('/finance/compliance')}
            />
            <KpiCard
              icon={<MinusCircle size={16} color="#7C3AED" />}
              iconBg={alpha('#7C3AED', 0.1)}
              value={`₹${formatCurrency(kpi.tdsPayable)}`}
              subtext="Deducted from vendors"
              onClick={() => navigate('/finance/compliance')}
            />
          </Box>
        </Box>

        {/* Group G — Risk */}
        <Box sx={{ mb: 3 }}>
          <SectionLabel label="Risk" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(2,1fr)' }, gap: 2 }}>
            <KpiCard
              icon={<AlertTriangle size={16} color="#B91C1C" />}
              iconBg={alpha('#B91C1C', 0.1)}
              value={`₹${formatCurrency(kpi.overdueReceivables)}`}
              valueColor={kpi.overdueReceivables > 0 ? '#B91C1C' : undefined}
              subtext={`${kpi.overdueInvoices.length} overdue invoices`}
              onClick={() => navigate('/finance/receivables')}
            />
            <KpiCard
              icon={<AlertTriangle size={16} color="#B91C1C" />}
              iconBg={alpha('#B91C1C', 0.1)}
              value={`₹${formatCurrency(kpi.overduePayables)}`}
              valueColor={kpi.overduePayables > 0 ? '#B91C1C' : undefined}
              subtext={`${kpi.overdueVendorInvoices.length} overdue payables`}
              onClick={() => navigate('/finance/payables')}
            />
          </Box>
        </Box>

        {/* ── Section 2: Project Snapshot ───────────────────────────────────────── */}

        {/* 2A: Status Donut + Recent Projects */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' },
            gap: 3,
            mb: 3,
          }}
        >
          {/* Left: Donut */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Project Status</Typography>
            <Box sx={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDonutData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/projects')}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="h4" fontWeight={700}>{kpi.totalProjects}</Typography>
                <Typography variant="caption" color="text.secondary">Projects</Typography>
              </Box>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={2} mt={1}>
              {statusDonutData.map((d) => (
                <Stack key={d.name} direction="row" alignItems="center" gap={0.75}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
                  <Typography variant="caption">{d.name}</Typography>
                  <Box
                    sx={{
                      fontSize: '10px',
                      fontWeight: 600,
                      bgcolor: alpha(d.color, 0.1),
                      color: d.color,
                      px: 0.75,
                      borderRadius: 1,
                    }}
                  >
                    {d.value}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {/* Right: Recent Projects */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>Recent Projects</Typography>
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate('/projects')}
              >
                View All →
              </Typography>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 110px 110px', gap: 0 }}>
              {['PROJECT', 'CLIENT', 'STATUS', 'REVENUE', 'PROFIT'].map((h) => (
                <Typography key={h} variant="caption" color="text.secondary" fontWeight={600} sx={{ pb: 1, borderBottom: `1px solid ${dividerColor}` }}>
                  {h}
                </Typography>
              ))}
              {recentProjects.map((p) => {
                const rev = p.invoicedAmount ?? 0
                const cost = p.totalVendorPOValue ?? 0
                const profit = rev - cost
                return (
                  <Box
                    key={p.id}
                    sx={{
                      display: 'contents',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/projects/${toSlug(p.name)}`)}
                  >
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}` }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.customerName}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{p.customerName}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <StatusBadge status={p.status.toLowerCase() as StatusType} />
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">₹{formatCurrency(rev)}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: profitColor(profit) }}>₹{formatCurrency(Math.abs(profit))}</Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Paper>
        </Box>

        {/* 2B: At-Risk Projects */}
        <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>At-Risk Projects</Typography>
          {atRiskProjects.length === 0 ? (
            <Stack alignItems="center" py={4} gap={1}>
              <CheckCircle size={40} color="#15803D" />
              <Typography variant="body2" fontWeight={600}>No at-risk projects</Typography>
              <Typography variant="caption" color="text.secondary">All projects on track</Typography>
            </Stack>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px 110px 110px 90px', gap: 0 }}>
              {['PROJECT', 'CLIENT', 'PROGRESS', 'REVENUE', 'COST', 'MARGIN%'].map((h) => (
                <Typography key={h} variant="caption" color="text.secondary" fontWeight={600} sx={{ pb: 1, borderBottom: `1px solid ${dividerColor}` }}>
                  {h}
                </Typography>
              ))}
              {atRiskProjects.map((p) => {
                const rev = p.invoicedAmount ?? 0
                const cost = p.totalVendorPOValue ?? 0
                const margin = rev > 0 ? ((rev - cost) / rev * 100) : 0
                return (
                  <Box key={p.id} sx={{ display: 'contents' }}>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#E4DDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography variant="caption" fontWeight={700} color="#4A3AAF">{p.name[0]}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.projectCode}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{p.customerName}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <StatusBadge status="at_risk" label={p.progress} />
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">₹{formatCurrency(rev)}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">₹{formatCurrency(cost)}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: margin < 10 ? '#B91C1C' : 'text.primary' }}>
                        {margin.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </Paper>

        {/* ── Section 3: Financial Insights ─────────────────────────────────────── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
          {/* Revenue vs Cost Bar Chart */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Typography variant="h6" fontWeight={600}>Revenue vs Cost</Typography>
            <Typography variant="caption" color="text.secondary">Last 6 months, excl. GST</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyChartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dividerColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => '₹' + (v / 100000).toFixed(0) + 'L'} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `₹${formatCurrency(v)}`} />
                <Bar dataKey="revenue" name="Revenue" fill="#107E68" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Stack direction="row" gap={2} mt={1}>
              {[{ color: '#107E68', label: 'Revenue' }, { color: '#F59E0B', label: 'Cost' }].map((l) => (
                <Stack key={l.label} direction="row" alignItems="center" gap={0.75}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: l.color }} />
                  <Typography variant="caption">{l.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {/* Profitability Trend Line Chart */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Typography variant="h6" fontWeight={600}>Profitability Trend</Typography>
            <Typography variant="caption" color="text.secondary">Margin % over time</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyChartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dividerColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => v + '%'} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toFixed(1) + '%'} />
                <Line
                  dataKey="margin"
                  name="Margin %"
                  stroke="#107E68"
                  strokeWidth={2}
                  dot={{ fill: '#107E68', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* ── Section 4: Cash Flow + Position ──────────────────────────────────── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
          {/* Cash Flow Chart */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Typography variant="h6" fontWeight={600}>Cash Flow</Typography>
            <Typography variant="caption" color="text.secondary">Inflow (incl. GST) vs Outflow</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dividerColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => '₹' + (v / 100000).toFixed(0) + 'L'} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `₹${formatCurrency(v)}`} />
                <Bar dataKey="inflow" name="Inflow" fill="#DCFCE7" stroke="#15803D" strokeWidth={1} radius={[3, 3, 0, 0]} />
                <Bar dataKey="outflow" name="Outflow" fill="#FEE2E2" stroke="#B91C1C" strokeWidth={1} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* Cash Flow Position Summary */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Cash Flow Position</Typography>

            {/* Receivables */}
            <Typography variant="overline" color="primary" fontWeight={600} sx={{ fontSize: '10px', letterSpacing: '1px' }}>
              RECEIVABLES
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 0.5 }}>
              {[
                { label: 'Expected', value: kpi.receivablesExpected },
                { label: 'Received', value: kpi.receivablesReceived },
                { label: 'Outstanding', value: kpi.receivablesExpected - kpi.receivablesReceived, highlight: true },
              ].map((row) => (
                <Box key={row.label}>
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: row.highlight && (kpi.receivablesExpected - kpi.receivablesReceived) > 0 ? '#B45309' : 'text.primary' }}>
                    ₹{formatCurrency(row.value)}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ mt: 1.5, mb: 2 }} />

            {/* Payables */}
            <Typography variant="overline" color="primary" fontWeight={600} sx={{ fontSize: '10px', letterSpacing: '1px' }}>
              PAYABLES
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 0.5 }}>
              {[
                { label: 'Expected', value: kpi.payablesExpected },
                { label: 'Paid', value: kpi.payablesPaid },
                { label: 'Outstanding', value: kpi.payablesExpected - kpi.payablesPaid },
              ].map((row) => (
                <Box key={row.label}>
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                  <Typography variant="body2" fontWeight={600}>₹{formatCurrency(row.value)}</Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ mt: 1.5, mb: 2 }} />

            {/* Net Position */}
            <Box>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{ color: profitColor(kpi.receivablesTotal - kpi.payablesTotal) }}
              >
                ₹{formatCurrency(Math.abs(kpi.receivablesTotal - kpi.payablesTotal))}
              </Typography>
              <Typography variant="caption" color="text.secondary">Net cash position</Typography>
            </Box>
          </Paper>
        </Box>

        {/* ── Section 5: Outstanding Tables ────────────────────────────────────── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
          {/* Outstanding Receivables */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>Outstanding Receivables</Typography>
              <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/finance/receivables')}>
                View All →
              </Typography>
            </Stack>
            {outstandingReceivables.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 3 }}>
                No outstanding invoices
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px', gap: 0 }}>
                {['CLIENT', 'AMOUNT', 'DUE DATE', 'STATUS'].map((h) => (
                  <Typography key={h} variant="caption" color="text.secondary" fontWeight={600} sx={{ pb: 1, borderBottom: `1px solid ${dividerColor}` }}>
                    {h}
                  </Typography>
                ))}
                {outstandingReceivables.map((inv) => {
                  const proj = projects.find((p) => p.id === inv.projectId)
                  const isOverdue = inv.status === 'Overdue'
                  return (
                    <Box key={inv.id} sx={{ display: 'contents' }}>
                      <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={500}>{proj?.name ?? inv.projectId}</Typography>
                      </Box>
                      <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">₹{formatCurrency(inv.amount)}</Typography>
                      </Box>
                      <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: isOverdue ? '#B91C1C' : 'text.secondary' }}>{formatDate(inv.dueDate)}</Typography>
                      </Box>
                      <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                        <StatusBadge status={inv.status.toLowerCase() as StatusType} />
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Paper>

          {/* Outstanding Payables */}
          <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>Outstanding Payables</Typography>
              <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/finance/payables')}>
                View All →
              </Typography>
            </Stack>
            {outstandingPayables.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 3 }}>
                No outstanding payables
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px', gap: 0 }}>
                {['VENDOR', 'AMOUNT', 'DUE DATE', 'STATUS'].map((h) => (
                  <Typography key={h} variant="caption" color="text.secondary" fontWeight={600} sx={{ pb: 1, borderBottom: `1px solid ${dividerColor}` }}>
                    {h}
                  </Typography>
                ))}
                {outstandingPayables.map((vi) => (
                  <Box key={vi.id} sx={{ display: 'contents' }}>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={500}>{vi.vendorName}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">₹{formatCurrency(vi.amount)}</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    </Box>
                    <Box sx={{ py: 1, borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center' }}>
                      <StatusBadge status={vi.status.toLowerCase() as StatusType} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>

        {/* ── Section 6: Compliance Alerts ─────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Compliance Summary</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            {/* GST Summary */}
            <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2, p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <FileText size={16} color="#15803D" />
                <Typography variant="body2" fontWeight={600} color="#15803D">GST Summary</Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>₹{formatCurrency(kpi.gstCollected)}</Typography>
              <Typography variant="caption" color="text.secondary">
                Collected · ₹{formatCurrency(kpi.gstPaid)} paid · Net: ₹{formatCurrency(kpi.netGst)}
              </Typography>
              <Typography
                variant="caption"
                color="primary"
                sx={{ display: 'block', mt: 1, cursor: 'pointer' }}
                onClick={() => navigate('/finance/compliance')}
              >
                Go to Compliance →
              </Typography>
            </Box>

            {/* TDS Summary */}
            <Box sx={{ bgcolor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 2, p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <MinusCircle size={16} color="#B45309" />
                <Typography variant="body2" fontWeight={600} color="#B45309">TDS Summary</Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>₹{formatCurrency(kpi.tdsReceivable)}</Typography>
              <Typography variant="caption" color="text.secondary">
                Receivable from clients · ₹{formatCurrency(kpi.tdsPayable)} payable to government
              </Typography>
            </Box>

            {/* Alerts */}
            <Box sx={{ bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 2, p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <AlertTriangle size={16} color="#B91C1C" />
                <Typography variant="body2" fontWeight={600} color="#B91C1C">Pending Actions</Typography>
              </Stack>
              {kpi.overdueInvoices.length === 0 && kpi.overdueVendorInvoices.length === 0 ? (
                <Typography variant="caption" color="#15803D">All compliance items up to date</Typography>
              ) : (
                <Stack gap={0.5}>
                  {kpi.overdueInvoices.length > 0 && (
                    <Typography variant="caption" color="text.secondary">· {kpi.overdueInvoices.length} overdue client invoices</Typography>
                  )}
                  {kpi.overdueVendorInvoices.length > 0 && (
                    <Typography variant="caption" color="text.secondary">· {kpi.overdueVendorInvoices.length} overdue vendor payments</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">· GST filing due end of month</Typography>
                  <Typography variant="caption" color="text.secondary">· TDS return Q4 due</Typography>
                </Stack>
              )}
            </Box>
          </Box>
        </Paper>

        {/* ── Section 7: Activity Feed ──────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: `1px solid ${dividerColor}`, borderRadius: 2, p: 2.5, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>Recent Activity</Typography>
            <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
              View All →
            </Typography>
          </Stack>
          {activityFeed.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 4 }}>
              No recent activity
            </Typography>
          ) : (
            <Stack>
              {activityFeed.map((item, idx) => {
                const iconMap: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
                  invoice: { icon: <Receipt size={14} />, bg: '#E0F2FE', color: '#0369A1' },
                  vendor_invoice: { icon: <ShoppingCart size={14} />, bg: '#F3E8FF', color: '#7C3AED' },
                  expense: { icon: <Wallet size={14} />, bg: '#FEF3C7', color: '#B45309' },
                  change_request: { icon: <RefreshCw size={14} />, bg: '#DCFCE7', color: '#15803D' },
                }
                const cfg = iconMap[item.type]
                const isLast = idx === activityFeed.length - 1
                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    gap={2}
                    sx={{ py: 1.25, borderBottom: isLast ? 'none' : `1px solid ${dividerColor}` }}
                    alignItems="center"
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: cfg.bg,
                        color: cfg.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {cfg.icon}
                    </Box>
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={500} noWrap>{item.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.projectName} · {formatDate(item.date)}</Typography>
                    </Box>
                    <Stack alignItems="flex-end" gap={0.5}>
                      {item.amount != null && item.amount > 0 && (
                        <Typography variant="body2" fontWeight={600}>₹{formatCurrency(item.amount)}</Typography>
                      )}
                      <StatusBadge
                        status={item.status.toLowerCase().replace(/\s+/g, '_') as StatusType}
                        size="small"
                      />
                    </Stack>
                  </Stack>
                )
              })}
            </Stack>
          )}
        </Paper>

      </Box>

      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} />
    </Box>
  )
}

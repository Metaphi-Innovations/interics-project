import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  MenuItem,
  Select as MuiSelect,
  Chip,
  Divider,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import {
  Download,
  Plus,
  Receipt,
  Wallet,
  BarChart2,
  FileText,
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  MinusCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
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
  ReferenceLine,
} from 'recharts'
import { Button, Avatar, StatusBadge, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import CreateProjectModal from '@/pages/Projects/CreateProjectModal'
import { GlobalExpenseDrawer } from '@/components/expenses/GlobalExpenseDrawer'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchInvoices } from '@/slices/receivables/thunk'
import { fetchProjects } from '@/slices/projects/thunk'
import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type {
  VendorInvoice,
  Expense,
  Reimbursement,
} from '@/slices/live/reducer'
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getAvatarColor,
  toSlug,
} from '@/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = 'This Month' | 'This Quarter' | 'This Year' | 'All Time'
type StatusFilter = 'All Status' | 'Pitch' | 'Live' | 'Completed'
type ChartPeriod = 'Last 6 Months' | 'Last 3 Months' | 'This Year'

type TrendVariant = 'positive' | 'negative' | 'neutral'

interface MonthBucket {
  key: string
  label: string
  year: number
  month: number
}

interface ActivityRow {
  kind: 'invoice' | 'vendor_invoice' | 'expense' | 'reimbursement'
  id: string
  ts: number
  title: string
  subtitle: string
  relativeLabel: string
  avatarName: string
}

interface PendingRow {
  kind: 'expense' | 'reimbursement' | 'vendor_invoice'
  id: string
  title: string
  subtitle: string
  amount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function projectStatusToType(status: Project['status']): StatusType {
  switch (status) {
    case 'Live':
      return 'live'
    case 'Completed':
      return 'completed'
    case 'Cancelled':
      return 'cancelled'
    case 'Archived':
      return 'archived'
    case 'Pitch':
      return 'pitch'
    default:
      return 'inactive'
  }
}

function receivableStatusToType(s: ClientInvoice['status']): StatusType {
  switch (s) {
    case 'draft':
      return 'invoice_draft'
    case 'sent':
      return 'sent'
    case 'unpaid':
      return 'unpaid'
    case 'partially_paid':
      return 'partially_paid'
    case 'overdue':
      return 'overdue'
    case 'paid':
      return 'paid'
    default:
      return 'inactive'
  }
}

function vendorInvoiceLabel(s: VendorInvoice['status']): string {
  switch (s) {
    case 'pending':
      return 'Pending'
    case 'approved':
      return 'Approved'
    case 'paid':
      return 'Paid'
  }
}

function vendorInvoiceBadgeType(s: VendorInvoice['status']): StatusType {
  switch (s) {
    case 'pending':
      return 'pending'
    case 'approved':
      return 'in_progress'
    case 'paid':
      return 'active'
  }
}

/** Maps free-text progress to dashboard risk badge (revenue/cost use project financials). */
function progressToStatusBadge(progress: string): StatusType {
  const p = progress.toLowerCase()
  if (p.includes('payment') && p.includes('pend')) return 'payment_pending'
  if (p.includes('delay')) return 'delayed'
  if (p.includes('at risk') || p.includes('at_risk')) return 'at_risk'
  return 'inactive'
}

function isAtRiskProgress(progress: string): boolean {
  const p = progress.toLowerCase()
  return (
    (p.includes('at risk') || p.includes('at_risk')) ||
    p.includes('delay') ||
    (p.includes('payment') && p.includes('pend')) ||
    p.includes('payment_pending')
  )
}

function inDateRange(createdAt: string, range: DateRange): boolean {
  if (range === 'All Time') return true
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  const start = new Date()
  if (range === 'This Month') {
    start.setFullYear(now.getFullYear(), now.getMonth(), 1)
    start.setHours(0, 0, 0, 0)
    return d >= start && d <= now
  }
  if (range === 'This Quarter') {
    const q = Math.floor(now.getMonth() / 3)
    start.setFullYear(now.getFullYear(), q * 3, 1)
    start.setHours(0, 0, 0, 0)
    return d >= start && d <= now
  }
  if (range === 'This Year') {
    start.setFullYear(now.getFullYear(), 0, 1)
    start.setHours(0, 0, 0, 0)
    return d >= start && d <= now
  }
  return true
}

function getMonthBuckets(count: number): MonthBucket[] {
  const now = new Date()
  const arr: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    arr.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return arr
}

function inCalendarMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d.getFullYear() === year && d.getMonth() === month
}

function paidInvoiceCashMonthIso(inv: ClientInvoice): string | null {
  if (inv.status !== 'paid') return null
  const payDates = inv.payments.map((p) => p.date).filter(Boolean).sort()
  const last =
    payDates.length > 0
      ? payDates[payDates.length - 1]
      : inv.updatedAt ?? inv.invoiceDate
  return last ?? null
}

function sortProjectsByIdDesc(list: Project[]): Project[] {
  return [...list].sort((a, b) => {
    const na = parseInt(String(a.id).replace(/\D/g, ''), 10)
    const nb = parseInt(String(b.id).replace(/\D/g, ''), 10)
    if (!Number.isNaN(na) && !Number.isNaN(nb) && nb !== na) return nb - na
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true })
  })
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 3) + '...'
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtext,
  trendVariant,
  trendText,
  trendArrow,
  valueColor,
  onClick,
  theme,
}: {
  label: string
  value: string
  subtext: string
  trendVariant: TrendVariant
  trendText: string
  /** Override arrow for negative cost-up = bad (↑) vs default negative (↓). */
  trendArrow?: 'up' | 'down'
  valueColor?: string
  onClick: () => void
  theme: ReturnType<typeof useTheme>
}) {
  const trendBg =
    trendVariant === 'positive'
      ? alpha(theme.palette.success.main, 0.12)
      : trendVariant === 'negative'
        ? alpha(theme.palette.error.main, 0.12)
        : theme.palette.action.hover
  const trendFg =
    trendVariant === 'positive'
      ? theme.palette.success.main
      : trendVariant === 'negative'
        ? theme.palette.error.main
        : theme.palette.text.secondary

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        cursor: 'pointer',
        '&:hover': {
          boxShadow: theme.shadows[2],
          borderColor: 'primary.main',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={500}
          sx={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
            bgcolor: trendBg,
            color: trendFg,
          }}
        >
          <Typography sx={{ fontSize: 10, fontWeight: 700 }}>
            {trendVariant === 'neutral'
              ? trendText
              : trendVariant === 'positive'
                ? `↑ ${trendText}`
                : trendArrow === 'up'
                  ? `↑ ${trendText}`
                  : `↓ ${trendText}`}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ lineHeight: 1.1, mb: 0.5, color: valueColor ?? 'text.primary' }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {subtext}
      </Typography>
    </Paper>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const chartHeight = useMediaQuery(theme.breakpoints.down('md')) ? 180 : 220

  const clientInvoices = useAppSelector((s) => s.receivables.items)
  const projects = useAppSelector((s) => s.projects.items)

  const [dateRange, setDateRange] = useState<DateRange>('This Month')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All Status')
  const [clientFilter, setClientFilter] = useState<string>('All Clients')
  const [pmFilter, setPmFilter] = useState<string>('All Managers')
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('Last 6 Months')
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [liveDataTick, setLiveDataTick] = useState(0)

  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])

  useEffect(() => {
    void dispatch(fetchInvoices({}))
    void dispatch(fetchProjects({}))
  }, [dispatch])

  useEffect(() => {
    if (projects.length === 0) {
      setVendorInvoices([])
      setExpenses([])
      setReimbursements([])
      return
    }
    let cancelled = false
    void (async () => {
      const results = await Promise.all(
        projects.map(async (p) => {
          const base = `/api/projects/${p.id}`
          const [vr, er, rr] = await Promise.all([
            fetch(`${base}/vendor-invoices`).then((r) => (r.ok ? r.json() : [])),
            fetch(`${base}/expenses`).then((r) => (r.ok ? r.json() : [])),
            fetch(`${base}/reimbursements`).then((r) => (r.ok ? r.json() : [])),
          ])
          return {
            v: vr as VendorInvoice[],
            e: er as Expense[],
            r: rr as Reimbursement[],
          }
        }),
      )
      if (cancelled) return
      const vi: VendorInvoice[] = []
      const ex: Expense[] = []
      const rmb: Reimbursement[] = []
      for (const r of results) {
        if (Array.isArray(r.v)) vi.push(...r.v)
        if (Array.isArray(r.e)) ex.push(...r.e)
        if (Array.isArray(r.r)) rmb.push(...r.r)
      }
      setVendorInvoices(vi)
      setExpenses(ex)
      setReimbursements(rmb)
    })()
    return () => {
      cancelled = true
    }
  }, [projects, liveDataTick])

  const uniqueClients = useMemo(() => {
    const names = new Set(projects.map((p) => p.customerName).filter(Boolean))
    return Array.from(names)
  }, [projects])

  const uniquePMs = useMemo(() => {
    const names = new Set(projects.map((p) => p.projectManager).filter(Boolean))
    return Array.from(names)
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (!inDateRange(p.createdAt, dateRange)) return false
      if (statusFilter !== 'All Status' && p.status !== statusFilter) return false
      if (clientFilter !== 'All Clients' && p.customerName !== clientFilter) return false
      if (pmFilter !== 'All Managers' && p.projectManager !== pmFilter) return false
      return true
    })
  }, [projects, dateRange, statusFilter, clientFilter, pmFilter])

  const projectIdsForScope = useMemo(() => {
    if (projects.length === 0) return null as Set<string> | null
    return new Set(filteredProjects.map((p) => p.id))
  }, [projects.length, filteredProjects])

  const scopedInvoices = useMemo(() => {
    if (projectIdsForScope === null) return clientInvoices
    if (projectIdsForScope.size === 0) return []
    return clientInvoices.filter((inv) => projectIdsForScope.has(inv.projectId))
  }, [clientInvoices, projectIdsForScope])

  const scopedVendorInvoices = useMemo(() => {
    if (projectIdsForScope === null) return vendorInvoices
    if (projectIdsForScope.size === 0) return []
    return vendorInvoices.filter((v) => projectIdsForScope.has(v.projectId))
  }, [vendorInvoices, projectIdsForScope])

  const scopedExpenses = useMemo(() => {
    if (projectIdsForScope === null) return expenses
    if (projectIdsForScope.size === 0) return []
    return expenses.filter((e) => projectIdsForScope.has(e.projectId))
  }, [expenses, projectIdsForScope])

  const scopedReimbursements = useMemo(() => {
    if (projectIdsForScope === null) return reimbursements
    if (projectIdsForScope.size === 0) return []
    return reimbursements.filter((c) => projectIdsForScope.has(c.projectId))
  }, [reimbursements, projectIdsForScope])

  const monthCount = useMemo(() => {
    if (chartPeriod === 'Last 3 Months') return 3
    if (chartPeriod === 'This Year') return 12
    return 6
  }, [chartPeriod])

  const monthBuckets = useMemo(() => getMonthBuckets(monthCount), [monthCount])

  const monthlySeries = useMemo(() => {
    return monthBuckets.map((b) => {
      const revenue = scopedInvoices
        .filter((inv) => inCalendarMonth(inv.createdAt, b.year, b.month))
        .reduce((s, inv) => s + (inv.baseAmount ?? 0), 0)
      const vendorCost = scopedVendorInvoices
        .filter((v) => inCalendarMonth(v.invoiceDate, b.year, b.month))
        .reduce((s, v) => s + (v.baseAmount ?? 0), 0)
      const expCost = scopedExpenses
        .filter((e) => inCalendarMonth(e.date, b.year, b.month))
        .reduce((s, e) => s + (e.amount ?? 0), 0)
      const cost = vendorCost + expCost
      return {
        month: b.label,
        revenue,
        cost,
        margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      }
    })
  }, [monthBuckets, scopedInvoices, scopedVendorInvoices, scopedExpenses])

  const cashFlowData = useMemo(() => {
    return monthBuckets.map((b) => {
      let inflow = 0
      for (const inv of scopedInvoices) {
        if (inv.status !== 'paid') continue
        const iso = paidInvoiceCashMonthIso(inv)
        if (!iso || !inCalendarMonth(iso, b.year, b.month)) continue
        const base = inv.baseAmount ?? 0
        const gst = inv.gstAmount ?? 0
        const tds = inv.tdsDeducted ?? 0
        inflow += base + gst - tds
      }
      const vendorOut = scopedVendorInvoices
        .filter((v) => v.invoiceDate && inCalendarMonth(v.invoiceDate, b.year, b.month))
        .reduce((s, v) => s + (v.baseAmount ?? 0), 0)
      const expOut = scopedExpenses
        .filter((e) => inCalendarMonth(e.date, b.year, b.month))
        .reduce((s, e) => s + (e.amount ?? 0), 0)
      return { month: b.label, inflow, outflow: vendorOut + expOut }
    })
  }, [monthBuckets, scopedInvoices, scopedVendorInvoices, scopedExpenses])

  const totalProjects = filteredProjects.length
  const activeProjectCount = useMemo(
    () => filteredProjects.filter((p) => p.status === 'Live').length,
    [filteredProjects],
  )
  const completedCancelledCount = useMemo(
    () =>
      filteredProjects.filter((p) => p.status === 'Completed' || p.status === 'Cancelled')
        .length,
    [filteredProjects],
  )

  const pipelineValue = useMemo(() => {
    const sum = filteredProjects
      .filter((p) => p.status === 'Pitch')
      .reduce((s, p) => s + (p.projectValue ?? 0), 0)
    return sum > 0 ? sum : 4250000
  }, [filteredProjects])

  const totalRevenue = useMemo(
    () => scopedInvoices.reduce((s, inv) => s + (inv.baseAmount ?? 0), 0),
    [scopedInvoices],
  )

  const pendingInvoiceRows = useMemo(
    () => scopedInvoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue'),
    [scopedInvoices],
  )

  const pendingInvoiceAmount = useMemo(
    () => pendingInvoiceRows.reduce((s, inv) => s + (inv.baseAmount ?? 0), 0),
    [pendingInvoiceRows],
  )

  const totalCost = useMemo(() => {
    const v = scopedVendorInvoices.reduce((s, x) => s + (x.baseAmount ?? 0), 0)
    const e = scopedExpenses.reduce((s, x) => s + (x.amount ?? 0), 0)
    return v + e
  }, [scopedVendorInvoices, scopedExpenses])

  const avgMargin = useMemo(() => {
    if (totalRevenue === 0) return 28
    return Math.round(((totalRevenue - totalCost) / totalRevenue) * 100)
  }, [totalRevenue, totalCost])

  const marginColor = useMemo(() => {
    if (avgMargin > 20) return theme.palette.success.main
    if (avgMargin >= 10) return theme.palette.warning.main
    return theme.palette.error.main
  }, [avgMargin, theme])

  const livePitchSum = useMemo(
    () =>
      filteredProjects
        .filter((p) => p.status === 'Pitch')
        .reduce((s, p) => s + (p.projectValue ?? 0), 0),
    [filteredProjects],
  )
  const pipelineDisplayIsStatic = livePitchSum === 0

  const statusCounts = useMemo(() => {
    let liveCount = 0
    let pitchCount = 0
    let completedCount = 0
    let cancelledCount = 0
    let archivedCount = 0
    for (const p of filteredProjects) {
      if (p.status === 'Live') liveCount++
      else if (p.status === 'Pitch') pitchCount++
      else if (p.status === 'Completed') completedCount++
      else if (p.status === 'Cancelled') cancelledCount++
      else if (p.status === 'Archived') archivedCount++
    }
    return { liveCount, pitchCount, completedCount, cancelledCount, archivedCount }
  }, [filteredProjects])

  const statusData = useMemo(() => {
    const { liveCount, pitchCount, completedCount, cancelledCount, archivedCount } = statusCounts
    return [
      { name: 'Live', value: liveCount, color: theme.palette.success.main },
      { name: 'Pitch', value: pitchCount, color: theme.palette.warning.main },
      { name: 'Completed', value: completedCount, color: theme.palette.info.main },
      { name: 'Cancelled', value: cancelledCount, color: theme.palette.error.main },
      { name: 'Archived', value: archivedCount, color: theme.palette.text.secondary },
    ].filter((d) => d.value > 0)
  }, [statusCounts, theme])

  const recentProjects = useMemo(
    () => sortProjectsByIdDesc(filteredProjects).slice(0, 5),
    [filteredProjects],
  )

  const atRiskProjects = useMemo(
    () => filteredProjects.filter((p) => isAtRiskProgress(p.progress)),
    [filteredProjects],
  )

  const outstandingReceivables = useMemo(
    () => pendingInvoiceRows.slice(0, 5),
    [pendingInvoiceRows],
  )

  const outstandingPayables = useMemo(
    () =>
      scopedVendorInvoices
        .filter((v) => v.status === 'pending' || v.status === 'approved')
        .slice(0, 5),
    [scopedVendorInvoices],
  )

  const totalGstCollected = useMemo(
    () => scopedInvoices.reduce((s, inv) => s + (inv.gstAmount ?? 0), 0),
    [scopedInvoices],
  )
  const vendorGstPaid = 0
  const netGst = totalGstCollected - vendorGstPaid

  const totalTdsReceivable = useMemo(
    () => scopedInvoices.reduce((s, inv) => s + (inv.tdsDeducted ?? 0), 0),
    [scopedInvoices],
  )
  const totalVendorTds = useMemo(
    () => scopedVendorInvoices.reduce((s, v) => s + (v.tdsAmount ?? 0), 0),
    [scopedVendorInvoices],
  )

  const overdueClientCount = useMemo(
    () => scopedInvoices.filter((inv) => inv.status === 'overdue').length,
    [scopedInvoices],
  )
  const overdueVendorCount = useMemo(
    () =>
      scopedVendorInvoices.filter((v) => v.status === 'pending' || v.status === 'approved').length,
    [scopedVendorInvoices],
  )

  const activityRows = useMemo((): ActivityRow[] => {
    const rows: ActivityRow[] = []
    for (const inv of scopedInvoices) {
      rows.push({
        kind: 'invoice',
        id: inv.id,
        ts: new Date(inv.createdAt).getTime(),
        title: 'New invoice created',
        subtitle: `${inv.invoiceNo} · ${inv.projectName}`,
        relativeLabel: formatRelativeTime(inv.createdAt),
        avatarName: inv.clientName || 'UN',
      })
    }
    for (const v of scopedVendorInvoices) {
      if (!v.invoiceDate) continue
      rows.push({
        kind: 'vendor_invoice',
        id: v.id,
        ts: new Date(v.invoiceDate).getTime(),
        title: 'Vendor invoice received',
        subtitle: `${v.invoiceNumber ?? v.milestoneName} · ${v.vendorName}`,
        relativeLabel: formatRelativeTime(v.invoiceDate),
        avatarName: v.vendorName || 'UN',
      })
    }
    for (const e of scopedExpenses) {
      rows.push({
        kind: 'expense',
        id: e.id,
        ts: new Date(e.date).getTime(),
        title: 'Expense recorded',
        subtitle: e.description.slice(0, 48),
        relativeLabel: formatRelativeTime(e.date),
        avatarName: e.vendorName ?? 'Expense',
      })
    }
    for (const r of scopedReimbursements) {
      rows.push({
        kind: 'reimbursement',
        id: r.id,
        ts: new Date(r.date).getTime(),
        title: 'Reimbursement logged',
        subtitle: `${r.description.slice(0, 36)} · ${r.vendorName}`,
        relativeLabel: formatRelativeTime(r.date),
        avatarName: r.vendorName || 'UN',
      })
    }
    return rows.sort((a, b) => b.ts - a.ts).slice(0, 10)
  }, [scopedInvoices, scopedVendorInvoices, scopedExpenses, scopedReimbursements])

  const pendingItems = useMemo((): PendingRow[] => {
    const rows: PendingRow[] = []
    for (const e of scopedExpenses) {
      if (e.status !== 'pending') continue
      rows.push({
        kind: 'expense',
        id: e.id,
        title: truncate(e.description, 35),
        subtitle: e.vendorName ?? 'Expense',
        amount: e.amount ?? 0,
      })
    }
    for (const r of scopedReimbursements) {
      if (r.status !== 'pending') continue
      rows.push({
        kind: 'reimbursement',
        id: r.id,
        title: truncate(r.description, 35),
        subtitle: r.vendorName,
        amount: r.amount ?? 0,
      })
    }
    for (const v of scopedVendorInvoices) {
      if (v.status !== 'pending' && v.status !== 'approved') continue
      rows.push({
        kind: 'vendor_invoice',
        id: v.id,
        title: truncate(v.invoiceNumber ?? v.milestoneName, 35),
        subtitle: v.vendorName,
        amount: v.baseAmount ?? 0,
      })
    }
    return rows
  }, [scopedExpenses, scopedReimbursements, scopedVendorInvoices])

  const totalReceivableExpected = useMemo(
    () =>
      scopedInvoices.reduce(
        (s, inv) => s + (inv.baseAmount ?? 0) + (inv.gstAmount ?? 0),
        0,
      ),
    [scopedInvoices],
  )

  const totalReceived = useMemo(
    () =>
      scopedInvoices
        .filter((inv) => inv.status === 'paid')
        .reduce(
          (s, inv) =>
            s +
            (inv.baseAmount ?? 0) +
            (inv.gstAmount ?? 0) -
            (inv.tdsDeducted ?? 0),
          0,
        ),
    [scopedInvoices],
  )

  const receivablesOutstanding = totalReceivableExpected - totalReceived

  const totalPayableExpected = useMemo(
    () =>
      scopedVendorInvoices.reduce((s, v) => s + (v.baseAmount ?? 0), 0),
    [scopedVendorInvoices],
  )

  const totalVendorPaid = useMemo(
    () =>
      scopedVendorInvoices
        .filter((v) => v.status === 'paid')
        .reduce((s, v) => s + (v.netPayable ?? 0), 0),
    [scopedVendorInvoices],
  )

  const payablesOutstanding = totalPayableExpected - totalVendorPaid
  const netPosition = receivablesOutstanding - payablesOutstanding

  const tableHeaderBg = theme.palette.background.default
  const dividerColor = theme.palette.divider
  const tooltipContentStyle = useMemo(
    () => ({
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 8,
      fontSize: 12,
    }),
    [theme],
  )

  const handleReset = useCallback(() => {
    setDateRange('This Month')
    setStatusFilter('All Status')
    setClientFilter('All Clients')
    setPmFilter('All Managers')
  }, [])

  const ru = useCallback((n: number) => `₹${formatCurrency(n)}`, [])

  const yAxisTick = useCallback((v: number) => {
    if (v === 0) return '₹0'
    return `₹${(v / 100000).toFixed(0)}L`
  }, [])

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100%',
        maxWidth: 1400,
        mx: 'auto',
        px: 3,
        py: 3,
      }}
    >
      <CreateProjectModal
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
      />

      <GlobalExpenseDrawer
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onSuccess={() => setLiveDataTick((t) => t + 1)}
      />

      {/* ROW 0 — Page Header */}
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
            Welcome back. Here&apos;s what&apos;s happening today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="sm"
            startIcon={<Download size={14} />}
            sx={{
              borderColor: 'divider',
              color: 'text.secondary',
              fontWeight: 500,
              height: 34,
            }}
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
            + New Project
          </Button>
        </Box>
      </Box>

      {/* ROW 1 — Filter Bar */}
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            sx={{ minWidth: 110, fontSize: 12, height: 32 }}
          >
            {(['All Status', 'Pitch', 'Live', 'Completed'] as StatusFilter[]).map((v) => (
              <MenuItem key={v} value={v} sx={{ fontSize: 12 }}>
                {v}
              </MenuItem>
            ))}
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
            value={pmFilter}
            onChange={(e) => setPmFilter(e.target.value)}
            sx={{ minWidth: 150, fontSize: 12, height: 32 }}
          >
            <MenuItem value="All Managers" sx={{ fontSize: 12 }}>
              All Managers
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

      {/* ROW 2 — Quick Action Tiles */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        {(
          [
            {
              label: 'Create Invoice',
              icon: <Receipt size={22} color="#0369A1" />,
              bg: '#DBEAFE',
              onClick: () => navigate('/finance/receivables'),
            },
            {
              label: 'Issue PO',
              icon: <FileText size={22} color="#7C3AED" />,
              bg: '#EDE9FE',
              onClick: () => navigate('/projects'),
            },
            {
              label: 'Add Expense',
              icon: <Wallet size={22} color="#B45309" />,
              bg: '#FEF3C7',
              onClick: () => setAddExpenseOpen(true),
            },
            {
              label: 'New Customer',
              icon: <UserPlus size={22} color="#15803D" />,
              bg: '#DCFCE7',
              onClick: () => navigate('/customers'),
            },
          ] as const
        ).map(({ label, icon, bg, onClick }) => (
          <Paper
            key={label}
            elevation={0}
            onClick={onClick}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              cursor: 'pointer',
              height: 88,
              transition: 'all 0.15s',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
            <Typography variant="body2" fontWeight={500} color="text.secondary">
              {label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* ROW 3 — KPI Group A: Projects */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        PROJECT OVERVIEW
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        <KpiCard
          theme={theme}
          label="TOTAL PROJECTS"
          value={String(totalProjects)}
          subtext="Across all statuses"
          trendVariant="neutral"
          trendText="+1"
          onClick={() => navigate('/projects')}
        />
        <KpiCard
          theme={theme}
          label="ACTIVE PROJECTS"
          value={String(activeProjectCount)}
          subtext="Currently in execution"
          trendVariant="positive"
          trendText="2%"
          onClick={() => navigate('/projects')}
        />
        <KpiCard
          theme={theme}
          label="COMPLETED / CANCELLED"
          value={String(completedCancelledCount)}
          subtext="Closed projects"
          trendVariant="neutral"
          trendText="0%"
          onClick={() => navigate('/projects')}
        />
        <KpiCard
          theme={theme}
          label="PIPELINE VALUE"
          value={ru(pipelineValue)}
          subtext={
            pipelineDisplayIsStatic
              ? 'Pitch stage, excl. GST (sample)'
              : 'Pitch stage, excl. GST'
          }
          trendVariant="positive"
          trendText="12%"
          onClick={() => navigate('/projects')}
        />
      </Box>

      {/* ROW 4 — KPI Group B: Financials */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        FINANCIAL OVERVIEW
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <KpiCard
          theme={theme}
          label="TOTAL REVENUE"
          value={ru(totalRevenue)}
          subtext="Billed to clients, excl. GST"
          trendVariant="positive"
          trendText="12%"
          onClick={() => navigate('/finance/receivables')}
        />
        <KpiCard
          theme={theme}
          label="PENDING INVOICES"
          value={ru(pendingInvoiceAmount)}
          subtext={`${pendingInvoiceRows.length} invoices outstanding`}
          trendVariant="negative"
          trendText="5%"
          valueColor={pendingInvoiceAmount > 0 ? theme.palette.warning.main : undefined}
          onClick={() => navigate('/finance/receivables')}
        />
        <KpiCard
          theme={theme}
          label="TOTAL COST"
          value={ru(totalCost)}
          subtext="Vendor + expenses, excl. GST"
          trendVariant="negative"
          trendText="8%"
          trendArrow="up"
          onClick={() => navigate('/finance/payables')}
        />
        <KpiCard
          theme={theme}
          label="AVG MARGIN"
          value={`${avgMargin}%`}
          subtext="Net profit margin"
          trendVariant="positive"
          trendText="1.5%"
          valueColor={marginColor}
          onClick={() => navigate('/reports')}
        />
      </Box>

      {/* ROW 5 — Project Snapshot */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        PROJECT SNAPSHOT
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Status Distribution
          </Typography>
          <Box sx={{ position: 'relative', height: chartHeight }}>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={() => navigate('/projects')}
                    style={{ cursor: 'pointer' }}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  height: chartHeight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  No data
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h5" fontWeight={700}>
                {totalProjects}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Projects
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
            {statusData.map((d) => (
              <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }}
                />
                <Typography variant="caption">
                  {d.name} ({d.value})
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.5,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Recent Projects
            </Typography>
            <Typography
              variant="body2"
              color="primary.main"
              fontWeight={500}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/projects')}
            >
              View All →
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 130px 90px 100px 90px',
              px: 1,
              py: 0.75,
              bgcolor: tableHeaderBg,
              borderRadius: 1,
              mb: 0.5,
            }}
          >
            {['PROJECT', 'CLIENT', 'VALUE', 'STATUS', 'MARGIN'].map((col) => (
              <Typography
                key={col}
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600 }}
              >
                {col}
              </Typography>
            ))}
          </Box>
          {recentProjects.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', py: 4 }}
            >
              No projects yet
            </Typography>
          ) : (
            recentProjects.map((project, idx) => (
              <Box
                key={project.id}
                onClick={() => navigate('/projects/' + toSlug(project.name))}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 130px 90px 100px 90px',
                  px: 1,
                  py: 1,
                  alignItems: 'center',
                  borderBottom:
                    idx < recentProjects.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {project.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {project.type}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {project.customerName}
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  ₹{formatCurrency(project.projectValue ?? 0)}
                </Typography>
                <StatusBadge status={projectStatusToType(project.status)} size="small" />
                <Typography variant="caption">—</Typography>
              </Box>
            ))
          )}
        </Paper>
      </Box>

      {/* ROW 6 — At-Risk Projects */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 2.5,
          mb: 2.5,
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: atRiskProjects.length ? 1.5 : 0 }}>
          At-Risk Projects
        </Typography>
        {atRiskProjects.length === 0 ? (
          <Box
            sx={{
              py: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CheckCircle size={36} color={theme.palette.success.main} />
            <Typography variant="body2" fontWeight={500}>
              No at-risk projects
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All projects are on track
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 130px 110px 110px 90px',
                px: 1,
                py: 0.75,
                bgcolor: tableHeaderBg,
                borderRadius: 1,
                mb: 0.5,
              }}
            >
              {['PROJECT', 'CLIENT', 'PROGRESS', 'REVENUE', 'COST', 'STATUS'].map((col) => (
                <Typography
                  key={col}
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600 }}
                >
                  {col}
                </Typography>
              ))}
            </Box>
            {atRiskProjects.map((project, idx) => {
              const av = getAvatarColor(project.name)
              return (
                <Box
                  key={project.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 130px 110px 110px 90px',
                    px: 1,
                    py: 1,
                    alignItems: 'center',
                    borderBottom: idx < atRiskProjects.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      name={project.name}
                      size="sm"
                      color={av.bg}
                      sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 600 }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {project.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {project.projectCode}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {project.customerName}
                  </Typography>
                  <StatusBadge status={progressToStatusBadge(project.progress)} size="small" />
                  <Typography variant="body2">{ru(project.projectValue ?? 0)}</Typography>
                  {/* Cost: paid vendor spend to date (excl. GST in model). */}
                  <Typography variant="body2">{ru(project.paidVendorAmount ?? 0)}</Typography>
                  <StatusBadge status={projectStatusToType(project.status)} size="small" />
                </Box>
              )
            })}
          </>
        )}
      </Paper>

      {/* ROW 7 — Financial Insights */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        FINANCIAL INSIGHTS
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Revenue vs Cost
            </Typography>
            <MuiSelect
              size="small"
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value as ChartPeriod)}
              sx={{ fontSize: 12, height: 28, minWidth: 130 }}
            >
              {(['Last 6 Months', 'Last 3 Months', 'This Year'] as ChartPeriod[]).map((v) => (
                <MenuItem key={v} value={v} sx={{ fontSize: 12 }}>
                  {v}
                </MenuItem>
              ))}
            </MuiSelect>
          </Box>
          <Box sx={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlySeries}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.error.light} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={theme.palette.error.light} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={dividerColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTick}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  formatter={(value: number, name: string) => [
                    ru(value),
                    name,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke={theme.palette.error.light}
                  strokeWidth={2}
                  fill="url(#costGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, mt: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 3, bgcolor: 'primary.main', borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Revenue
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 3, bgcolor: 'error.light', borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Cost
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Profitability Trend
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Net margin % over time
            </Typography>
          </Box>
          <Box sx={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlySeries}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={dividerColor}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margin']}
                />
                <ReferenceLine y={0} stroke={dividerColor} strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="margin"
                  name="Margin %"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ fill: theme.palette.primary.main, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>

      {/* ROW 8 — Cash Flow */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        CASH FLOW
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            Cash Flow Overview
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Monthly inflow (incl. GST) vs outflow
          </Typography>
          <Box sx={{ height: chartHeight - 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={dividerColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTick}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  formatter={(value: number, name: string) => [ru(value), name]}
                />
                <Bar
                  dataKey="inflow"
                  name="Inflow"
                  fill={alpha(theme.palette.success.main, 0.2)}
                  stroke={theme.palette.success.main}
                  strokeWidth={1}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="outflow"
                  name="Outflow"
                  fill={alpha(theme.palette.error.main, 0.2)}
                  stroke={theme.palette.error.main}
                  strokeWidth={1}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 3, bgcolor: 'success.main', borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Inflow
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 3, bgcolor: 'error.main', borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Outflow
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Cash Position
          </Typography>
          <Typography
            variant="overline"
            fontWeight={600}
            color="primary"
            sx={{ letterSpacing: 0.5 }}
          >
            RECEIVABLES
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mt: 1,
              mb: 1.5,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Expected
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ru(totalReceivableExpected)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Received
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ru(totalReceived)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Outstanding
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                color={receivablesOutstanding > 0 ? 'warning.main' : 'text.primary'}
              >
                {ru(receivablesOutstanding)}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Typography
            variant="overline"
            fontWeight={600}
            color="primary"
            sx={{ letterSpacing: 0.5 }}
          >
            PAYABLES
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mt: 1,
              mb: 1.5,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Expected
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ru(totalPayableExpected)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Paid
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ru(totalVendorPaid)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Outstanding
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                color={payablesOutstanding > 0 ? 'warning.main' : 'text.primary'}
              >
                {ru(payablesOutstanding)}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1.5,
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              Net Cash Position
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ color: netPosition >= 0 ? 'success.main' : 'error.main' }}
            >
              {ru(Math.abs(netPosition))}
              {netPosition < 0 ? ' deficit' : ' surplus'}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* ROW 9 — Outstanding */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        OUTSTANDING
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.5,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Outstanding Receivables
            </Typography>
            <Typography
              variant="body2"
              color="primary.main"
              fontWeight={500}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/finance/receivables')}
            >
              View All →
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 90px 80px',
              px: 1,
              py: 0.75,
              bgcolor: tableHeaderBg,
              borderRadius: 1,
              mb: 0.5,
            }}
          >
            {['CLIENT', 'AMOUNT', 'DUE DATE', 'STATUS'].map((col) => (
              <Typography
                key={col}
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600 }}
              >
                {col}
              </Typography>
            ))}
          </Box>
          {outstandingReceivables.length === 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', py: 3 }}
            >
              No outstanding receivables
            </Typography>
          ) : (
            outstandingReceivables.map((inv, idx) => {
              const overdue = inv.status === 'overdue'
              return (
                <Box
                  key={inv.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 90px 80px',
                    px: 1,
                    py: 1,
                    alignItems: 'center',
                    borderBottom:
                      idx < outstandingReceivables.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {inv.projectName || inv.clientName}
                  </Typography>
                  <Typography variant="body2">{ru(inv.baseAmount ?? 0)}</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: overdue ? '#B91C1C' : 'text.secondary' }}
                  >
                    {formatDate(inv.dueDate)}
                  </Typography>
                  <StatusBadge status={receivableStatusToType(inv.status)} size="small" />
                </Box>
              )
            })
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.5,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Outstanding Payables
            </Typography>
            <Typography
              variant="body2"
              color="primary.main"
              fontWeight={500}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/finance/payables')}
            >
              View All →
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 90px 80px',
              px: 1,
              py: 0.75,
              bgcolor: tableHeaderBg,
              borderRadius: 1,
              mb: 0.5,
            }}
          >
            {['VENDOR', 'AMOUNT', 'DUE DATE', 'STATUS'].map((col) => (
              <Typography
                key={col}
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600 }}
              >
                {col}
              </Typography>
            ))}
          </Box>
          {outstandingPayables.length === 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', py: 3 }}
            >
              No outstanding payables
            </Typography>
          ) : (
            outstandingPayables.map((v, idx) => (
              <Box
                key={v.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 110px 90px 80px',
                  px: 1,
                  py: 1,
                  alignItems: 'center',
                  borderBottom:
                    idx < outstandingPayables.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  {v.vendorName}
                </Typography>
                <Typography variant="body2">{ru(v.baseAmount ?? 0)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(v.invoiceDate ?? v.dueDate ?? null)}
                </Typography>
                <StatusBadge
                  status={vendorInvoiceBadgeType(v.status)}
                  label={vendorInvoiceLabel(v.status)}
                  size="small"
                />
              </Box>
            ))
          )}
        </Paper>
      </Box>

      {/* ROW 10 — Compliance */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1 }}
      >
        COMPLIANCE
      </Typography>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 2.5,
          mb: 2.5,
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Compliance Summary
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FileText size={16} color="#15803D" />
              <Typography variant="body2" fontWeight={600} sx={{ color: '#15803D' }}>
                GST Summary
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
              {ru(totalGstCollected)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Collected · {ru(vendorGstPaid)} input GST paid
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Net payable:{' '}
              <Box
                component="span"
                sx={{ color: netGst > 0 ? '#B45309' : 'text.primary', fontWeight: 600 }}
              >
                {ru(netGst)}
              </Box>
            </Typography>
            <Box
              sx={{
                mt: 1.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                GST filing due end of month
              </Typography>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate('/finance/compliance/filing-summary')}
              >
                Go to GST →
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <MinusCircle size={16} color="#B45309" />
              <Typography variant="body2" fontWeight={600} sx={{ color: '#B45309' }}>
                TDS Summary
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color: '#B45309' }}>
              {ru(totalTdsReceivable)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Receivable from clients · {ru(totalVendorTds)} payable to govt
            </Typography>
            <Box
              sx={{
                mt: 1.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                TDS return Q4 due
              </Typography>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate('/finance/compliance/filing-summary')}
              >
                Go to TDS →
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: overdueClientCount + overdueVendorCount > 0 ? '#FEF2F2' : '#F0FDF4',
              border:
                overdueClientCount + overdueVendorCount > 0
                  ? '1px solid #FECACA'
                  : '1px solid #BBF7D0',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {overdueClientCount + overdueVendorCount > 0 ? (
                <AlertTriangle size={16} color="#B91C1C" />
              ) : (
                <CheckCircle size={16} color="#15803D" />
              )}
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  color:
                    overdueClientCount + overdueVendorCount > 0 ? '#B91C1C' : '#15803D',
                }}
              >
                {overdueClientCount + overdueVendorCount > 0
                  ? 'Pending Actions'
                  : 'All Clear'}
              </Typography>
            </Box>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {overdueClientCount > 0 && (
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <AlertCircle size={12} color="#B91C1C" />
                  <Typography variant="caption">
                    {overdueClientCount} overdue client invoice
                    {overdueClientCount > 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
              {overdueVendorCount > 0 && (
                <Typography variant="caption">
                  {overdueVendorCount} overdue vendor payment
                  {overdueVendorCount > 1 ? 's' : ''}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                • GST filing due end of month
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • TDS return Q4 due
              </Typography>
              {overdueClientCount + overdueVendorCount === 0 && (
                <Typography variant="caption" sx={{ color: '#15803D' }}>
                  No overdue items. All compliance up to date.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ROW 11 — Activity + Approvals */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' },
          gap: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Recent Activities
            </Typography>
            <Typography
              variant="body2"
              color="primary.main"
              fontWeight={500}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/audit-logs')}
            >
              View All
            </Typography>
          </Box>
          {activityRows.length === 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', py: 4 }}
            >
              No recent activity
            </Typography>
          ) : (
            activityRows.map((row, idx) => {
              const av = getAvatarColor(row.avatarName)
              return (
                <Box
                  key={`${row.kind}-${row.id}`}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    py: 1.25,
                    borderBottom: idx < activityRows.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Avatar
                    name={row.avatarName}
                    size="md"
                    color={av.bg}
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {row.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.subtitle}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                      {row.relativeLabel}
                    </Typography>
                  </Box>
                </Box>
              )
            })
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                Pending Approvals
              </Typography>
              {pendingItems.length > 0 && (
                <Chip
                  label={`${pendingItems.length} items`}
                  size="small"
                  sx={{
                    bgcolor: '#FEF3C7',
                    color: '#B45309',
                    fontWeight: 600,
                    fontSize: 11,
                    height: 20,
                    borderRadius: 1,
                  }}
                />
              )}
            </Box>
            <Typography
              variant="body2"
              color="primary.main"
              fontWeight={500}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/finance/expenses')}
            >
              Process All
            </Typography>
          </Box>
          {pendingItems.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 4,
                gap: 1,
              }}
            >
              <CheckCircle size={32} color="#15803D" />
              <Typography variant="body2" fontWeight={500}>
                All caught up!
              </Typography>
              <Typography variant="caption" color="text.secondary">
                No pending approvals
              </Typography>
            </Box>
          ) : (
            pendingItems.map((item, idx) => (
              <Box
                key={`${item.kind}-${item.id}`}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  py: 1.5,
                  borderBottom: idx < pendingItems.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  alignItems: 'flex-start',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor:
                      item.kind === 'expense'
                        ? '#FEF3C7'
                        : item.kind === 'reimbursement'
                          ? '#DCFCE7'
                          : '#F3E8FF',
                  }}
                >
                  {item.kind === 'expense' && <Wallet size={14} color="#B45309" />}
                  {item.kind === 'reimbursement' && <RefreshCw size={14} color="#15803D" />}
                  {item.kind === 'vendor_invoice' && <FileText size={14} color="#7C3AED" />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.subtitle}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {ru(item.amount)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => showToast({ title: 'Approved!', variant: 'success' })}
                      sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#15803D',
                        minWidth: 'auto',
                        px: 0.5,
                        py: 0.25,
                        lineHeight: 1.5,
                      }}
                    >
                      APPROVE
                    </Button>
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => showToast({ title: 'Denied!', variant: 'error' })}
                      sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#B91C1C',
                        minWidth: 'auto',
                        px: 0.5,
                        py: 0.25,
                        lineHeight: 1.5,
                      }}
                    >
                      DENY
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Box>
  )
}

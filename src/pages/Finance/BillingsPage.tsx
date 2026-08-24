import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Stack,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import DraftsIcon from '@mui/icons-material/Drafts'
import { useTheme, alpha } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { TrendingUp, Plus } from 'lucide-react'
import dayjs from 'dayjs'
import { ListingTemplate, KpiStatCard } from '@/components/templates'
import type { FilterField, ColumnItem } from '@/components/templates/ListingTemplate'
import {
  FilterableSortHeader,
  type ColumnFilterOption,
} from '@/components/listing'
import { StatusBadge, Modal, Button, DatePicker, Select, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setFilters,
  setSortConfig,
  clearSelected,
  setPage,
  setPageSize,
} from '@/slices/receivables/reducer'
import { convertDraftToTax, fetchInvoices, sendInvoice } from '@/slices/receivables/thunk'
import { fetchCustomers } from '@/slices/customers/thunk'
import type { Invoice } from '@/slices/receivables/reducer'
import { formatCurrency } from '@/utils/formatters'
import { tokens } from '@/design-system/tokens'
import { CreateInvoiceDrawer } from './components/CreateInvoiceDrawer'
import { InvoiceDetailDrawer } from './components/InvoiceDetailDrawer'
import { RecordPaymentModal } from './components/RecordPaymentModal'
import type { ReceivableSummaryKpis } from './utils/receivableSummary'
import { financeApi } from '@/api/financeApi'
import { receivablesApi } from '@/api/receivablesApi'
import { dropdownsApi } from '@/api/dropdownsApi'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { downloadCsv } from '@/api/downloadCsv'
import { invoiceStatusToBadgeType, mapInvoiceStatus, showPartialPaidAlongsideTabStatus } from './invoiceStatus'
import { usePermission } from '@/hooks/usePermission'

type ReceivableKpiPeriod =
  | 'Today'
  | 'This Week'
  | 'This Month'
  | 'This Year'
  | 'Custom Date Range'

const KPI_PERIOD_OPTIONS: { label: string; value: ReceivableKpiPeriod }[] = [
  { label: 'Today', value: 'Today' },
  { label: 'This Week', value: 'This Week' },
  { label: 'This Month', value: 'This Month' },
  { label: 'This Year', value: 'This Year' },
  { label: 'Custom Date Range', value: 'Custom Date Range' },
]

function isPendingGeneration(inv: Pick<Invoice, 'id' | 'pendingGeneration'>): boolean {
  return Boolean(inv.pendingGeneration) || inv.id.startsWith('pending:')
}

function invoiceMilestoneLabel(inv: Invoice): string {
  if (inv.milestoneName?.trim()) return inv.milestoneName.trim()
  const fromLines = (inv.lineItems ?? [])
    .map((li) => {
      const raw = (li.serviceName ?? '').trim()
      if (!raw) return ''
      const parts = raw.split(' — ')
      return (parts[0] || raw).trim()
    })
    .filter(Boolean)
  const unique = [...new Set(fromLines)]
  return unique.length ? unique.slice(0, 2).join(', ') : '—'
}

function formatListingDate(value: string | undefined): string {
  if (!value?.trim()) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : '—'
}

function isDueOverdue(inv: Invoice): boolean {
  if (inv.balance <= 0) return false
  return dayjs(inv.dueDate).isBefore(dayjs(), 'day')
}

/** Togglable columns (invoice no. + actions are always shown). */
type ReceivablesVisibleColumns = {
  clientName: boolean
  projectName: boolean
  milestoneName: boolean
  invoiceDate: boolean
  dueDate: boolean
  baseAmount: boolean
  gstAmount: boolean
  totalAmount: boolean
  totalReceived: boolean
  balance: boolean
  status: boolean
}

type ReceivablesColumnFilters = {
  invoiceNo: string
  clientId: string
  projectId: string
  invoiceDate: string
  dueDate: string
  baseAmount: string
  gstAmount: string
  totalAmount: string
  received: string
  netReceivable: string
  status: string
}

function toColumnFilterOptions(
  options?: Array<{ value: string | number | boolean; label: string }>,
): ColumnFilterOption[] {
  return (options ?? []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }))
}

function toExactNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mainInvoiceTableColumnCount(v: ReceivablesVisibleColumns): number {
  const toggles = Object.values(v).filter(Boolean).length
  return 1 + toggles + 1
}

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }
const LISTING_EDGE_PAD = '14px'
const ACTION_WIDTH_PX = 44

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

const HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: 1,
  px: 1.75,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
}
const BODY_CELL_SX = { fontSize: 12, py: 1, px: 1.75 }

const HEADER_ACTION_SX = {
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  ...HEADER_CELL_SX,
  whiteSpace: 'nowrap',
  position: 'sticky',
  right: 0,
  bgcolor: 'background.default',
  zIndex: 2,
  textAlign: 'center',
  verticalAlign: 'middle',
  pl: 0,
  pr: LISTING_EDGE_PAD,
}

const BODY_ACTION_SX = {
  ...BODY_CELL_SX,
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  position: 'sticky',
  right: 0,
  bgcolor: 'background.paper',
  zIndex: 1,
  textAlign: 'center',
  verticalAlign: 'middle',
  pl: 0,
  pr: LISTING_EDGE_PAD,
}

function RowActions({
  inv,
  onView,
  onPay,
  onSend,
  onConvertTax,
  onPdf,
  canEdit,
}: {
  inv: Invoice
  onView: () => void
  onPay: () => void
  onSend: () => void
  onConvertTax: () => void
  onPdf: () => void
  canEdit: boolean
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const canRecordPayment = inv.status !== 'draft' && inv.status !== 'paid' && inv.balance > 0
  const canMarkSent = inv.status === 'draft'
  const canConvertTax = inv.status === 'draft'
  const showEditActions = canEdit && (canRecordPayment || canConvertTax || canMarkSent)

  return (
    <Box sx={CENTER_CELL_CONTENT_SX}>
      <MuiIconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
        aria-label="More actions"
        sx={{ p: 0.25 }}
      >
        <MoreVertIcon sx={{ fontSize: 14 }} />
      </MuiIconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { elevation: 2 } }}
      >
        <MenuItem
          sx={menuItemSx}
          onClick={() => {
            onView()
            setAnchor(null)
          }}
        >
          View
        </MenuItem>
        {canEdit && canRecordPayment && (
          <MenuItem
            sx={menuItemSx}
            onClick={() => {
              onPay()
              setAnchor(null)
            }}
          >
            Record Payment
          </MenuItem>
        )}
        <MenuItem
          sx={menuItemSx}
          onClick={() => {
            onPdf()
            setAnchor(null)
          }}
        >
          Download PDF
        </MenuItem>
        {showEditActions && (
          <>
            <Divider />
            {canConvertTax && (
              <MenuItem
                sx={menuItemSx}
                onClick={() => {
                  onConvertTax()
                  setAnchor(null)
                }}
              >
                Convert as tax invoice
              </MenuItem>
            )}
            {canMarkSent && (
              <MenuItem
                sx={menuItemSx}
                onClick={() => {
                  onSend()
                  setAnchor(null)
                }}
              >
                Mark as Sent
              </MenuItem>
            )}
          </>
        )}
      </Menu>
    </Box>
  )
}

export default function BillingsPage() {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const theme = useTheme()
  const canCreateReceivable = usePermission('receivables', 'create')
  const canEditReceivable = usePermission('receivables', 'edit')
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  const { items: rawItems, loading, filters, sortConfig, pagination, saving } = useAppSelector((s) => s.receivables)
  const items = useMemo(
    () =>
      (rawItems ?? []).map((inv) => ({
        ...inv,
        status: mapInvoiceStatus(inv) as Invoice['status'],
        showPartialPaid: showPartialPaidAlongsideTabStatus(inv),
      })),
    [rawItems],
  )
  const customers = useAppSelector((s) => s.customers.items ?? [])
  const [liveProjectOptions, setLiveProjectOptions] = useState<Array<{ value: string; label: string }>>([])
  const [filterOptions, setFilterOptions] = useState<Record<string, Array<{ value: string; label: string }>> | null>(null)

  const [drawerCreate, setDrawerCreate] = useState(false)
  const [generatePreset, setGeneratePreset] = useState<{
    projectId: string
    projectName?: string
    clientId?: string
    clientName?: string
    clientPoId?: string
    milestoneId?: string
  } | null>(null)
  const [drawerEdit, setDrawerEdit] = useState<Invoice | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [paymentInv, setPaymentInv] = useState<Invoice | null>(null)
  const [sendTarget, setSendTarget] = useState<Invoice | null>(null)
  const [convertTaxTarget, setConvertTaxTarget] = useState<Invoice | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [searchInput, setSearchInput] = useState(filters.search)
  const [columnFilters, setColumnFilters] = useState<ReceivablesColumnFilters>({
    invoiceNo: '',
    clientId: '',
    projectId: '',
    invoiceDate: '',
    dueDate: '',
    baseAmount: '',
    gstAmount: '',
    totalAmount: '',
    received: '',
    netReceivable: '',
    status: '',
  })
  const [kpiPeriod, setKpiPeriod] = useState<ReceivableKpiPeriod>('This Month')
  const [kpiCustomFrom, setKpiCustomFrom] = useState<Date | null>(null)
  const [kpiCustomTo, setKpiCustomTo] = useState<Date | null>(null)
  const [kpis, setKpis] = useState<ReceivableSummaryKpis>({
    totalPoValue: 0,
    receivedTillDate: 0,
    pending: 0,
    taxInvoiceRaised: 0,
    draftInvoiceSent: 0,
  })
  const [visibleColumns, setVisibleColumns] = useState<ReceivablesVisibleColumns>({
    clientName: true,
    projectName: true,
    milestoneName: true,
    invoiceDate: true,
    dueDate: true,
    baseAmount: false,
    gstAmount: false,
    totalAmount: true,
    totalReceived: false,
    balance: true,
    status: true,
  })
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const columnsConfig: ColumnItem[] = useMemo(
    () => [
      { field: 'clientName', label: 'Client', visible: visibleColumns.clientName },
      { field: 'projectName', label: 'Project', visible: visibleColumns.projectName },
      { field: 'milestoneName', label: 'Milestone', visible: visibleColumns.milestoneName },
      { field: 'invoiceDate', label: 'Invoice date', visible: visibleColumns.invoiceDate },
      { field: 'dueDate', label: 'Due date', visible: visibleColumns.dueDate },
      { field: 'baseAmount', label: 'Base', visible: visibleColumns.baseAmount },
      { field: 'gstAmount', label: 'GST', visible: visibleColumns.gstAmount },
      { field: 'totalAmount', label: 'Total', visible: visibleColumns.totalAmount },
      { field: 'totalReceived', label: 'Received', visible: visibleColumns.totalReceived },
      { field: 'balance', label: 'Net receivable', visible: visibleColumns.balance },
      { field: 'status', label: 'Status', visible: visibleColumns.status },
    ],
    [visibleColumns],
  )

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    const key = field as keyof ReceivablesVisibleColumns
    setVisibleColumns((prev) => (key in prev ? { ...prev, [key]: visible } : prev))
  }

  const mainColCount = useMemo(() => mainInvoiceTableColumnCount(visibleColumns), [visibleColumns])

  function reload() {
    dispatch(
      fetchInvoices({
        page: pagination.page,
        pageSize: pagination.pageSize,
        status: columnFilters.status || (filters.statusTab === 'all' ? undefined : filters.statusTab),
        search: filters.search || undefined,
        clientId: columnFilters.clientId || filters.clientId || undefined,
        projectId: columnFilters.projectId || filters.projectId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        amountMin: filters.amountMin || undefined,
        amountMax: filters.amountMax || undefined,
        invoiceNo: columnFilters.invoiceNo || undefined,
        invoiceDate: columnFilters.invoiceDate || undefined,
        dueDate: columnFilters.dueDate || undefined,
        baseAmount: toExactNumber(columnFilters.baseAmount),
        gstAmount: toExactNumber(columnFilters.gstAmount),
        totalAmount: toExactNumber(columnFilters.totalAmount),
        received: toExactNumber(columnFilters.received),
        netReceivable: toExactNumber(columnFilters.netReceivable),
        sortBy: sortConfig.field || undefined,
        sortOrder: sortConfig.field ? sortConfig.direction : undefined,
      }),
    )
  }

  function openGenerateInvoice(inv: Invoice) {
    if (!canCreateReceivable) return
    setGeneratePreset({
      projectId: inv.projectId,
      projectName: inv.projectName,
      clientId: inv.clientId,
      clientName: inv.clientName,
      clientPoId: inv.clientPoId,
      milestoneId: inv.milestoneId,
    })
    setDrawerCreate(true)
  }

  function handleInvoiceRowClick(inv: Invoice) {
    if (isPendingGeneration(inv) && canCreateReceivable) {
      openGenerateInvoice(inv)
      return
    }
    setDetailId(inv.id)
  }

  const actionColSx = {
    ...HEADER_ACTION_SX,
    ...(filters.statusTab === 'draft'
      ? { width: 148, minWidth: 148, maxWidth: 148 }
      : {}),
  }
  const actionBodySx = {
    ...BODY_ACTION_SX,
    ...(filters.statusTab === 'draft'
      ? { width: 148, minWidth: 148, maxWidth: 148 }
      : {}),
  }

  useEffect(() => {
    dispatch(fetchCustomers({}))
    void dropdownsApi
      .getLiveProjects()
      .then((options) => setLiveProjectOptions(options.map((o) => ({ value: o.value, label: o.label }))))
      .catch(() => setLiveProjectOptions([]))
    void receivablesApi.getFilters().then(setFilterOptions).catch(() => setFilterOptions(null))
    setActiveFilters({
      clientId: '',
      projectId: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.pageSize,
    filters.statusTab,
    filters.search,
    filters.clientId,
    filters.projectId,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
    columnFilters.invoiceNo,
    columnFilters.clientId,
    columnFilters.projectId,
    columnFilters.invoiceDate,
    columnFilters.dueDate,
    columnFilters.baseAmount,
    columnFilters.gstAmount,
    columnFilters.totalAmount,
    columnFilters.received,
    columnFilters.netReceivable,
    columnFilters.status,
    sortConfig.field,
    sortConfig.direction,
  ])

  useEffect(() => {
    let cancelled = false
    void financeApi
      .getReceivablesSummary({ period: kpiPeriod })
      .then((res) => {
        const data = unwrapApiData<ReceivableSummaryKpis>(res.data)
        if (!cancelled && data) setKpis(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [kpiPeriod])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  const clientOpts = useMemo(
    () => [{ label: 'All clients', value: '' }, ...customers.map((c) => ({ label: c.name, value: c.id }))],
    [customers],
  )
  const projectOpts = useMemo(
    () => [{ label: 'All projects', value: '' }, ...liveProjectOptions],
    [liveProjectOptions],
  )

  const filterConfig: FilterField[] = useMemo(
    () => [
      { field: 'clientId', label: 'Client', type: 'select', options: clientOpts },
      { field: 'projectId', label: 'Project', type: 'select', options: projectOpts },
      { field: 'dateFrom', label: 'Date from (YYYY-MM-DD)', type: 'text' },
      { field: 'dateTo', label: 'Date to (YYYY-MM-DD)', type: 'text' },
      { field: 'amountMin', label: 'Amount min', type: 'text' },
      { field: 'amountMax', label: 'Amount max', type: 'text' },
    ],
    [clientOpts, projectOpts],
  )

  const statCards = [
    {
      label: 'Total PO Value',
      value: `₹${kpis.totalPoValue.toLocaleString('en-IN')}`,
      variant: 'default' as const,
      icon: <RequestQuoteIcon sx={{ fontSize: 24 }} />,
    },
    {
      label: 'Received Till Date',
      value: `₹${kpis.receivedTillDate.toLocaleString('en-IN')}`,
      variant: 'success' as const,
      icon: <CheckCircleIcon sx={{ fontSize: 24 }} />,
    },
    {
      label: 'Pending',
      value: `₹${kpis.pending.toLocaleString('en-IN')}`,
      variant: 'warning' as const,
      icon: <WarningAmberIcon sx={{ fontSize: 24 }} />,
    },
    {
      label: 'Tax Invoice Raised',
      value: `₹${kpis.taxInvoiceRaised.toLocaleString('en-IN')}`,
      variant: 'info' as const,
      icon: <ReceiptLongIcon sx={{ fontSize: 24 }} />,
    },
    {
      label: 'Draft Invoice Sent',
      value: `₹${kpis.draftInvoiceSent.toLocaleString('en-IN')}`,
      variant: 'purple' as const,
      icon: <DraftsIcon sx={{ fontSize: 24 }} />,
    },
  ]

  const kpiSummary = (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="flex-end"
        gap={1.5}
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.text.primary, 0.02),
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          gap={1}
          flexWrap="wrap"
          justifyContent="flex-end"
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}
          >
            Date Range
          </Typography>
          <Box sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <Select
              size="sm"
              value={kpiPeriod}
              onChange={(v) => {
                const next = String(v) as ReceivableKpiPeriod
                setKpiPeriod(next)
                if (next !== 'Custom Date Range') {
                  setKpiCustomFrom(null)
                  setKpiCustomTo(null)
                }
              }}
              options={KPI_PERIOD_OPTIONS}
              fullWidth
            />
          </Box>
          {kpiPeriod === 'Custom Date Range' ? (
            <>
              <DatePicker
                label="From"
                value={kpiCustomFrom}
                onChange={setKpiCustomFrom}
                size="sm"
              />
              <DatePicker label="To" value={kpiCustomTo} onChange={setKpiCustomTo} size="sm" />
            </>
          ) : null}
        </Stack>
      </Stack>

      <Box sx={{ p: 2 }}>
        {kpiPeriod === 'Custom Date Range' && (!kpiCustomFrom || !kpiCustomTo) ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Select a start and end date to update KPI values.
          </Typography>
        ) : null}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              lg: `repeat(${Math.min(statCards.length, 5)}, 1fr)`,
            },
            gap: '12px',
          }}
        >
          {statCards.map((card) => (
            <KpiStatCard
              key={card.label}
              label={card.label}
              value={card.value}
              variant={card.variant}
              icon={card.icon}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Tax', value: 'tax' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Paid', value: 'paid' },
  ]

  function handleSearchChange(v: string) {
    setSearchInput(v)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      dispatch(setFilters({ search: v }))
    }, 300)
  }

  function handleFilterChange(next: Record<string, unknown>) {
    setActiveFilters(next)
    setColumnFilters((prev) => ({
      ...prev,
      clientId: String(next.clientId ?? ''),
      projectId: String(next.projectId ?? ''),
    }))
    dispatch(
      setFilters({
        clientId: String(next.clientId ?? ''),
        projectId: String(next.projectId ?? ''),
        dateFrom: String(next.dateFrom ?? ''),
        dateTo: String(next.dateTo ?? ''),
        amountMin: String(next.amountMin ?? ''),
        amountMax: String(next.amountMax ?? ''),
      }),
    )
  }

  function handleFilterReset() {
    setActiveFilters({})
    setColumnFilters((prev) => ({ ...prev, clientId: '', projectId: '' }))
    dispatch(
      setFilters({
        clientId: '',
        projectId: '',
        dateFrom: '',
        dateTo: '',
        amountMin: '',
        amountMax: '',
      }),
    )
  }

  function handleTabChange(v: string) {
    dispatch(setFilters({ statusTab: v }))
    dispatch(setPage(1))
  }

  function handleSort(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
    dispatch(setPage(1))
  }

  const invoiceNoOptions = toColumnFilterOptions(filterOptions?.invoiceNos)
  const clientOptions = toColumnFilterOptions(filterOptions?.clients)
  const projectOptions = toColumnFilterOptions(filterOptions?.projects)
  const invoiceDateOptions = toColumnFilterOptions(filterOptions?.invoiceDates)
  const dueDateOptions = toColumnFilterOptions(filterOptions?.dueDates)
  const baseAmountOptions = toColumnFilterOptions(filterOptions?.baseAmounts)
  const gstAmountOptions = toColumnFilterOptions(filterOptions?.gstAmounts)
  const totalAmountOptions = toColumnFilterOptions(filterOptions?.totalAmounts)
  const receivedOptions = toColumnFilterOptions(filterOptions?.receivedAmounts)
  const netReceivableOptions = toColumnFilterOptions(filterOptions?.netReceivables)
  const statusOptions = toColumnFilterOptions(filterOptions?.statuses)

  function handleColumnFilter(field: keyof ReceivablesColumnFilters, value: string) {
    setColumnFilters((prev) => ({ ...prev, [field]: value }))
    dispatch(setPage(1))
    if (field === 'clientId' || field === 'projectId') {
      setActiveFilters((prev) => ({ ...prev, [field]: value }))
      dispatch(setFilters({ [field]: value }))
    }
    if (field === 'status') {
      dispatch(setFilters({ statusTab: value || 'all' }))
    }
  }

  function handleResetAll() {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    setSearchInput('')
    setActiveFilters({})
    setColumnFilters({
      invoiceNo: '',
      clientId: '',
      projectId: '',
      invoiceDate: '',
      dueDate: '',
      baseAmount: '',
      gstAmount: '',
      totalAmount: '',
      received: '',
      netReceivable: '',
      status: '',
    })
    dispatch(
      setFilters({
        search: '',
        clientId: '',
        projectId: '',
        dateFrom: '',
        dateTo: '',
        amountMin: '',
        amountMax: '',
      }),
    )
    dispatch(setSortConfig({ field: null, direction: 'asc' }))
    dispatch(setPage(1))
  }

  async function confirmSend() {
    if (!sendTarget) return
    try {
      await dispatch(sendInvoice(sendTarget.id)).unwrap()
      showToast({ title: 'Invoice sent', variant: 'success' })
      reload()
    } catch (e) {
      showToast({ title: String(e), variant: 'error' })
    }
    setSendTarget(null)
  }

  async function confirmConvertTax() {
    if (!convertTaxTarget) return
    try {
      await dispatch(convertDraftToTax(convertTaxTarget.id)).unwrap()
      showToast({ title: 'Converted to tax invoice', variant: 'success' })
      reload()
    } catch (e) {
      showToast({ title: String(e), variant: 'error' })
    }
    setConvertTaxTarget(null)
  }

  const detailOpen = Boolean(detailId)

  async function handleExport() {
    try {
      await downloadCsv(
        '/invoices/export',
        {
          status: columnFilters.status || (filters.statusTab === 'all' ? undefined : filters.statusTab),
          search: filters.search || undefined,
          clientId: columnFilters.clientId || filters.clientId || undefined,
          projectId: columnFilters.projectId || filters.projectId || undefined,
          invoiceNo: columnFilters.invoiceNo || undefined,
          invoiceDate: columnFilters.invoiceDate || undefined,
          dueDate: columnFilters.dueDate || undefined,
          baseAmount: toExactNumber(columnFilters.baseAmount),
          gstAmount: toExactNumber(columnFilters.gstAmount),
          totalAmount: toExactNumber(columnFilters.totalAmount),
          received: toExactNumber(columnFilters.received),
          netReceivable: toExactNumber(columnFilters.netReceivable),
          sortBy: sortConfig.field || undefined,
          sortOrder: sortConfig.direction || undefined,
        },
        `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      )
      showToast({ title: 'Export started', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to export invoices', variant: 'error' })
    }
  }

  return (
    <>
      <ListingTemplate
        icon={<TrendingUp size={20} />}
        title="Receivable"
        subtitle="Cross-project client invoices and payments"
        primaryAction={
          canCreateReceivable
            ? {
                label: 'Create Invoice',
                onClick: () => {
                  setGeneratePreset(null)
                  setDrawerCreate(true)
                },
                startIcon: <Plus size={16} />,
              }
            : undefined
        }
        customSummary={kpiSummary}
        tabs={tabs}
        activeTab={filters.statusTab}
        onTabChange={handleTabChange}
        searchPlaceholder="Invoice no. / client / project…"
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        onResetAll={handleResetAll}
        showExport
        onExport={handleExport}
        pageSize={pagination.pageSize}
        totalCount={pagination.total}
        page={pagination.page - 1}
        onPageChange={(p) => dispatch(setPage(p + 1))}
        onPageSizeChange={(s) => dispatch(setPageSize(s))}
        columns={columnsConfig}
        onColumnVisibilityChange={handleColumnVisibilityChange}
      >
          <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <FilterableSortHeader
                    label="Invoice no."
                    field="invoiceNo"
                    sortField={sortConfig.field ?? undefined}
                    sortDirection={sortConfig.direction}
                    onSort={handleSort}
                    filterValue={columnFilters.invoiceNo}
                    filterOptions={invoiceNoOptions}
                    onFilter={(value) => handleColumnFilter('invoiceNo', value)}
                    sx={HEADER_CELL_SX}
                  />
                  {visibleColumns.clientName && (
                    <FilterableSortHeader
                      label="Client"
                      field="clientName"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.clientId}
                      filterOptions={clientOptions}
                      onFilter={(value) => handleColumnFilter('clientId', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.projectName && (
                    <FilterableSortHeader
                      label="Project"
                      field="projectName"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.projectId}
                      filterOptions={projectOptions}
                      onFilter={(value) => handleColumnFilter('projectId', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.milestoneName && (
                    <TableCell sx={HEADER_CELL_SX}>Milestone</TableCell>
                  )}
                  {visibleColumns.invoiceDate && (
                    <FilterableSortHeader
                      label="Invoice date"
                      field="invoiceDate"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.invoiceDate}
                      filterOptions={invoiceDateOptions}
                      onFilter={(value) => handleColumnFilter('invoiceDate', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.dueDate && (
                    <FilterableSortHeader
                      label="Due date"
                      field="dueDate"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.dueDate}
                      filterOptions={dueDateOptions}
                      onFilter={(value) => handleColumnFilter('dueDate', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.baseAmount && (
                    <FilterableSortHeader
                      label="Base"
                      field="baseAmount"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.baseAmount}
                      filterOptions={baseAmountOptions}
                      onFilter={(value) => handleColumnFilter('baseAmount', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.gstAmount && (
                    <FilterableSortHeader
                      label="GST"
                      field="gstAmount"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.gstAmount}
                      filterOptions={gstAmountOptions}
                      onFilter={(value) => handleColumnFilter('gstAmount', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.totalAmount && (
                    <FilterableSortHeader
                      label="Amount"
                      field="totalAmount"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.totalAmount}
                      filterOptions={totalAmountOptions}
                      onFilter={(value) => handleColumnFilter('totalAmount', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.totalReceived && (
                    <FilterableSortHeader
                      label="Received"
                      field="received"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.received}
                      filterOptions={receivedOptions}
                      onFilter={(value) => handleColumnFilter('received', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.balance && (
                    <FilterableSortHeader
                      label="Net receivable"
                      field="netReceivable"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.netReceivable}
                      filterOptions={netReceivableOptions}
                      onFilter={(value) => handleColumnFilter('netReceivable', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  {visibleColumns.status && (
                    <FilterableSortHeader
                      label="Status"
                      field="status"
                      sortField={sortConfig.field ?? undefined}
                      sortDirection={sortConfig.direction}
                      onSort={handleSort}
                      filterValue={columnFilters.status}
                      filterOptions={statusOptions}
                      onFilter={(value) => handleColumnFilter('status', value)}
                      sx={HEADER_CELL_SX}
                    />
                  )}
                  <TableCell sx={actionColSx}>
                    <Box sx={CENTER_CELL_CONTENT_SX}>Action</Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(mainColCount)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton height={24} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={mainColCount} sx={{ ...BODY_CELL_SX, textAlign: 'center', color: 'text.secondary', py: 4 }}>
                          {filters.statusTab === 'draft'
                            ? 'No draft invoices found.'
                            : 'No invoices found.'}
                        </TableCell>
                      </TableRow>
                    )
                  : items.map((inv) => {
                      const pendingRow = isPendingGeneration(inv)
                      const dueRed = !pendingRow && (inv.status === 'overdue' || isDueOverdue(inv))
                      return (
                        <TableRow
                          key={inv.id}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '& td': { height: 44 },
                            '&:hover': { bgcolor: hoverBg },
                            '&:hover td': { bgcolor: hoverBg },
                          }}
                          onClick={() => handleInvoiceRowClick(inv)}
                        >
                          <TableCell sx={{ ...BODY_CELL_SX, fontFamily: pendingRow ? 'inherit' : 'monospace' }}>
                            {pendingRow ? (
                              <Typography variant="body2" color="text.secondary">
                                —
                              </Typography>
                            ) : (
                              <Typography
                                component="button"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDetailId(inv.id)
                                }}
                                sx={{
                                  border: 'none',
                                  background: 'none',
                                  p: 0,
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  textAlign: 'left',
                                }}
                              >
                                {inv.invoiceNo}
                              </Typography>
                            )}
                          </TableCell>
                          {visibleColumns.clientName && <TableCell sx={BODY_CELL_SX}>{inv.clientName}</TableCell>}
                          {visibleColumns.projectName && (
                            <TableCell sx={BODY_CELL_SX}>
                              <Typography variant="body2" fontWeight={500}>
                                {inv.projectName}
                              </Typography>
                            </TableCell>
                          )}
                          {visibleColumns.milestoneName && (
                            <TableCell sx={BODY_CELL_SX}>{invoiceMilestoneLabel(inv)}</TableCell>
                          )}
                          {visibleColumns.invoiceDate && (
                            <TableCell sx={BODY_CELL_SX}>{formatListingDate(inv.invoiceDate)}</TableCell>
                          )}
                          {visibleColumns.dueDate && (
                            <TableCell sx={{ ...BODY_CELL_SX, color: dueRed ? 'error.main' : 'text.primary' }}>
                              {formatListingDate(inv.dueDate)}
                            </TableCell>
                          )}
                          {visibleColumns.baseAmount && (
                            <TableCell sx={BODY_CELL_SX}>₹{formatCurrency(inv.baseAmount)}</TableCell>
                          )}
                          {visibleColumns.gstAmount && (
                            <TableCell sx={BODY_CELL_SX}>₹{formatCurrency(inv.gstAmount)}</TableCell>
                          )}
                          {visibleColumns.totalAmount && (
                            <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700 }}>₹{formatCurrency(inv.totalAmount)}</TableCell>
                          )}
                          {visibleColumns.totalReceived && (
                            <TableCell sx={{ ...BODY_CELL_SX, color: pendingRow ? 'text.secondary' : 'success.main' }}>
                              {pendingRow ? '—' : `₹${formatCurrency(inv.totalReceived)}`}
                            </TableCell>
                          )}
                          {visibleColumns.balance && (
                            <TableCell sx={{ ...BODY_CELL_SX, color: inv.balance > 0 ? 'error.main' : 'text.primary' }}>
                              ₹{formatCurrency(inv.balance)}
                            </TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell sx={BODY_CELL_SX}>
                              <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap alignItems="center">
                                {pendingRow ? (
                                  <StatusBadge status="invoice_draft" label="Pending invoice" />
                                ) : (
                                  <>
                                    <StatusBadge status={invoiceStatusToBadgeType(inv.status) as StatusType} />
                                    {inv.showPartialPaid ? <StatusBadge status="partially_paid" /> : null}
                                  </>
                                )}
                              </Stack>
                            </TableCell>
                          )}
                          <TableCell
                            sx={actionBodySx}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {pendingRow ? (
                              canCreateReceivable ? (
                                <Box sx={CENTER_CELL_CONTENT_SX}>
                                  <Button
                                    size="sm"
                                    variant="contained"
                                    label="Generate Invoice"
                                    onClick={() => openGenerateInvoice(inv)}
                                  />
                                </Box>
                              ) : null
                            ) : (
                              <RowActions
                                inv={inv}
                                canEdit={canEditReceivable}
                                onView={() => setDetailId(inv.id)}
                                onPay={() => setPaymentInv(inv)}
                                onSend={() => setSendTarget(inv)}
                                onConvertTax={() => setConvertTaxTarget(inv)}
                                onPdf={() => showToast({ title: 'PDF download (placeholder)', variant: 'success' })}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </TableContainer>
      </ListingTemplate>

      <Modal
        open={!!sendTarget}
        onClose={() => setSendTarget(null)}
        title="Send invoice?"
        size="xs"
        footer={
          <Stack direction="row" justifyContent="flex-end" gap={1}>
            <Button variant="outlined" size="sm" onClick={() => setSendTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" size="sm" onClick={confirmSend} loading={saving}>
              Send
            </Button>
          </Stack>
        }
      >
        <Typography variant="body2">
          Mark <strong>{sendTarget?.invoiceNo}</strong> as sent? The client will see this as issued.
        </Typography>
      </Modal>

      <Modal
        open={!!convertTaxTarget}
        onClose={() => setConvertTaxTarget(null)}
        title="Convert as tax invoice?"
        size="xs"
        footer={
          <Stack direction="row" justifyContent="flex-end" gap={1}>
            <Button
              variant="outlined"
              size="sm"
              onClick={() => setConvertTaxTarget(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="contained" size="sm" onClick={confirmConvertTax} loading={saving}>
              Convert
            </Button>
          </Stack>
        }
      >
        <Typography variant="body2">
          Convert <strong>{convertTaxTarget?.invoiceNo}</strong> to a tax invoice? This cannot be undone.
        </Typography>
      </Modal>

      <CreateInvoiceDrawer
        open={drawerCreate}
        onClose={() => {
          setDrawerCreate(false)
          setGeneratePreset(null)
        }}
        mode="create"
        preset={generatePreset}
        onSaved={() => {
          setGeneratePreset(null)
          reload()
        }}
      />
      <CreateInvoiceDrawer
        open={!!drawerEdit}
        onClose={() => setDrawerEdit(null)}
        mode="edit"
        invoice={drawerEdit}
        onSaved={reload}
      />

      <InvoiceDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailId(null)
          dispatch(clearSelected())
        }}
        invoiceId={detailId}
        onEdit={
          canEditReceivable
            ? (inv) => {
                setDetailId(null)
                dispatch(clearSelected())
                setDrawerEdit(inv)
              }
            : undefined
        }
        onRecordPayment={canEditReceivable ? (inv) => setPaymentInv(inv) : undefined}
        onConvertTax={canEditReceivable ? (inv) => setConvertTaxTarget(inv) : undefined}
        onDownloadPdf={() => {
          showToast({ title: 'PDF download (placeholder)', variant: 'success' })
        }}
      />

      <RecordPaymentModal
        open={!!paymentInv}
        onClose={() => setPaymentInv(null)}
        invoice={paymentInv}
        onRecorded={reload}
      />
    </>
  )
}

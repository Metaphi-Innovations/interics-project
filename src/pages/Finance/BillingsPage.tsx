import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Stack,
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
import BalanceIcon from '@mui/icons-material/Balance'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { TrendingUp, Plus } from 'lucide-react'
import dayjs from 'dayjs'
import { ListingTemplate } from '@/components/templates'
import type { FilterField, ColumnItem } from '@/components/templates/ListingTemplate'
import { StatusBadge, Modal, Button, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setFilters,
  setSortConfig,
  clearSelected,
  setPage,
  setPageSize,
} from '@/slices/receivables/reducer'
import { fetchInvoices, sendInvoice } from '@/slices/receivables/thunk'
import { fetchCustomers } from '@/slices/customers/thunk'
import { fetchProjects } from '@/slices/projects/thunk'
import type { Invoice } from '@/slices/receivables/reducer'
import { formatCurrency } from '@/utils/formatters'
import { tokens } from '@/design-system/tokens'
import { CreateInvoiceDrawer } from './components/CreateInvoiceDrawer'
import { InvoiceDetailDrawer, invoiceStatusToBadgeType } from './components/InvoiceDetailDrawer'
import { RecordPaymentModal } from './components/RecordPaymentModal'

function isDueOverdue(inv: Invoice): boolean {
  if (inv.status === 'paid' || inv.balance <= 0) return false
  return dayjs(inv.dueDate).isBefore(dayjs(), 'day')
}

/** Togglable columns (invoice no. + actions are always shown). */
type ReceivablesVisibleColumns = {
  clientName: boolean
  projectName: boolean
  invoiceDate: boolean
  dueDate: boolean
  baseAmount: boolean
  gstAmount: boolean
  totalAmount: boolean
  totalReceived: boolean
  balance: boolean
  status: boolean
}

function mainInvoiceTableColumnCount(v: ReceivablesVisibleColumns): number {
  const toggles = Object.values(v).filter(Boolean).length
  return 1 + toggles + 1
}

function SortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  sx,
}: {
  label: string
  field: string
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (f: string, d: 'asc' | 'desc') => void
  sx?: object
}) {
  const isActive = sortField === field
  function handleClick() {
    if (isActive) onSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
    else onSort(field, 'asc')
  }
  return (
    <TableCell
      sx={{
        fontSize: 11,
        fontWeight: isActive ? 700 : 600,
        color: isActive ? 'primary.main' : 'text.secondary',
        py: 1,
        px: 1.75,
        borderBottom: `2px solid ${tokens.color.neutral[100]}`,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        '&:hover': { color: 'primary.main' },
        ...sx,
      }}
      onClick={handleClick}
    >
      <Stack direction="row" alignItems="center" gap={0.25}>
        {label}
        {isActive
          ? sortDirection === 'asc'
            ? <KeyboardArrowUpIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            : <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          : <UnfoldMoreIcon sx={{ fontSize: 14, color: tokens.color.neutral[300] }} />}
      </Stack>
    </TableCell>
  )
}

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }
const HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: 1,
  px: 1.75,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
}
const BODY_CELL_SX = { fontSize: 12, py: 1, px: 1.75 }

function RowActions({
  inv,
  onView,
  onPay,
  onSend,
  onPdf,
}: {
  inv: Invoice
  onView: () => void
  onPay: () => void
  onSend: () => void
  onPdf: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const canRecordPayment = inv.status !== 'draft' && inv.status !== 'paid' && inv.balance > 0
  const canMarkSent = inv.status === 'draft'

  return (
    <Stack direction="row" alignItems="center" justifyContent="flex-end">
      <MuiIconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
        aria-label="More actions"
      >
        <MoreVertIcon sx={{ fontSize: 16 }} />
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
        {canRecordPayment && (
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
        {canMarkSent && (
          <>
            <Divider />
            <MenuItem
              sx={menuItemSx}
              onClick={() => {
                onSend()
                setAnchor(null)
              }}
            >
              Mark as Sent
            </MenuItem>
          </>
        )}
      </Menu>
    </Stack>
  )
}

export function mapInvoiceStatus(inv: Invoice): string {
  if (inv.status === 'uploaded') return 'draft'
  if (inv.status === 'paid') return 'paid'
  if (inv.status === 'overdue') return 'overdue'
  if (inv.status === 'draft') return 'draft'
  
  const isOverdue = inv.balance > 0 && dayjs(inv.dueDate).isBefore(dayjs(), 'day')
  if (isOverdue) return 'overdue'
  
  return 'tax'
}

export default function BillingsPage() {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  const { items: rawItems, loading, filters, sortConfig, pagination, saving } = useAppSelector((s) => s.receivables)
  const items = useMemo(() => rawItems.map((inv) => ({ ...inv, status: mapInvoiceStatus(inv) as Invoice['status'] })), [rawItems])
  const customers = useAppSelector((s) => s.customers.items)
  const projects = useAppSelector((s) => s.projects.items)

  const [drawerCreate, setDrawerCreate] = useState(false)
  const [drawerEdit, setDrawerEdit] = useState<Invoice | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [paymentInv, setPaymentInv] = useState<Invoice | null>(null)
  const [sendTarget, setSendTarget] = useState<Invoice | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [visibleColumns, setVisibleColumns] = useState<ReceivablesVisibleColumns>({
    clientName: true,
    projectName: true,
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
    dispatch(fetchInvoices({ page: 1, pageSize: 200 }))
  }

  useEffect(() => {
    dispatch(fetchCustomers({}))
    dispatch(fetchProjects({}))
    reload()
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
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const clientOpts = useMemo(
    () => [{ label: 'All clients', value: '' }, ...customers.map((c) => ({ label: c.name, value: c.id }))],
    [customers],
  )
  const projectOpts = useMemo(
    () => [
      { label: 'All projects', value: '' },
      ...projects.filter((p) => p.status === 'Live').map((p) => ({ label: p.name, value: p.id })),
    ],
    [projects],
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

  const baseFiltered = useMemo(() => {
    let list = [...items]
    const q = filters.search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          i.invoiceNo.toLowerCase().includes(q) ||
          i.clientName.toLowerCase().includes(q) ||
          i.projectName.toLowerCase().includes(q),
      )
    }
    if (filters.clientId) list = list.filter((i) => i.clientId === filters.clientId)
    if (filters.projectId) list = list.filter((i) => i.projectId === filters.projectId)
    if (filters.dateFrom) list = list.filter((i) => i.invoiceDate >= filters.dateFrom)
    if (filters.dateTo) list = list.filter((i) => i.invoiceDate <= filters.dateTo)
    const amin = Number(filters.amountMin)
    if (filters.amountMin !== '' && !Number.isNaN(amin)) list = list.filter((i) => i.totalAmount >= amin)
    const amax = Number(filters.amountMax)
    if (filters.amountMax !== '' && !Number.isNaN(amax)) list = list.filter((i) => i.totalAmount <= amax)
    return list
  }, [items, filters])

  const tabFiltered = useMemo(() => {
    if (filters.statusTab === 'all') return baseFiltered
    return baseFiltered.filter((i) => i.status === filters.statusTab)
  }, [baseFiltered, filters.statusTab])

  const sortedRows = useMemo(() => {
    const f = sortConfig.field
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    const list = [...tabFiltered]
    if (!f) return list
    list.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (f === 'invoiceNo') {
        av = a.invoiceNo.toLowerCase()
        bv = b.invoiceNo.toLowerCase()
      } else if (f === 'invoiceDate') {
        av = a.invoiceDate
        bv = b.invoiceDate
      } else if (f === 'dueDate') {
        av = a.dueDate
        bv = b.dueDate
      } else if (f === 'totalAmount') {
        av = a.totalAmount
        bv = b.totalAmount
      } else if (f === 'clientName') {
        av = a.clientName.toLowerCase()
        bv = b.clientName.toLowerCase()
      }
      if (typeof av === 'number' && typeof bv === 'number') return av === bv ? 0 : av > bv ? dir : -dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return list
  }, [tabFiltered, sortConfig])

  const pageSize = pagination.pageSize
  const pageIdx = pagination.page - 1
  const pagedRows = useMemo(
    () => sortedRows.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize),
    [sortedRows, pageIdx, pageSize],
  )

  const tabCounts = useMemo(() => {
    return {
      all: baseFiltered.length,
      draft: baseFiltered.filter((i) => i.status === 'draft').length,
      tax: baseFiltered.filter((i) => i.status === 'tax').length,
      overdue: baseFiltered.filter((i) => i.status === 'overdue').length,
      paid: baseFiltered.filter((i) => i.status === 'paid').length,
    }
  }, [baseFiltered])

  const kpis = useMemo(() => {
    // TOTAL INVOICED: sum tax, overdue, paid invoices only (exclude draft)
    const billedStatuses = new Set(['tax', 'sent', 'overdue', 'paid'])
    const totalInvoiced = rawItems
      .filter((i) => billedStatuses.has(i.status))
      .reduce((s, i) => s + i.totalAmount, 0)

    // RECEIVED: sum of actual recorded payment entries only
    const received = rawItems.reduce((s, i) => s + (i.totalReceived ?? 0), 0)

    // OUTSTANDING: Total Client PO Value − Total Received Amount (Live projects only)
    const liveProjects = projects.filter((p) => p.status === 'Live')
    const totalClientPO = liveProjects.reduce((s, p) => s + (p.totalClientPOValue ?? 0), 0)
    const outstanding = Math.max(0, totalClientPO - received)

    // TOTAL PAYABLE: Sum of all active Vendor PO Values (Live projects only)
    const totalPayable = Math.max(
      0,
      liveProjects.reduce((s, p) => s + (p.totalVendorPOValue ?? 0), 0),
    )

    return { totalInvoiced, received, outstanding, totalPayable }
  }, [rawItems, projects])

  const statCards = [
    {
      label: 'Total invoiced',
      value: `₹${kpis.totalInvoiced.toLocaleString('en-IN')}`,
      variant: 'default' as const,
      icon: <ReceiptLongIcon sx={{ fontSize: 24 }} />,
    },
    {
      label: 'Received',
      value: `₹${kpis.received.toLocaleString('en-IN')}`,
      variant: 'success' as const,
      icon: <CheckCircleIcon sx={{ fontSize: 24 }} />,
    },
    {
      label: 'Outstanding',
      value: `₹${kpis.outstanding.toLocaleString('en-IN')}`,
      variant: 'warning' as const,
      icon: <WarningAmberIcon sx={{ fontSize: 24 }} />,
    },
    {
      label: 'Total Payable',
      value: `₹${kpis.totalPayable.toLocaleString('en-IN')}`,
      variant: 'purple' as const,
      icon: <BalanceIcon sx={{ fontSize: 24 }} />,
    },
  ]

  const tabs = [
    { label: 'All', value: 'all', count: tabCounts.all },
    { label: 'Draft', value: 'draft', count: tabCounts.draft },
    { label: 'Tax', value: 'tax', count: tabCounts.tax },
    { label: 'Overdue', value: 'overdue', count: tabCounts.overdue },
    { label: 'Paid', value: 'paid', count: tabCounts.paid },
  ]

  function handleSearchChange(v: string) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      dispatch(setFilters({ search: v }))
    }, 300)
  }

  function handleFilterChange(next: Record<string, unknown>) {
    setActiveFilters(next)
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

  const detailOpen = Boolean(detailId)

  return (
    <>
      <ListingTemplate
        icon={<TrendingUp size={20} />}
        title="Receivable"
        subtitle="Cross-project client invoices and payments"
        primaryAction={{ label: 'Create Invoice', onClick: () => setDrawerCreate(true), startIcon: <Plus size={16} /> }}
        statCards={statCards}
        tabs={tabs}
        activeTab={filters.statusTab}
        onTabChange={handleTabChange}
        searchPlaceholder="Invoice no. / client / project…"
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        showExport
        onExport={() => showToast({ title: 'Export started (placeholder)', variant: 'success' })}
        pageSize={pagination.pageSize}
        totalCount={sortedRows.length}
        page={pagination.page - 1}
        onPageChange={(p) => dispatch(setPage(p + 1))}
        onPageSizeChange={(s) => dispatch(setPageSize(s))}
        columns={columnsConfig}
        onColumnVisibilityChange={handleColumnVisibilityChange}
      >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <SortHeader label="Invoice no." field="invoiceNo" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  {visibleColumns.clientName && (
                    <SortHeader label="Client" field="clientName" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.projectName && (
                    <TableCell sx={HEADER_CELL_SX}>Project</TableCell>
                  )}
                  {visibleColumns.invoiceDate && (
                    <SortHeader label="Invoice date" field="invoiceDate" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.dueDate && (
                    <SortHeader label="Due date" field="dueDate" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.baseAmount && (
                    <TableCell sx={HEADER_CELL_SX}>Base</TableCell>
                  )}
                  {visibleColumns.gstAmount && (
                    <TableCell sx={HEADER_CELL_SX}>GST</TableCell>
                  )}
                  {visibleColumns.totalAmount && (
                    <TableCell sx={HEADER_CELL_SX}>Amount</TableCell>
                  )}
                  {visibleColumns.totalReceived && (
                    <TableCell sx={HEADER_CELL_SX}>Received</TableCell>
                  )}
                  {visibleColumns.balance && (
                    <TableCell sx={HEADER_CELL_SX}>Net receivable</TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell sx={HEADER_CELL_SX}>Status</TableCell>
                  )}
                  <TableCell
                    align="right"
                    sx={{
                      width: 48,
                      ...HEADER_CELL_SX,
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      right: 0,
                      bgcolor: 'background.paper',
                      zIndex: 1,
                    }}
                  >
                    Action
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
                  : pagedRows.map((inv) => {
                      const dueRed = inv.status === 'overdue' || isDueOverdue(inv)
                      return (
                        <TableRow
                          key={inv.id}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '& td': { height: 44 },
                            '&:hover': { bgcolor: hoverBg },
                          }}
                          onClick={() => setDetailId(inv.id)}
                        >
                          <TableCell sx={{ ...BODY_CELL_SX, fontFamily: 'monospace' }}>
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
                          </TableCell>
                          {visibleColumns.clientName && <TableCell sx={BODY_CELL_SX}>{inv.clientName}</TableCell>}
                          {visibleColumns.projectName && (
                            <TableCell sx={BODY_CELL_SX}>
                              <Typography variant="body2" fontWeight={500}>
                                {inv.projectName}
                              </Typography>
                            </TableCell>
                          )}
                          {visibleColumns.invoiceDate && (
                            <TableCell sx={BODY_CELL_SX}>{dayjs(inv.invoiceDate).format('DD MMM YYYY')}</TableCell>
                          )}
                          {visibleColumns.dueDate && (
                            <TableCell sx={{ ...BODY_CELL_SX, color: dueRed ? 'error.main' : 'text.primary' }}>
                              {dayjs(inv.dueDate).format('DD MMM YYYY')}
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
                            <TableCell sx={{ ...BODY_CELL_SX, color: 'success.main' }}>₹{formatCurrency(inv.totalReceived)}</TableCell>
                          )}
                          {visibleColumns.balance && (
                            <TableCell sx={{ ...BODY_CELL_SX, color: inv.balance > 0 ? 'error.main' : 'text.primary' }}>
                              ₹{formatCurrency(inv.balance)}
                            </TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell sx={BODY_CELL_SX}>
                              <StatusBadge status={invoiceStatusToBadgeType(inv.status) as StatusType} />
                            </TableCell>
                          )}
                          <TableCell
                            align="right"
                            sx={{ ...BODY_CELL_SX, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RowActions
                              inv={inv}
                              onView={() => setDetailId(inv.id)}
                              onPay={() => setPaymentInv(inv)}
                              onSend={() => setSendTarget(inv)}
                              onPdf={() => showToast({ title: 'PDF download (placeholder)', variant: 'success' })}
                            />
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

      <CreateInvoiceDrawer
        open={drawerCreate}
        onClose={() => setDrawerCreate(false)}
        mode="create"
        onSaved={reload}
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
        onEdit={(inv) => {
          setDetailId(null)
          dispatch(clearSelected())
          setDrawerEdit(inv)
        }}
        onRecordPayment={(inv) => setPaymentInv(inv)}
        onSend={(inv) => setSendTarget(inv)}
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

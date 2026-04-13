import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Box,
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
} from '@mui/material'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import { TrendingDown, Plus, MoreHorizontal, Eye, Pencil, Banknote } from 'lucide-react'
import dayjs from 'dayjs'
import { ListingTemplate } from '@/components/templates'
import type { FilterField, ColumnItem } from '@/components/templates/ListingTemplate'
import { StatusBadge, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setFilters,
  setSortConfig,
  clearSelectedPO,
  clearSelectedInvoice,
  setPage,
  setPageSize,
} from '@/slices/payables/reducer'
import type { PayablesViewTab } from '@/slices/payables/reducer'
import { fetchPOs, fetchVendorInvoices, issueVendorPO } from '@/slices/payables/thunk'
import { fetchVendors } from '@/slices/vendors/thunk'
import { fetchProjects } from '@/slices/projects/thunk'
import type { VendorInvoice, VendorPO } from '@/slices/payables/reducer'
import { formatInr } from '@/utils/formatters'
import { tokens } from '@/design-system/tokens'
import { VendorPODrawer } from './components/VendorPODrawer'
import { VendorInvoiceDrawer } from './components/VendorInvoiceDrawer'
import { VendorPaymentModal } from './components/VendorPaymentModal'
import { VendorPODetailDrawer, poStatusToBadgeType } from './components/VendorPODetailDrawer'
import {
  VendorInvoiceDetailDrawer,
  vendorInvoiceStatusToBadgeType,
} from './components/VendorInvoiceDetailDrawer'

function isDueOverdue(inv: VendorInvoice): boolean {
  if (inv.status === 'paid' || inv.balance <= 0) return false
  return dayjs(inv.dueDate).isBefore(dayjs(), 'day')
}

type InvoiceVisibleColumns = {
  vendorName: boolean
  projectName: boolean
  poNo: boolean
  invoiceDate: boolean
  dueDate: boolean
  totalAmount: boolean
  tdsDeducted: boolean
  totalPaid: boolean
  balance: boolean
  status: boolean
}

function invoiceTableColumnCount(v: InvoiceVisibleColumns): number {
  return 1 + Object.values(v).filter(Boolean).length + 1
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

function PORowActions({
  po,
  onView,
  onEdit,
  onIssue,
}: {
  po: VendorPO
  onView: () => void
  onEdit: () => void
  onIssue: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const canEdit = po.status === 'draft'
  const canIssue = po.status === 'draft'

  return (
    <>
      <MuiIconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
        sx={{ color: tokens.color.neutral[400] }}
      >
        <MoreHorizontal size={16} />
      </MuiIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onView(); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
          <Eye size={14} /> View
        </MenuItem>
        {canEdit && (
          <MenuItem onClick={() => { onEdit(); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Pencil size={14} /> Edit
          </MenuItem>
        )}
        {canIssue && (
          <MenuItem onClick={() => { onIssue(); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Banknote size={14} /> Issue PO
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

function InvoiceRowActions({
  inv,
  onView,
  onEdit,
  onPay,
}: {
  inv: VendorInvoice
  onView: () => void
  onEdit: () => void
  onPay: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const canEdit = inv.status === 'draft'
  const canPay = inv.status !== 'paid' && inv.status !== 'draft'

  return (
    <>
      <MuiIconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
        sx={{ color: tokens.color.neutral[400] }}
      >
        <MoreHorizontal size={16} />
      </MuiIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onView(); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
          <Eye size={14} /> View
        </MenuItem>
        {canEdit && (
          <MenuItem onClick={() => { onEdit(); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Pencil size={14} /> Edit
          </MenuItem>
        )}
        {canPay && (
          <MenuItem onClick={() => { onPay(); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Banknote size={14} /> Record Payment
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default function PayablesPage() {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  const {
    purchaseOrders,
    vendorInvoices,
    filters,
    sortConfig,
    pagination,
    posListLoading,
    invoicesListLoading,
  } = useAppSelector((s) => s.payables)
  const vendors = useAppSelector((s) => s.vendors.items)
  const projects = useAppSelector((s) => s.projects.items)

  const [drawerPOCreate, setDrawerPOCreate] = useState(false)
  const [drawerPOEdit, setDrawerPOEdit] = useState<VendorPO | null>(null)
  const [drawerInvCreate, setDrawerInvCreate] = useState(false)
  const [drawerInvEdit, setDrawerInvEdit] = useState<VendorInvoice | null>(null)
  const [detailPoId, setDetailPoId] = useState<string | null>(null)
  const [detailInvId, setDetailInvId] = useState<string | null>(null)
  const [paymentInv, setPaymentInv] = useState<VendorInvoice | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [visibleColumns, setVisibleColumns] = useState<InvoiceVisibleColumns>({
    vendorName: true,
    projectName: true,
    poNo: true,
    invoiceDate: true,
    dueDate: true,
    totalAmount: true,
    tdsDeducted: true,
    totalPaid: true,
    balance: true,
    status: true,
  })
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadingInvoices = invoicesListLoading
  const loadingPOs = posListLoading

  const columnsConfig: ColumnItem[] = useMemo(
    () => [
      { field: 'vendorName', label: 'Vendor', visible: visibleColumns.vendorName },
      { field: 'projectName', label: 'Project', visible: visibleColumns.projectName },
      { field: 'poNo', label: 'PO No', visible: visibleColumns.poNo },
      { field: 'invoiceDate', label: 'Invoice date', visible: visibleColumns.invoiceDate },
      { field: 'dueDate', label: 'Due date', visible: visibleColumns.dueDate },
      { field: 'totalAmount', label: 'Amount', visible: visibleColumns.totalAmount },
      { field: 'tdsDeducted', label: 'TDS', visible: visibleColumns.tdsDeducted },
      { field: 'totalPaid', label: 'Paid', visible: visibleColumns.totalPaid },
      { field: 'balance', label: 'Balance', visible: visibleColumns.balance },
      { field: 'status', label: 'Status', visible: visibleColumns.status },
    ],
    [visibleColumns],
  )

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    const key = field as keyof InvoiceVisibleColumns
    setVisibleColumns((prev) => (key in prev ? { ...prev, [key]: visible } : prev))
  }

  const invColCount = useMemo(() => invoiceTableColumnCount(visibleColumns), [visibleColumns])

  function reload() {
    dispatch(fetchPOs({ page: 1, pageSize: 200 }))
    dispatch(fetchVendorInvoices({ page: 1, pageSize: 200 }))
  }

  useEffect(() => {
    dispatch(fetchVendors({}))
    dispatch(fetchProjects({}))
    reload()
    setActiveFilters({
      vendorId: '',
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

  const vendorOpts = useMemo(
    () => [{ label: 'All vendors', value: '' }, ...vendors.map((v) => ({ label: v.name, value: v.id }))],
    [vendors],
  )
  const projectOpts = useMemo(
    () => [{ label: 'All projects', value: '' }, ...projects.map((p) => ({ label: p.name, value: p.id }))],
    [projects],
  )

  const filterConfig: FilterField[] = useMemo(
    () => [
      { field: 'vendorId', label: 'Vendor', type: 'select', options: vendorOpts },
      { field: 'projectId', label: 'Project', type: 'select', options: projectOpts },
      { field: 'dateFrom', label: 'Date from (YYYY-MM-DD)', type: 'text' },
      { field: 'dateTo', label: 'Date to (YYYY-MM-DD)', type: 'text' },
      { field: 'amountMin', label: 'Amount min', type: 'text' },
      { field: 'amountMax', label: 'Amount max', type: 'text' },
    ],
    [vendorOpts, projectOpts],
  )

  const viewTab = filters.viewTab

  const invoiceBaseFiltered = useMemo(() => {
    let list = [...vendorInvoices]
    const q = filters.search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          i.invoiceNo.toLowerCase().includes(q) ||
          i.vendorName.toLowerCase().includes(q) ||
          i.projectName.toLowerCase().includes(q) ||
          (i.poNo?.toLowerCase().includes(q) ?? false),
      )
    }
    if (filters.vendorId) list = list.filter((i) => i.vendorId === filters.vendorId)
    if (filters.projectId) list = list.filter((i) => i.projectId === filters.projectId)
    if (filters.dateFrom) list = list.filter((i) => i.invoiceDate >= filters.dateFrom)
    if (filters.dateTo) list = list.filter((i) => i.invoiceDate <= filters.dateTo)
    const amin = Number(filters.amountMin)
    if (filters.amountMin !== '' && !Number.isNaN(amin)) list = list.filter((i) => i.totalAmount >= amin)
    const amax = Number(filters.amountMax)
    if (filters.amountMax !== '' && !Number.isNaN(amax)) list = list.filter((i) => i.totalAmount <= amax)
    return list
  }, [vendorInvoices, filters])

  const invoiceTabFiltered = useMemo(() => {
    if (viewTab === 'all') return invoiceBaseFiltered
    if (viewTab === 'invoices') return invoiceBaseFiltered.filter((i) => i.status !== 'draft')
    if (viewTab === 'outstanding') return invoiceBaseFiltered.filter((i) => i.balance > 0.01)
    return invoiceBaseFiltered
  }, [invoiceBaseFiltered, viewTab])

  const sortedInvoiceRows = useMemo(() => {
    const f = sortConfig.field
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    const list = [...invoiceTabFiltered]
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
      } else if (f === 'vendorName') {
        av = a.vendorName.toLowerCase()
        bv = b.vendorName.toLowerCase()
      } else if (f === 'invoiceNo') {
        av = a.invoiceNo.toLowerCase()
        bv = b.invoiceNo.toLowerCase()
      } else if (f === 'balance') {
        av = a.balance
        bv = b.balance
      }
      if (typeof av === 'number' && typeof bv === 'number') return av === bv ? 0 : av > bv ? dir : -dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return list
  }, [invoiceTabFiltered, sortConfig])

  const poFiltered = useMemo(() => {
    let list = [...purchaseOrders]
    const q = filters.search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.poNo.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.projectName.toLowerCase().includes(q),
      )
    }
    if (filters.vendorId) list = list.filter((p) => p.vendorId === filters.vendorId)
    if (filters.projectId) list = list.filter((p) => p.projectId === filters.projectId)
    if (filters.dateFrom) list = list.filter((p) => p.poDate >= filters.dateFrom)
    if (filters.dateTo) list = list.filter((p) => p.poDate <= filters.dateTo)
    return list
  }, [purchaseOrders, filters])

  const sortedPORows = useMemo(() => {
    const f = sortConfig.field
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    const list = [...poFiltered]
    if (!f) {
      list.sort((a, b) => b.poDate.localeCompare(a.poDate))
      return list
    }
    list.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (f === 'poNo') {
        av = a.poNo.toLowerCase()
        bv = b.poNo.toLowerCase()
      } else if (f === 'poDate') {
        av = a.poDate
        bv = b.poDate
      } else if (f === 'totalValue') {
        av = a.totalValue
        bv = b.totalValue
      } else if (f === 'vendorName') {
        av = a.vendorName.toLowerCase()
        bv = b.vendorName.toLowerCase()
      }
      if (typeof av === 'number' && typeof bv === 'number') return av === bv ? 0 : av > bv ? dir : -dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return list
  }, [poFiltered, sortConfig])

  const pageSize = pagination.pageSize
  const pageIdx = pagination.page - 1

  const pagedInvoices = useMemo(
    () => sortedInvoiceRows.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize),
    [sortedInvoiceRows, pageIdx, pageSize],
  )

  const pagedPOs = useMemo(
    () => sortedPORows.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize),
    [sortedPORows, pageIdx, pageSize],
  )

  const tabCounts = useMemo(() => {
    return {
      all: invoiceBaseFiltered.length,
      po: poFiltered.length,
      invoices: invoiceBaseFiltered.filter((i) => i.status !== 'draft').length,
      outstanding: invoiceBaseFiltered.filter((i) => i.balance > 0.01).length,
    }
  }, [invoiceBaseFiltered, poFiltered])

  const kpis = useMemo(() => {
    const totalPayables = vendorInvoices.reduce((s, i) => s + i.totalAmount, 0)
    const paidAmount = vendorInvoices.reduce((s, i) => s + i.totalPaid, 0)
    const outstanding = vendorInvoices.filter((i) => i.balance > 0.01).reduce((s, i) => s + i.balance, 0)
    const overdue = vendorInvoices
      .filter((i) => i.balance > 0.01 && (i.status === 'overdue' || isDueOverdue(i)))
      .reduce((s, i) => s + i.balance, 0)
    return { totalPayables, paidAmount, outstanding, overdue }
  }, [vendorInvoices])

  const statCards = [
    { label: 'Total payables', value: `₹${kpis.totalPayables.toLocaleString('en-IN')}`, color: 'default' as const },
    { label: 'Paid amount', value: `₹${kpis.paidAmount.toLocaleString('en-IN')}`, color: 'success' as const },
    { label: 'Outstanding', value: `₹${kpis.outstanding.toLocaleString('en-IN')}`, color: 'warning' as const },
    { label: 'Overdue', value: `₹${kpis.overdue.toLocaleString('en-IN')}`, color: 'error' as const },
  ]

  const tabs = [
    { label: 'All', value: 'all', count: tabCounts.all },
    { label: 'PO', value: 'po', count: tabCounts.po },
    { label: 'Invoices', value: 'invoices', count: tabCounts.invoices },
    { label: 'Outstanding', value: 'outstanding', count: tabCounts.outstanding },
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
        vendorId: String(next.vendorId ?? ''),
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
        vendorId: '',
        projectId: '',
        dateFrom: '',
        dateTo: '',
        amountMin: '',
        amountMax: '',
      }),
    )
  }

  function handleTabChange(v: string) {
    dispatch(setFilters({ viewTab: v as PayablesViewTab }))
    dispatch(setPage(1))
    if (v === 'outstanding') {
      dispatch(setSortConfig({ field: 'dueDate', direction: 'asc' }))
    }
  }

  function handleSort(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
  }

  async function handleIssuePOFromRow(po: VendorPO) {
    try {
      await dispatch(issueVendorPO(po.id)).unwrap()
      showToast({ title: 'PO issued', variant: 'success' })
      reload()
    } catch (e) {
      showToast({ title: String(e), variant: 'error' })
    }
  }

  const listCount =
    viewTab === 'po' ? sortedPORows.length : sortedInvoiceRows.length

  const detailPoOpen = Boolean(detailPoId)
  const detailInvOpen = Boolean(detailInvId)

  return (
    <>
      <ListingTemplate
        icon={<TrendingDown size={20} />}
        title="Costs & Payables"
        subtitle="Vendor PO → invoice → payment → outstanding"
        primaryAction={{
          label: '+ Add Vendor Invoice',
          onClick: () => setDrawerInvCreate(true),
          startIcon: <Plus size={16} />,
        }}
        secondaryActions={[
          { label: 'Create Vendor PO', onClick: () => setDrawerPOCreate(true), startIcon: <Plus size={16} /> },
          {
            label: 'Record Payment',
            onClick: () => {
              setPaymentInv(null)
              setPaymentModalOpen(true)
            },
            startIcon: <Banknote size={16} />,
          },
        ]}
        statCards={statCards}
        tabs={tabs}
        activeTab={viewTab}
        onTabChange={handleTabChange}
        searchPlaceholder="Invoice no. / vendor / project / PO…"
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        showExport
        onExport={() => showToast({ title: 'Export started (placeholder)', variant: 'success' })}
        pageSize={pagination.pageSize}
        totalCount={listCount}
        page={pagination.page - 1}
        onPageChange={(p) => dispatch(setPage(p + 1))}
        onPageSizeChange={(s) => dispatch(setPageSize(s))}
        columns={viewTab === 'po' ? undefined : columnsConfig}
        onColumnVisibilityChange={viewTab === 'po' ? undefined : handleColumnVisibilityChange}
      >
        {viewTab === 'po' ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <SortHeader label="PO No" field="poNo" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <SortHeader label="Vendor" field="vendorName" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Project</TableCell>
                  <SortHeader label="PO date" field="poDate" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Valid until</TableCell>
                  <SortHeader label="Total" field="totalValue" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ width: 48, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingPOs
                  ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton height={24} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : pagedPOs.map((po) => (
                      <TableRow
                        key={po.id}
                        hover
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: hoverBg } }}
                        onClick={() => setDetailPoId(po.id)}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{po.poNo}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{po.vendorName}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{po.projectName}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{dayjs(po.poDate).format('DD MMM YYYY')}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {po.validUntil ? dayjs(po.validUntil).format('DD MMM YYYY') : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>₹{formatInr(po.totalValue)}</TableCell>
                        <TableCell>
                          <StatusBadge status={poStatusToBadgeType(po.status) as StatusType} />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PORowActions
                            po={po}
                            onView={() => setDetailPoId(po.id)}
                            onEdit={() => setDrawerPOEdit(po)}
                            onIssue={() => void handleIssuePOFromRow(po)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : viewTab === 'outstanding' ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <SortHeader label="Vendor" field="vendorName" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <SortHeader label="Invoice" field="invoiceNo" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <SortHeader label="Total" field="totalAmount" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Paid</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Balance</TableCell>
                  <SortHeader label="Due date" field="dueDate" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ width: 48, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingInvoices
                  ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton height={24} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : pagedInvoices.map((inv) => {
                      const dueRed = inv.status === 'overdue' || isDueOverdue(inv)
                      return (
                        <TableRow
                          key={inv.id}
                          hover
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: hoverBg } }}
                          onClick={() => setDetailInvId(inv.id)}
                        >
                          <TableCell sx={{ fontSize: 12 }}>{inv.vendorName}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoiceNo}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>₹{formatInr(inv.totalAmount)}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: 'success.main' }}>₹{formatInr(inv.totalPaid)}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: dueRed ? 'error.main' : 'error.main' }}>
                            ₹{formatInr(inv.balance)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, color: dueRed ? 'error.main' : 'text.primary' }}>
                            {dayjs(inv.dueDate).format('DD MMM YYYY')}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={vendorInvoiceStatusToBadgeType(inv.status) as StatusType} />
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <InvoiceRowActions
                              inv={inv}
                              onView={() => setDetailInvId(inv.id)}
                              onEdit={() => setDrawerInvEdit(inv)}
                              onPay={() => {
                                setPaymentInv(inv)
                                setPaymentModalOpen(true)
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <SortHeader label="Invoice No" field="invoiceNo" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  {visibleColumns.vendorName && (
                    <SortHeader label="Vendor" field="vendorName" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.projectName && (
                    <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Project</TableCell>
                  )}
                  {visibleColumns.poNo && (
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>PO No</TableCell>
                  )}
                  {visibleColumns.invoiceDate && (
                    <SortHeader label="Invoice date" field="invoiceDate" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.dueDate && (
                    <SortHeader label="Due date" field="dueDate" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.totalAmount && (
                    <SortHeader label="Amount" field="totalAmount" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.tdsDeducted && (
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>TDS</TableCell>
                  )}
                  {visibleColumns.totalPaid && (
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Paid</TableCell>
                  )}
                  {visibleColumns.balance && (
                    <SortHeader label="Balance" field="balance" sortField={sortConfig.field} sortDirection={sortConfig.direction} onSort={handleSort} />
                  )}
                  {visibleColumns.status && (
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Status</TableCell>
                  )}
                  <TableCell sx={{ width: 48, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingInvoices
                  ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(invColCount)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton height={24} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : pagedInvoices.map((inv) => {
                      const dueRed = inv.status === 'overdue' || isDueOverdue(inv)
                      return (
                        <TableRow
                          key={inv.id}
                          hover
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: hoverBg } }}
                          onClick={() => setDetailInvId(inv.id)}
                        >
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoiceNo}</TableCell>
                          {visibleColumns.vendorName && <TableCell sx={{ fontSize: 12 }}>{inv.vendorName}</TableCell>}
                          {visibleColumns.projectName && (
                            <TableCell sx={{ fontSize: 12 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {inv.projectName}
                              </Typography>
                            </TableCell>
                          )}
                          {visibleColumns.poNo && (
                            <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{inv.poNo ?? '—'}</TableCell>
                          )}
                          {visibleColumns.invoiceDate && (
                            <TableCell sx={{ fontSize: 12 }}>{dayjs(inv.invoiceDate).format('DD MMM YYYY')}</TableCell>
                          )}
                          {visibleColumns.dueDate && (
                            <TableCell sx={{ fontSize: 12, color: dueRed ? 'error.main' : 'text.primary' }}>
                              {dayjs(inv.dueDate).format('DD MMM YYYY')}
                            </TableCell>
                          )}
                          {visibleColumns.totalAmount && (
                            <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>₹{formatInr(inv.totalAmount)}</TableCell>
                          )}
                          {visibleColumns.tdsDeducted && (
                            <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>₹{formatInr(inv.tdsDeducted)}</TableCell>
                          )}
                          {visibleColumns.totalPaid && (
                            <TableCell sx={{ fontSize: 12, color: 'success.main' }}>₹{formatInr(inv.totalPaid)}</TableCell>
                          )}
                          {visibleColumns.balance && (
                            <TableCell sx={{ fontSize: 12, color: inv.balance > 0 ? 'error.main' : 'text.primary' }}>
                              ₹{formatInr(inv.balance)}
                            </TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell>
                              <StatusBadge status={vendorInvoiceStatusToBadgeType(inv.status) as StatusType} />
                            </TableCell>
                          )}
                          <TableCell
                            align="right"
                            sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <InvoiceRowActions
                              inv={inv}
                              onView={() => setDetailInvId(inv.id)}
                              onEdit={() => setDrawerInvEdit(inv)}
                              onPay={() => {
                                setPaymentInv(inv)
                                setPaymentModalOpen(true)
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ListingTemplate>

      <VendorPODrawer
        open={drawerPOCreate}
        onClose={() => setDrawerPOCreate(false)}
        mode="create"
        onSaved={reload}
      />
      <VendorPODrawer
        open={!!drawerPOEdit}
        onClose={() => setDrawerPOEdit(null)}
        mode="edit"
        purchaseOrder={drawerPOEdit}
        onSaved={reload}
      />

      <VendorInvoiceDrawer
        open={drawerInvCreate}
        onClose={() => setDrawerInvCreate(false)}
        mode="create"
        onSaved={reload}
      />
      <VendorInvoiceDrawer
        open={!!drawerInvEdit}
        onClose={() => setDrawerInvEdit(null)}
        mode="edit"
        invoice={drawerInvEdit}
        onSaved={reload}
      />

      <VendorPODetailDrawer
        open={detailPoOpen}
        onClose={() => {
          setDetailPoId(null)
          dispatch(clearSelectedPO())
        }}
        poId={detailPoId}
        onEdit={(po) => {
          setDetailPoId(null)
          dispatch(clearSelectedPO())
          setDrawerPOEdit(po)
        }}
        onIssued={reload}
      />

      <VendorInvoiceDetailDrawer
        open={detailInvOpen}
        onClose={() => {
          setDetailInvId(null)
          dispatch(clearSelectedInvoice())
        }}
        invoiceId={detailInvId}
        onEdit={(v) => {
          setDetailInvId(null)
          dispatch(clearSelectedInvoice())
          setDrawerInvEdit(v)
        }}
        onRecordPayment={(v) => {
          setPaymentInv(v)
          setPaymentModalOpen(true)
        }}
      />

      <VendorPaymentModal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false)
          setPaymentInv(null)
        }}
        invoice={paymentInv}
        invoiceOptions={vendorInvoices}
        onRecorded={reload}
      />
    </>
  )
}

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
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
  Tooltip,
  Card as MuiCard,
  Divider,
} from '@mui/material'
import {
  People,
  FolderOpen,
  TrendingUp,
  AccountBalance,
  Business,
  Circle,
  VerifiedUser,
  LocationOn,
} from '@mui/icons-material'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import { Building2, Plus, MoreHorizontal, Eye, Pencil, Trash2, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers, deleteCustomer } from '../../slices/customers/thunk'
import { setFilters, resetFilters, setPage, setSortConfig } from '../../slices/customers/reducer'
import type { Customer } from '../../slices/customers/reducer'
import { customersApi } from '../../api/customersApi'
import { ListingTemplate } from '../../components/templates'
import type { FilterField, ColumnItem } from '../../components/templates/ListingTemplate'
import { CustomerDrawer } from './CustomerDrawer'
import { StatusBadge, useToast, Modal, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { getInitials, getAvatarColor, formatCurrency, toSlug } from '../../utils/formatters'
import { tokens } from '@/design-system/tokens'

// ─── Avatar Cell ──────────────────────────────────────────────────────────────

function CustomerAvatar({ name }: { name: string }) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: getAvatarColor(name).bg,
        color: getAvatarColor(name).text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </Box>
  )
}

// ─── Row Actions Menu ─────────────────────────────────────────────────────────

interface RowActionsProps {
  customer: Customer
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function RowActions({ customer, onView, onEdit, onDelete }: RowActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  function open(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }
  function close() { setAnchor(null) }

  return (
    <>
      <MuiIconButton size="small" onClick={open} sx={{ color: tokens.color.neutral[400] }}>
        <MoreHorizontal size={16} />
      </MuiIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => { onView(); close() }} sx={{ fontSize: 13, gap: 1 }}>
          <Eye size={14} /> View
        </MenuItem>
        <MenuItem onClick={() => { onEdit(); close() }} sx={{ fontSize: 13, gap: 1 }}>
          <Pencil size={14} /> Edit
        </MenuItem>
        <Divider />
        {customer.activeProjects > 0 ? (
          <Tooltip title="Cannot delete customer with active projects" placement="left">
            <span>
              <MenuItem disabled sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
                <Trash2 size={14} /> Delete
              </MenuItem>
            </span>
          </Tooltip>
        ) : (
          <MenuItem onClick={() => { onDelete(); close() }} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
            <Trash2 size={14} /> Delete
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

// ─── Sort Header Cell ──────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string
  field: string
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  sx?: object
}

function SortHeader({ label, field, sortField, sortDirection, onSort, sx }: SortHeaderProps) {
  const isActive = sortField === field
  function handleClick() {
    if (isActive) {
      onSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(field, 'asc')
    }
  }
  return (
    <TableCell
      sx={{
        fontSize: 11,
        fontWeight: isActive ? 700 : 600,
        color: isActive ? 'primary.main' : 'text.secondary',
        py: '8px',
        px: '14px',
        borderBottom: `2px solid ${tokens.color.neutral[100]}`,
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { color: 'primary.main' },
        ...sx,
      }}
      onClick={handleClick}
    >
      <Stack direction="row" alignItems="center" gap="2px">
        {label}
        {isActive
          ? sortDirection === 'asc'
            ? <KeyboardArrowUpIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            : <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          : <UnfoldMoreIcon sx={{ fontSize: 14, color: tokens.color.neutral[300] }} />
        }
      </Stack>
    </TableCell>
  )
}

// ─── Customer Table ───────────────────────────────────────────────────────────

interface CustomerTableProps {
  items: Customer[]
  loading: boolean
  visibleColumns: Record<string, boolean>
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onView: (id: string) => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

function CustomerTable({
  items, loading, visibleColumns, sortField, sortDirection, onSort, onView, onEdit, onDelete,
}: CustomerTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <SortHeader
              label="Customer"
              field="name"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
            />
            {visibleColumns.contactPerson && (
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', py: '8px', px: '14px', borderBottom: `2px solid ${tokens.color.neutral[100]}` }}>
                Contact Person
              </TableCell>
            )}
            {visibleColumns.location && (
              <SortHeader
                label="Location"
                field="city"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sx={{ display: { xs: 'none', md: 'table-cell' } }}
              />
            )}
            {visibleColumns.projects && (
              <SortHeader
                label="Projects"
                field="activeProjects"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sx={{ display: { xs: 'none', lg: 'table-cell' } }}
              />
            )}
            {visibleColumns.receivables && (
              <SortHeader
                label="Receivables"
                field="totalReceivables"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sx={{ display: { xs: 'none', lg: 'table-cell' } }}
              />
            )}
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', py: '8px', px: '14px', borderBottom: `2px solid ${tokens.color.neutral[100]}` }}>
              Status
            </TableCell>
            <TableCell sx={{ width: 48, py: '8px', px: '8px', borderBottom: `2px solid ${tokens.color.neutral[100]}` }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && (
            [...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(7)].map((__, j) => (
                  <TableCell key={j} sx={{ py: '10px', px: '14px' }}>
                    <Skeleton variant="text" width="80%" height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} sx={{ border: 0 }}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Building2 size={32} color={tokens.color.neutral[300]} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                    No customers found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add your first customer to get started
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}

          {!loading && items.map((customer) => (
            <TableRow
              key={customer.id}
              onClick={() => onView(customer.id)}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: hoverBg },
                '&:last-child td': { border: 0 },
              }}
            >
              {/* Customer */}
              <TableCell sx={{ py: '10px', px: '14px' }}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <CustomerAvatar name={customer.name} />
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12, lineHeight: 1.3 }}>
                      {customer.name}
                    </Typography>
                    <Stack direction="row" gap={0.5} sx={{ mt: '3px' }}>
                      <MuiChip
                        label={customer.type}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: '6px' } }}
                      />
                      <MuiChip
                        label={customer.gstStatus}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: '6px' } }}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </TableCell>

              {/* Contact Person */}
              {visibleColumns.contactPerson && (
                <TableCell sx={{ py: '10px', px: '14px' }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12 }}>
                    {customer.contactPerson}
                  </Typography>
                  <Stack direction="row" alignItems="center" gap="3px" sx={{ mt: '3px' }}>
                    <Phone size={11} color={tokens.color.neutral[400]} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {customer.phone}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap="3px">
                    <Mail size={11} color={tokens.color.neutral[400]} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {customer.email}
                    </Typography>
                  </Stack>
                </TableCell>
              )}

              {/* Location */}
              {visibleColumns.location && (
                <TableCell sx={{ py: '10px', px: '14px', display: { xs: 'none', md: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {customer.city}, {customer.state}
                  </Typography>
                </TableCell>
              )}

              {/* Projects */}
              {visibleColumns.projects && (
                <TableCell sx={{ py: '10px', px: '14px', display: { xs: 'none', lg: 'table-cell' } }}>
                  {customer.activeProjects === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
                      0 Active
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ fontSize: 12 }}>
                      {customer.activeProjects} Active
                    </Typography>
                  )}
                </TableCell>
              )}

              {/* Receivables */}
              {visibleColumns.receivables && (
                <TableCell sx={{ py: '10px', px: '14px', display: { xs: 'none', lg: 'table-cell' } }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12 }}>
                    ₹{formatCurrency(customer.totalReceivables)}
                  </Typography>
                </TableCell>
              )}

              {/* Status */}
              <TableCell sx={{ py: '10px', px: '14px' }}>
                <StatusBadge status={customer.status.toLowerCase() as StatusType} />
              </TableCell>

              {/* Actions */}
              <TableCell sx={{ py: '6px', px: '8px' }} onClick={(e) => e.stopPropagation()}>
                <RowActions
                  customer={customer}
                  onView={() => onView(customer.id)}
                  onEdit={() => onEdit(customer)}
                  onDelete={() => onDelete(customer)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

interface GridCardProps {
  customer: Customer
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function CustomerGridCard({ customer, onView, onEdit, onDelete }: GridCardProps) {
  return (
    <MuiCard
      elevation={0}
      onClick={onView}
      sx={{
        p: 2,
        border: `1px solid ${tokens.color.neutral[100]}`,
        borderRadius: 2,
        cursor: 'pointer',
        position: 'relative',
        '&:hover': { borderColor: tokens.color.primary[200] },
      }}
    >
      <Box sx={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
        <RowActions customer={customer} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </Box>

      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
        <CustomerAvatar name={customer.name} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.3, pr: 3 }}>
            {customer.name}
          </Typography>
          <StatusBadge status={customer.status.toLowerCase() as StatusType} />
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" gap="4px" sx={{ mb: '4px' }}>
        <Phone size={11} color={tokens.color.neutral[400]} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          {customer.phone}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="center" gap="4px" sx={{ mb: 1 }}>
        <Mail size={11} color={tokens.color.neutral[400]} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          {customer.email}
        </Typography>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mb: 1.5 }}>
        {customer.city}, {customer.state}
      </Typography>

      <Divider sx={{ mb: 1.5 }} />

      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Projects
          </Typography>
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{ fontSize: 12, color: customer.activeProjects > 0 ? 'primary.main' : 'text.disabled' }}
          >
            {customer.activeProjects} Active
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Receivables
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12 }}>
            ₹{formatCurrency(customer.totalReceivables)}
          </Typography>
        </Box>
      </Stack>
    </MuiCard>
  )
}

// ─── Simple Pagination ────────────────────────────────────────────────────────

interface SimplePaginationProps {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}

function SimplePagination({ page, pageSize, total, onPage }: SimplePaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const from = Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      gap={1}
      sx={{ p: '10px 14px', borderTop: `1px solid ${tokens.color.neutral[100]}` }}
    >
      <Typography variant="caption" color="text.secondary">
        {total === 0 ? '0' : `${from}–${to}`} of {total}
      </Typography>
      <MuiIconButton size="small" disabled={page <= 1} onClick={() => onPage(page - 1)} sx={{ p: '4px' }}>
        <ChevronLeft size={16} />
      </MuiIconButton>
      <MuiIconButton size="small" disabled={page >= totalPages} onClick={() => onPage(page + 1)} sx={{ p: '4px' }}>
        <ChevronRight size={16} />
      </MuiIconButton>
    </Stack>
  )
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  customer: Customer | null
  onConfirm: () => void
  onClose: () => void
}

function ConfirmDeleteDialog({ customer, onConfirm, onClose }: ConfirmDeleteProps) {
  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title="Delete Customer"
      size="xs"
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="outlined" color="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="contained" color="error" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </Stack>
      }
    >
      <Typography variant="body2">
        Are you sure you want to delete <strong>{customer?.name}</strong>? This action cannot be undone.
      </Typography>
    </Modal>
  )
}

// ─── CustomersPage ────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const dispatch = useAppDispatch()
  const { items, loading, pagination, filters, sortConfig } = useAppSelector((s) => s.customers)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 })
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [visibleColumns, setVisibleColumns] = useState({
    contactPerson: true,
    location: true,
    projects: true,
    receivables: true,
  })

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Initial fetch ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchCustomers({ page: 1, pageSize: pagination.pageSize }))
    void Promise.all([
      customersApi.getAll({ pageSize: 1 }),
      customersApi.getAll({ pageSize: 1, status: 'Active' }),
      customersApi.getAll({ pageSize: 1, status: 'Inactive' }),
    ]).then(([all, active, inactive]) => {
      setCounts({
        all: (all.data as { total: number }).total,
        active: (active.data as { total: number }).total,
        inactive: (inactive.data as { total: number }).total,
      })
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // ── Computed ──────────────────────────────────────────────────────
  const activeTabKey = !filters.status ? 'all' : filters.status === 'Active' ? 'active' : 'inactive'

  const tabs = [
    { label: 'All Customers', value: 'all', count: counts.all },
    { label: 'Active', value: 'active', count: counts.active },
    { label: 'Inactive', value: 'inactive', count: counts.inactive },
  ]

  // Sort items client-side
  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig.field) return 0
    const field = sortConfig.field as keyof Customer
    const aVal = a[field]
    const bVal = b[field]
    if (aVal === bVal) return 0
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
    }
    const aStr = String(aVal ?? '').toLowerCase()
    const bStr = String(bVal ?? '').toLowerCase()
    const cmp = aStr < bStr ? -1 : 1
    return sortConfig.direction === 'asc' ? cmp : -cmp
  })

  // KPI stat cards
  const statCards = [
    {
      label: 'TOTAL CUSTOMERS',
      value: items.length,
      variant: 'default' as const,
      icon: <People sx={{ fontSize: 24 }} />,
    },
    {
      label: 'ACTIVE PROJECTS',
      value: items.reduce((sum, c) => sum + c.activeProjects, 0),
      variant: 'success' as const,
      icon: <FolderOpen sx={{ fontSize: 24 }} />,
    },
    {
      label: 'TOTAL RECEIVABLES',
      value: '₹' + formatCurrency(items.reduce((sum, c) => sum + c.totalReceivables, 0)),
      variant: 'teal' as const,
      icon: <TrendingUp sx={{ fontSize: 24 }} />,
    },
    {
      label: 'OUTSTANDING',
      value: '₹' + formatCurrency(
        items.filter((c) => c.status === 'Active').reduce((sum, c) => sum + c.totalReceivables, 0)
      ),
      variant: 'warning' as const,
      icon: <AccountBalance sx={{ fontSize: 24 }} />,
    },
  ]

  // Column visibility config for ListingTemplate
  const columnsConfig: ColumnItem[] = [
    { field: 'contactPerson', label: 'Contact Person', visible: visibleColumns.contactPerson },
    { field: 'location',      label: 'Location',       visible: visibleColumns.location },
    { field: 'projects',      label: 'Projects',       visible: visibleColumns.projects },
    { field: 'receivables',   label: 'Receivables',    visible: visibleColumns.receivables },
  ]

  // Filter config
  const filterConfig: FilterField[] = [
    {
      field: 'status',
      label: 'Status',
      type: 'select',
      icon: <Circle sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
    {
      field: 'type',
      label: 'Customer Type',
      type: 'select',
      icon: <Business sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Company', value: 'Company' },
        { label: 'Individual', value: 'Individual' },
      ],
    },
    {
      field: 'gstStatus',
      label: 'GST Status',
      type: 'select',
      icon: <VerifiedUser sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Registered', value: 'Registered' },
        { label: 'Unregistered', value: 'Unregistered' },
        { label: 'Composition', value: 'Composition' },
        { label: 'SEZ', value: 'SEZ' },
      ],
    },
    {
      field: 'state',
      label: 'State',
      type: 'select',
      icon: <LocationOn sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Karnataka', value: 'Karnataka' },
        { label: 'Maharashtra', value: 'Maharashtra' },
        { label: 'Delhi', value: 'Delhi' },
        { label: 'Telangana', value: 'Telangana' },
        { label: 'Tamil Nadu', value: 'Tamil Nadu' },
      ],
    },
  ]

  // ── Handlers ──────────────────────────────────────────────────────
  function handleTabChange(value: string) {
    const statusMap: Record<string, string> = { all: '', active: 'Active', inactive: 'Inactive' }
    const status = statusMap[value] ?? ''
    setActiveFilters({})
    dispatch(resetFilters())
    dispatch(setFilters({ status }))
    dispatch(setPage(1))
    dispatch(fetchCustomers({
      page: 1,
      pageSize: pagination.pageSize,
      search: filters.search || undefined,
      status: status || undefined,
    }))
  }

  function handleSearchChange(value: string) {
    dispatch(setFilters({ search: value }))
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      dispatch(setPage(1))
      dispatch(fetchCustomers({
        page: 1,
        pageSize: pagination.pageSize,
        search: value || undefined,
        status: filters.status || undefined,
      }))
    }, 300)
  }

  function handleFilterChange(newFilters: Record<string, unknown>) {
    setActiveFilters(newFilters)
    const params: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(newFilters)) {
      params[k] = (v as string) || undefined
    }
    dispatch(setFilters(params as { search?: string; status?: string; type?: string; gstStatus?: string; state?: string }))
    dispatch(setPage(1))
    dispatch(fetchCustomers({ page: 1, pageSize: pagination.pageSize, search: filters.search || undefined, ...params }))
  }

  function handleFilterReset() {
    setActiveFilters({})
    dispatch(resetFilters())
    dispatch(setPage(1))
    dispatch(fetchCustomers({
      page: 1,
      pageSize: pagination.pageSize,
      search: filters.search || undefined,
      status: filters.status || undefined,
    }))
  }

  function handleSortChange(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
  }

  function handlePageChange(page: number) {
    dispatch(setPage(page))
    dispatch(fetchCustomers({
      page,
      pageSize: pagination.pageSize,
      search: filters.search || undefined,
      status: filters.status || undefined,
    }))
  }

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    setVisibleColumns((prev) => ({ ...prev, [field]: visible }))
  }

  function openAddDrawer() {
    setDrawerMode('add')
    setEditingCustomer(null)
    setDrawerOpen(true)
  }

  function openEditDrawer(customer: Customer) {
    setDrawerMode('edit')
    setEditingCustomer(customer)
    setDrawerOpen(true)
  }

  function handleDrawerClose() {
    setDrawerOpen(false)
    setEditingCustomer(null)
  }

  function handleNavigateToCustomer(id: string) {
    const customer = items.find((c) => c.id === id)
    if (customer) {
      navigate(`/customers/${toSlug(customer.name)}`)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await dispatch(deleteCustomer(deleteTarget.id)).unwrap()
      showToast({ title: 'Customer deleted', variant: 'success' })
    } catch (err) {
      showToast({ title: (err as string) || 'Failed to delete customer', variant: 'error' })
    }
    setDeleteTarget(null)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <ListingTemplate
        icon={<Building2 size={20} />}
        title="Customers"
        subtitle="Manage client relationships and billing details"
        primaryAction={{
          label: 'Add Customer',
          onClick: openAddDrawer,
          startIcon: <Plus size={16} strokeWidth={2} />,
        }}
        statCards={statCards}
        showViewToggle
        searchPlaceholder="Search customers..."
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        tabs={tabs}
        activeTab={activeTabKey}
        onTabChange={handleTabChange}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        columns={columnsConfig}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onViewModeChange={setViewMode}
      >
        {viewMode === 'grid' ? (
          <Box
            sx={{
              p: '12px',
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: '12px',
            }}
          >
            {loading ? (
              [...Array(6)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              ))
            ) : sortedItems.length === 0 ? (
              <Box sx={{ gridColumn: '1 / -1', py: 6, textAlign: 'center' }}>
                <Building2 size={32} color={tokens.color.neutral[300]} />
                <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                  No customers found
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Add your first customer to get started
                </Typography>
              </Box>
            ) : (
              sortedItems.map((customer) => (
                <CustomerGridCard
                  key={customer.id}
                  customer={customer}
                  onView={() => navigate(`/customers/${toSlug(customer.name)}`)}
                  onEdit={() => openEditDrawer(customer)}
                  onDelete={() => setDeleteTarget(customer)}
                />
              ))
            )}
          </Box>
        ) : (
          <CustomerTable
            items={sortedItems}
            loading={loading}
            visibleColumns={visibleColumns}
            sortField={sortConfig.field}
            sortDirection={sortConfig.direction}
            onSort={handleSortChange}
            onView={handleNavigateToCustomer}
            onEdit={openEditDrawer}
            onDelete={setDeleteTarget}
          />
        )}

        {pagination.total > 0 && (
          <SimplePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPage={handlePageChange}
          />
        )}
      </ListingTemplate>

      <CustomerDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        mode={drawerMode}
        customer={editingCustomer}
      />

      <ConfirmDeleteDialog
        customer={deleteTarget}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

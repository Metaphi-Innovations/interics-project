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
  Business,
  Circle,
  VerifiedUser,
  LocationOn,
} from '@mui/icons-material'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import { Building2, Plus, MoreHorizontal, Eye, Pencil, FolderPlus, Receipt, Archive, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers, updateCustomer } from '../../slices/customers/thunk'
import { setFilters, resetFilters, setPage, setSortConfig } from '../../slices/customers/reducer'
import type { Customer } from '../../slices/customers/reducer'
import { customersApi } from '../../api/customersApi'
import { ListingTemplate } from '../../components/templates'
import type { FilterField, ColumnItem } from '../../components/templates/ListingTemplate'
import { CustomerDrawer } from './CustomerDrawer'
import { StatusBadge, useToast, Modal, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { getInitials, getAvatarColor, formatCurrency, toSlug } from '../../utils/formatters'
import { getPrimaryContact } from '../../utils/customerContacts'
import { tokens } from '@/design-system/tokens'
import { getSectorTagSx } from '../../utils/sectorTagStyles'

const TABLE_CELL_SX = {
  py: '8px',
  px: '14px',
  verticalAlign: 'top',
} as const

const TABLE_CELL_COMPACT_SX = {
  py: '7px',
  px: '14px',
  verticalAlign: 'top',
} as const

// ─── Listing helpers ──────────────────────────────────────────────────────────

function getTotalProjectCount(customer: Customer): number {
  const fd = customer.financialDetails
  if (fd) return fd.activeProjects + fd.completedProjects
  return customer.activeProjects
}

function getTotalBillAmount(customer: Customer): number {
  return customer.financialDetails?.totalBilled ?? 0
}

function getComplianceLabels(customer: Customer): string[] {
  const labels: string[] = []
  if (customer.msmeRegistered) labels.push('MSME')
  if (customer.gstStatus === 'Registered' || customer.gstin) labels.push('GST')
  if (customer.pan) labels.push('PAN')
  if (customer.gstStatus === 'Composition') labels.push('Composition')
  if (customer.gstStatus === 'SEZ') labels.push('SEZ')
  return labels
}

function getSectorLabel(customer: Customer): string {
  return customer.sector ?? '—'
}

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
  onAddProject: () => void
  onBillingSummary: () => void
  onArchive: () => void
}

function RowActions({ customer, onView, onEdit, onAddProject, onBillingSummary, onArchive }: RowActionsProps) {
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
        <MenuItem onClick={() => { onAddProject(); close() }} sx={{ fontSize: 13, gap: 1 }}>
          <FolderPlus size={14} /> Add Project
        </MenuItem>
        <MenuItem onClick={() => { onBillingSummary(); close() }} sx={{ fontSize: 13, gap: 1 }}>
          <Receipt size={14} /> Billing Summary
        </MenuItem>
        <Divider />
        {customer.status === 'Inactive' ? (
          <Tooltip title="Customer is already archived" placement="left">
            <span>
              <MenuItem disabled sx={{ fontSize: 13, gap: 1 }}>
                <Archive size={14} /> Archive
              </MenuItem>
            </span>
          </Tooltip>
        ) : (
          <MenuItem onClick={() => { onArchive(); close() }} sx={{ fontSize: 13, gap: 1 }}>
            <Archive size={14} /> Archive
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

function ContactPersonCell({ customer }: { customer: Customer }) {
  const primary = getPrimaryContact(customer)
  if (!primary) {
    return (
      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
        —
      </Typography>
    )
  }
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35, wordBreak: 'break-word' }}>
        {primary.name}
        {primary.designation ? (
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 400, color: 'text.secondary' }}>
            {' — '}{primary.designation}
          </Typography>
        ) : null}
      </Typography>
      {primary.phone ? (
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', lineHeight: 1.35 }}>
          {primary.phone}
        </Typography>
      ) : null}
      {primary.email ? (
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', lineHeight: 1.35, wordBreak: 'break-word' }}>
          {primary.email}
        </Typography>
      ) : null}
    </Box>
  )
}

function SectorCell({ customer }: { customer: Customer }) {
  const theme = useTheme()
  const sector = getSectorLabel(customer)
  if (sector === '—') {
    return (
      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
        —
      </Typography>
    )
  }
  const tagMode = theme.palette.mode === 'dark' ? 'dark' : 'light'
  const colors = getSectorTagSx(sector, tagMode)
  return (
    <MuiChip
      label={sector}
      size="small"
      sx={{
        height: 20,
        fontSize: 10,
        borderRadius: '4px',
        bgcolor: colors.bg,
        color: colors.color,
        border: 'none',
        '& .MuiChip-label': { px: '6px' },
      }}
    />
  )
}

function ComplianceCell({ customer }: { customer: Customer }) {
  const labels = getComplianceLabels(customer)
  if (!labels.length) {
    return (
      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
        —
      </Typography>
    )
  }
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
      {labels.map((label) => (
        <MuiChip
          key={label}
          label={label}
          size="small"
          sx={{
            height: 18,
            fontSize: 9,
            fontWeight: 600,
            borderRadius: '4px',
            bgcolor: alpha(tokens.color.primary[500], 0.08),
            color: tokens.color.primary[700],
            '& .MuiChip-label': { px: '5px' },
          }}
        />
      ))}
    </Stack>
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
  onProjects: (customer: Customer) => void
  onAddProject: (customer: Customer) => void
  onBillingSummary: (customer: Customer) => void
  onArchive: (customer: Customer) => void
}

function CustomerTable({
  items,
  loading,
  visibleColumns,
  sortField,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onProjects,
  onAddProject,
  onBillingSummary,
  onArchive,
}: CustomerTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <SortHeader
              label="Client Name"
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
            {visibleColumns.sector && (
              <SortHeader
                label="Sector"
                field="sector"
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
            {visibleColumns.totalBillAmount && (
              <SortHeader
                label="Total Bill Amount"
                field="totalBillAmount"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sx={{ display: { xs: 'none', lg: 'table-cell' } }}
              />
            )}
            {visibleColumns.compliance && (
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', py: '8px', px: '14px', borderBottom: `2px solid ${tokens.color.neutral[100]}`, display: { xs: 'none', md: 'table-cell' } }}>
                Compliance
              </TableCell>
            )}
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', py: '8px', px: '14px', borderBottom: `2px solid ${tokens.color.neutral[100]}` }}>
              Status
            </TableCell>
            <TableCell
              sx={{
                width: 48,
                py: '8px',
                px: '8px',
                fontSize: 11,
                fontWeight: 600,
                color: 'text.secondary',
                borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                verticalAlign: 'bottom',
                whiteSpace: 'nowrap',
              }}
            >
              Action
            </TableCell>
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
              <TableCell colSpan={9} sx={{ border: 0 }}>
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
              {/* Client Name */}
              <TableCell sx={TABLE_CELL_SX}>
                <Stack direction="row" alignItems="center" gap={1.25}>
                  <CustomerAvatar name={customer.name} />
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12, lineHeight: 1.35, wordBreak: 'break-word' }}>
                    {customer.name}
                  </Typography>
                </Stack>
              </TableCell>

              {visibleColumns.contactPerson && (
                <TableCell sx={TABLE_CELL_COMPACT_SX}>
                  <ContactPersonCell customer={customer} />
                </TableCell>
              )}

              {visibleColumns.sector && (
                <TableCell sx={{ ...TABLE_CELL_SX, display: { xs: 'none', md: 'table-cell' } }}>
                  <SectorCell customer={customer} />
                </TableCell>
              )}

              {visibleColumns.projects && (
                <TableCell sx={{ ...TABLE_CELL_SX, display: { xs: 'none', lg: 'table-cell' } }}>
                  {(() => {
                    const count = getTotalProjectCount(customer)
                    const label = `${count} Project${count === 1 ? '' : 's'}`
                    if (count === 0) {
                      return (
                        <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
                          {label}
                        </Typography>
                      )
                    }
                    return (
                      <Typography
                        component="button"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onProjects(customer)
                        }}
                        sx={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'primary.main',
                          cursor: 'pointer',
                          border: 0,
                          bgcolor: 'transparent',
                          p: 0,
                          textAlign: 'left',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {label}
                      </Typography>
                    )
                  })()}
                </TableCell>
              )}

              {visibleColumns.totalBillAmount && (
                <TableCell sx={{ ...TABLE_CELL_SX, display: { xs: 'none', lg: 'table-cell' } }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12 }}>
                    ₹{formatCurrency(getTotalBillAmount(customer))}
                  </Typography>
                </TableCell>
              )}

              {visibleColumns.compliance && (
                <TableCell sx={{ ...TABLE_CELL_SX, display: { xs: 'none', md: 'table-cell' } }}>
                  <ComplianceCell customer={customer} />
                </TableCell>
              )}

              <TableCell sx={TABLE_CELL_SX}>
                <StatusBadge status={customer.status.toLowerCase() as StatusType} />
              </TableCell>

              <TableCell sx={{ py: '6px', px: '8px', verticalAlign: 'top' }} onClick={(e) => e.stopPropagation()}>
                <RowActions
                  customer={customer}
                  onView={() => onView(customer.id)}
                  onEdit={() => onEdit(customer)}
                  onAddProject={() => onAddProject(customer)}
                  onBillingSummary={() => onBillingSummary(customer)}
                  onArchive={() => onArchive(customer)}
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
  onProjects: () => void
  onAddProject: () => void
  onBillingSummary: () => void
  onArchive: () => void
}

function CustomerGridCard({
  customer,
  onView,
  onEdit,
  onProjects,
  onAddProject,
  onBillingSummary,
  onArchive,
}: GridCardProps) {
  const projectCount = getTotalProjectCount(customer)
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
        <RowActions
          customer={customer}
          onView={onView}
          onEdit={onEdit}
          onAddProject={onAddProject}
          onBillingSummary={onBillingSummary}
          onArchive={onArchive}
        />
      </Box>

      <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 1.25 }}>
        <CustomerAvatar name={customer.name} />
        <Box sx={{ minWidth: 0, pr: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.35, wordBreak: 'break-word' }}>
            {customer.name}
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.5 }}>
            <SectorCell customer={customer} />
            <StatusBadge status={customer.status.toLowerCase() as StatusType} />
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ mb: 1.25 }}>
        <ContactPersonCell customer={customer} />
      </Box>

      <ComplianceCell customer={customer} />

      <Divider sx={{ my: 1.25 }} />

      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Projects
          </Typography>
          <Typography
            component="button"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onProjects()
            }}
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: projectCount > 0 ? 'primary.main' : 'text.disabled',
              cursor: projectCount > 0 ? 'pointer' : 'default',
              border: 0,
              bgcolor: 'transparent',
              p: 0,
              textAlign: 'left',
              '&:hover': projectCount > 0 ? { textDecoration: 'underline' } : undefined,
            }}
          >
            {projectCount} Project{projectCount === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Total Bill Amount
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12 }}>
            ₹{formatCurrency(getTotalBillAmount(customer))}
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

// ─── Confirm Archive Dialog ───────────────────────────────────────────────────

interface ConfirmArchiveProps {
  customer: Customer | null
  onConfirm: () => void
  onClose: () => void
}

function ConfirmArchiveDialog({ customer, onConfirm, onClose }: ConfirmArchiveProps) {
  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title="Archive Customer"
      size="xs"
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="outlined" color="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="contained" color="primary" size="sm" onClick={onConfirm}>
            Archive
          </Button>
        </Stack>
      }
    >
      <Typography variant="body2">
        Archive <strong>{customer?.name}</strong>? The customer will be marked inactive and hidden from active lists.
      </Typography>
    </Modal>
  )
}

// ─── CustomersPage ────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const dispatch = useAppDispatch()
  const { items: rawItems, loading, pagination, filters, sortConfig } = useAppSelector((s) => s.customers)
  const items = rawItems ?? []
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Customer | null>(null)
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 })
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [visibleColumns, setVisibleColumns] = useState({
    contactPerson: true,
    sector: true,
    projects: true,
    totalBillAmount: true,
    compliance: true,
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
    if (sortConfig.field === 'totalBillAmount') {
      const diff = getTotalBillAmount(a) - getTotalBillAmount(b)
      return sortConfig.direction === 'asc' ? diff : -diff
    }
    if (sortConfig.field === 'sector') {
      const aStr = getSectorLabel(a).toLowerCase()
      const bStr = getSectorLabel(b).toLowerCase()
      const cmp = aStr < bStr ? -1 : 1
      return sortConfig.direction === 'asc' ? cmp : -cmp
    }
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

  const columnsConfig: ColumnItem[] = [
    { field: 'contactPerson', label: 'Contact Person', visible: visibleColumns.contactPerson },
    { field: 'sector', label: 'Sector', visible: visibleColumns.sector },
    { field: 'projects', label: 'Projects', visible: visibleColumns.projects },
    { field: 'totalBillAmount', label: 'Total Bill Amount', visible: visibleColumns.totalBillAmount },
    { field: 'compliance', label: 'Compliance', visible: visibleColumns.compliance },
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

  function customerDetailPath(customer: Customer) {
    return `/customers/${toSlug(customer.name)}`
  }

  function handleNavigateToCustomer(id: string) {
    const customer = items.find((c) => c.id === id)
    if (customer) {
      navigate(customerDetailPath(customer))
    }
  }

  function handleProjectsClick(customer: Customer) {
    navigate(`${customerDetailPath(customer)}?tab=projects`)
  }

  function handleBillingSummary(customer: Customer) {
    navigate(`${customerDetailPath(customer)}?tab=financial`)
  }

  function handleAddProject(customer: Customer) {
    navigate(`${customerDetailPath(customer)}?tab=projects`)
  }

  async function handleArchive() {
    if (!archiveTarget) return
    try {
      await dispatch(updateCustomer({ id: archiveTarget.id, data: { status: 'Inactive' } })).unwrap()
      showToast({ title: 'Customer archived', variant: 'success' })
      dispatch(fetchCustomers({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        status: filters.status || undefined,
      }))
    } catch (err) {
      showToast({ title: (err as string) || 'Failed to archive customer', variant: 'error' })
    }
    setArchiveTarget(null)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <ListingTemplate
        icon={<Building2 size={20} />}
        title="Customers"
        subtitle="Client directory and relationship management"
        primaryAction={{
          label: 'Add Customer',
          onClick: openAddDrawer,
          startIcon: <Plus size={16} strokeWidth={2} />,
        }}
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
                  onView={() => navigate(customerDetailPath(customer))}
                  onEdit={() => openEditDrawer(customer)}
                  onProjects={() => handleProjectsClick(customer)}
                  onAddProject={() => handleAddProject(customer)}
                  onBillingSummary={() => handleBillingSummary(customer)}
                  onArchive={() => setArchiveTarget(customer)}
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
            onProjects={handleProjectsClick}
            onAddProject={handleAddProject}
            onBillingSummary={handleBillingSummary}
            onArchive={setArchiveTarget}
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

      <ConfirmArchiveDialog
        customer={archiveTarget}
        onConfirm={handleArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </>
  )
}

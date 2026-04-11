import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
  Card as MuiCard,
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
  Divider,
} from '@mui/material'
import {
  LocalShipping,
  FolderOpen,
  TrendingDown,
  CheckCircle,
  Circle,
  VerifiedUser,
  LocationOn,
  Person,
  Phone as PhoneIcon,
} from '@mui/icons-material'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import { Truck, MoreHorizontal, Eye, Pencil, Trash2, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchVendors, deleteVendor } from '../../slices/vendors/thunk'
import { setFilters, resetFilters, setPage, setSortConfig } from '../../slices/vendors/reducer'
import type { Vendor } from '../../slices/vendors/reducer'
import { vendorsApi } from '../../api/vendorsApi'
import { ListingTemplate } from '../../components/templates'
import type { FilterField, ColumnItem } from '../../components/templates/ListingTemplate'
import { VendorDrawer } from './VendorDrawer'
import { StatusBadge, useToast, Modal, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { getInitials, getAvatarColor, formatCurrency, toSlug } from '../../utils/formatters'
import { tokens } from '@/design-system/tokens'

// ─── Avatar Cell ──────────────────────────────────────────────────────────────

function VendorAvatar({ name }: { name: string }) {
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
  vendor: Vendor
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function RowActions({ vendor, onView, onEdit, onDelete }: RowActionsProps) {
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
        {vendor.activeProjects > 0 ? (
          <Tooltip title="Cannot delete vendor with active projects" placement="left">
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

// ─── Vendor Table ─────────────────────────────────────────────────────────────

interface VendorTableProps {
  items: Vendor[]
  loading: boolean
  visibleColumns: Record<string, boolean>
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onView: (id: string) => void
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

function VendorTable({
  items, loading, visibleColumns, sortField, sortDirection, onSort, onView, onEdit, onDelete,
}: VendorTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <SortHeader
              label="Vendor"
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
            {visibleColumns.specialization && (
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', py: '8px', px: '14px', borderBottom: `2px solid ${tokens.color.neutral[100]}`, display: { xs: 'none', lg: 'table-cell' } }}>
                Specialization
              </TableCell>
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
            {visibleColumns.payables && (
              <SortHeader
                label="Payables"
                field="totalPayables"
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
                {[...Array(8)].map((__, j) => (
                  <TableCell key={j} sx={{ py: '10px', px: '14px' }}>
                    <Skeleton variant="text" width="80%" height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} sx={{ border: 0 }}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Truck size={32} color={tokens.color.neutral[300]} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                    No vendors found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add your first vendor to get started
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}

          {!loading && items.map((vendor) => (
            <TableRow
              key={vendor.id}
              onClick={() => onView(vendor.id)}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: hoverBg },
                '&:last-child td': { border: 0 },
              }}
            >
              {/* Vendor */}
              <TableCell sx={{ py: '10px', px: '14px' }}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <VendorAvatar name={vendor.name} />
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12, lineHeight: 1.3 }}>
                      {vendor.name}
                    </Typography>
                    <Stack direction="row" gap={0.5} sx={{ mt: '3px' }}>
                      <MuiChip
                        label={vendor.type}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: '6px' } }}
                      />
                      <MuiChip
                        label={vendor.gstStatus}
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
                    {vendor.contactPerson}
                  </Typography>
                  <Stack direction="row" alignItems="center" gap="3px" sx={{ mt: '3px' }}>
                    <Phone size={11} color={tokens.color.neutral[400]} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {vendor.phone}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap="3px">
                    <Mail size={11} color={tokens.color.neutral[400]} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {vendor.email}
                    </Typography>
                  </Stack>
                </TableCell>
              )}

              {/* Location */}
              {visibleColumns.location && (
                <TableCell sx={{ py: '10px', px: '14px', display: { xs: 'none', md: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {vendor.city}, {vendor.state}
                  </Typography>
                </TableCell>
              )}

              {/* Specialization */}
              {visibleColumns.specialization && (
                <TableCell sx={{ py: '10px', px: '14px', display: { xs: 'none', lg: 'table-cell' } }}>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {vendor.tags.slice(0, 2).map((tag) => (
                      <MuiChip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          bgcolor: tokens.color.primary[50],
                          color: tokens.color.primary[700],
                          '& .MuiChip-label': { px: '6px' },
                        }}
                      />
                    ))}
                    {vendor.tags.length > 2 && (
                      <MuiChip
                        label={`+${vendor.tags.length - 2} more`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          bgcolor: tokens.color.neutral[100],
                          '& .MuiChip-label': { px: '6px' },
                        }}
                      />
                    )}
                  </Stack>
                </TableCell>
              )}

              {/* Projects */}
              {visibleColumns.projects && (
                <TableCell sx={{ py: '10px', px: '14px', display: { xs: 'none', lg: 'table-cell' } }}>
                  {vendor.activeProjects === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
                      0 Active
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ fontSize: 12 }}>
                      {vendor.activeProjects} Active
                    </Typography>
                  )}
                </TableCell>
              )}

              {/* Payables */}
              {visibleColumns.payables && (
                <TableCell sx={{ py: '10px', px: '14px', display: { xs: 'none', lg: 'table-cell' } }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12 }}>
                    ₹{formatCurrency(vendor.totalPayables)}
                  </Typography>
                </TableCell>
              )}

              {/* Status */}
              <TableCell sx={{ py: '10px', px: '14px' }}>
                <StatusBadge status={vendor.status.toLowerCase() as StatusType} />
              </TableCell>

              {/* Actions */}
              <TableCell sx={{ py: '6px', px: '8px' }} onClick={(e) => e.stopPropagation()}>
                <RowActions
                  vendor={vendor}
                  onView={() => onView(vendor.id)}
                  onEdit={() => onEdit(vendor)}
                  onDelete={() => onDelete(vendor)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ─── Vendor Grid Card ─────────────────────────────────────────────────────────

interface VendorGridCardProps {
  vendor: Vendor
  onView: (id: string) => void
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

function VendorGridCard({ vendor, onView, onEdit, onDelete }: VendorGridCardProps) {
  const theme = useTheme()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  return (
    <MuiCard
      elevation={0}
      onClick={() => onView(vendor.id)}
      sx={{
        p: 2,
        border: `1px solid ${tokens.color.neutral[100]}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: tokens.shadow.md },
      }}
    >
      {/* Top row */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <VendorAvatar name={vendor.name} />
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vendor.name}
          </Typography>
        </Stack>
        <MuiIconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
          sx={{ flexShrink: 0 }}
        >
          <MoreHorizontal size={16} />
        </MuiIconButton>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => { onView(vendor.id); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Eye size={14} /> View
          </MenuItem>
          <MenuItem onClick={() => { onEdit(vendor); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Pencil size={14} /> Edit
          </MenuItem>
          <Divider />
          {vendor.activeProjects > 0 ? (
            <Tooltip title="Cannot delete vendor with active projects" placement="left">
              <span>
                <MenuItem disabled sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
                  <Trash2 size={14} /> Delete
                </MenuItem>
              </span>
            </Tooltip>
          ) : (
            <MenuItem onClick={() => { onDelete(vendor); setAnchor(null) }} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
              <Trash2 size={14} /> Delete
            </MenuItem>
          )}
        </Menu>
      </Stack>

      {/* Type + GST chips */}
      <Stack direction="row" gap={0.5} sx={{ mt: '6px' }}>
        <MuiChip label={vendor.type} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: '6px' } }} />
        <MuiChip label={vendor.gstStatus} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: '6px' } }} />
      </Stack>

      <Divider sx={{ my: '10px' }} />

      {/* Info rows */}
      <Stack gap="6px">
        <Stack direction="row" alignItems="center" gap="5px">
          <Person sx={{ fontSize: 11, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            {vendor.contactPerson}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap="5px">
          <LocationOn sx={{ fontSize: 11, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vendor.city}, {vendor.state}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap="5px">
          <PhoneIcon sx={{ fontSize: 11, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            {vendor.phone}
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ my: '10px' }} />

      {/* Bottom row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" fontWeight={700} sx={{ fontSize: 14, color: theme.palette.primary.main }}>
          ₹{formatCurrency(vendor.totalPayables)}
        </Typography>
        <Stack direction="row" alignItems="center" gap={1}>
          {vendor.activeProjects > 0 ? (
            <Typography variant="caption" sx={{ fontSize: 11, color: 'primary.main', fontWeight: 500 }}>
              {vendor.activeProjects} Active
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.disabled' }}>
              0 Active
            </Typography>
          )}
          <StatusBadge status={vendor.status.toLowerCase() as StatusType} />
        </Stack>
      </Stack>
    </MuiCard>
  )
}

// ─── Vendors Grid ─────────────────────────────────────────────────────────────

interface VendorsGridProps {
  items: Vendor[]
  loading: boolean
  onView: (id: string) => void
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

function VendorsGrid({ items, loading, onView, onEdit, onDelete }: VendorsGridProps) {
  const theme = useTheme()

  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1,1fr)', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' },
          gap: '12px',
          p: 2,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Truck size={32} color={tokens.color.neutral[300]} />
        <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>No vendors found</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1,1fr)', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' },
        gap: '12px',
        p: 2,
      }}
    >
      {items.map((vendor) => (
        <VendorGridCard
          key={vendor.id}
          vendor={vendor}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Box>
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
  vendor: Vendor | null
  onConfirm: () => void
  onClose: () => void
}

function ConfirmDeleteDialog({ vendor, onConfirm, onClose }: ConfirmDeleteProps) {
  return (
    <Modal
      open={!!vendor}
      onClose={onClose}
      title="Delete Vendor"
      size="xs"
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
          >
            Delete
          </Button>
        </Stack>
      }
    >
      <Typography variant="body2">
        Are you sure you want to delete <strong>{vendor?.name}</strong>? This action cannot be undone.
      </Typography>
    </Modal>
  )
}

// ─── VendorsPage ──────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const dispatch = useAppDispatch()
  const { items, loading, pagination, filters, sortConfig } = useAppSelector((s) => s.vendors)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add')
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 })
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [visibleColumns, setVisibleColumns] = useState({
    contactPerson: true,
    location: true,
    specialization: true,
    projects: true,
    payables: true,
  })

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Initial fetch ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchVendors({ page: 1, pageSize: pagination.pageSize }))
    void Promise.all([
      vendorsApi.getAll({ pageSize: 1 }),
      vendorsApi.getAll({ pageSize: 1, status: 'Active' }),
      vendorsApi.getAll({ pageSize: 1, status: 'Inactive' }),
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
  const activeTabKey = !filters.status ? 'all' : filters.status === 'Active' ? 'Active' : 'inactive'

  const tabs = [
    { label: 'All Vendors', value: 'all', count: counts.all },
    { label: 'Active', value: 'Active', count: counts.active },
    { label: 'Inactive', value: 'inactive', count: counts.inactive },
  ]

  // Sort items client-side
  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig.field) return 0
    const field = sortConfig.field as keyof Vendor
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
      label: 'TOTAL VENDORS',
      value: items.length,
      color: 'default' as const,
      icon: <LocalShipping sx={{ fontSize: 20 }} />,
    },
    {
      label: 'ACTIVE PROJECTS',
      value: items.reduce((sum, v) => sum + v.activeProjects, 0),
      color: 'success' as const,
      icon: <FolderOpen sx={{ fontSize: 20 }} />,
    },
    {
      label: 'TOTAL PAYABLES',
      value: '₹' + formatCurrency(items.reduce((sum, v) => sum + v.totalPayables, 0)),
      color: 'warning' as const,
      icon: <TrendingDown sx={{ fontSize: 20 }} />,
    },
    {
      label: 'ACTIVE VENDORS',
      value: items.filter((v) => v.status === 'Active').length,
      color: 'info' as const,
      icon: <CheckCircle sx={{ fontSize: 20 }} />,
    },
  ]

  // Column visibility config
  const columnsConfig: ColumnItem[] = [
    { field: 'contactPerson',  label: 'Contact Person',  visible: visibleColumns.contactPerson },
    { field: 'location',       label: 'Location',         visible: visibleColumns.location },
    { field: 'specialization', label: 'Specialization',   visible: visibleColumns.specialization },
    { field: 'projects',       label: 'Projects',         visible: visibleColumns.projects },
    { field: 'payables',       label: 'Payables',         visible: visibleColumns.payables },
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
      label: 'Vendor Type',
      type: 'select',
      icon: <LocalShipping sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Measurable', value: 'Measurable' },
        { label: 'Non-measurable', value: 'Non-measurable' },
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
        { label: 'Gujarat', value: 'Gujarat' },
      ],
    },
  ]

  // ── Handlers ──────────────────────────────────────────────────────
  function handleTabChange(value: string) {
    const statusMap: Record<string, string> = { all: '', Active: 'Active', inactive: 'Inactive' }
    const status = statusMap[value] ?? ''
    setActiveFilters({})
    dispatch(resetFilters())
    dispatch(setFilters({ status }))
    dispatch(setPage(1))
    dispatch(fetchVendors({
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
      dispatch(fetchVendors({
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
    dispatch(fetchVendors({ page: 1, pageSize: pagination.pageSize, search: filters.search || undefined, ...params }))
  }

  function handleFilterReset() {
    setActiveFilters({})
    dispatch(resetFilters())
    dispatch(setPage(1))
    dispatch(fetchVendors({
      page: 1,
      pageSize: pagination.pageSize,
      search: filters.search || undefined,
      status: filters.status || undefined,
    }))
  }

  function handleSortChange(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
  }

  function handlePageChange(p: number) {
    dispatch(setPage(p))
    dispatch(fetchVendors({
      page: p,
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
    setEditingVendor(null)
    setDrawerOpen(true)
  }

  function openEditDrawer(vendor: Vendor) {
    setDrawerMode('edit')
    setEditingVendor(vendor)
    setDrawerOpen(true)
  }

  function handleDrawerClose() {
    setDrawerOpen(false)
    setEditingVendor(null)
  }

  function handleNavigateToVendor(id: string) {
    const vendor = items.find((v) => v.id === id)
    if (vendor) {
      navigate(`/vendors/${toSlug(vendor.name)}`)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await dispatch(deleteVendor(deleteTarget.id)).unwrap()
      showToast({ title: 'Vendor deleted', variant: 'success' })
    } catch (err) {
      showToast({ title: (err as string) || 'Failed to delete vendor', variant: 'error' })
    }
    setDeleteTarget(null)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <ListingTemplate
        icon={<Truck size={20} />}
        title="Vendors"
        subtitle="Manage vendor relationships and payment details"
        primaryAction={{ label: '+ Add Vendor', onClick: openAddDrawer }}
        statCards={statCards}
        searchPlaceholder="Search vendors..."
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
        showViewToggle={true}
        onViewModeChange={(mode) => setViewMode(mode === 'grid' ? 'grid' : 'table')}
      >
        {viewMode === 'grid' ? (
          <VendorsGrid
            items={sortedItems}
            loading={loading}
            onView={handleNavigateToVendor}
            onEdit={openEditDrawer}
            onDelete={setDeleteTarget}
          />
        ) : (
          <VendorTable
            items={sortedItems}
            loading={loading}
            visibleColumns={visibleColumns}
            sortField={sortConfig.field}
            sortDirection={sortConfig.direction}
            onSort={handleSortChange}
            onView={handleNavigateToVendor}
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

      <VendorDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        mode={drawerMode}
        vendor={editingVendor}
      />

      <ConfirmDeleteDialog
        vendor={deleteTarget}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

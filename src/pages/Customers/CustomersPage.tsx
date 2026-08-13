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
  VerifiedUser,
  LocationOn,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { Building2, Plus, MoreVertical, Eye, Pencil, FolderPlus, Receipt, Archive, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers, setCustomerActive, fetchCustomerFilters } from '../../slices/customers/thunk'
import { setFilters, resetFilters, setPage, setSortConfig } from '../../slices/customers/reducer'
import type { Customer } from '../../slices/customers/reducer'
import { ListingTemplate } from '../../components/templates'
import type { FilterField, ColumnItem } from '../../components/templates/ListingTemplate'
import {
  FilterableHeaderCell,
  FilterableSortHeader,
  type ColumnFilterOption,
} from '@/components/listing'
import { CustomerDrawer } from './CustomerDrawer'
import { useToast, Modal, Button } from '@/design-system/components'
import { getInitials, getAvatarColor } from '../../utils/formatters'
import { getPrimaryContact } from '../../utils/customerContacts'
import { tokens } from '@/design-system/tokens'
import { getSectorTagSx } from '../../utils/sectorTagStyles'
import { fetchSectors } from '../../slices/settings/thunk'

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

function getSectorLabel(customer: Customer): string {
  return customer.sector ?? '—'
}

type CustomerTableVisibleColumns = {
  contactPerson: boolean
  sector: boolean
  projects: boolean
}

type CustomerColumnFilters = {
  customerName: string
  contactPerson: string
  sector: string
  projectCount: string
}

function toColumnFilterOptions(
  options?: Array<{ value: string | number | boolean; label: string }>,
): ColumnFilterOption[] {
  return (options ?? []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }))
}

function customerTableColCount(visible: CustomerTableVisibleColumns): number {
  return (
    1 +
    (visible.contactPerson ? 1 : 0) +
    (visible.sector ? 1 : 0) +
    (visible.projects ? 1 : 0) +
    1
  )
}

function mapCustomerSortField(field: string | null): string | undefined {
  if (field === 'customerName' || field === 'sector') return field
  return undefined
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
      <MuiIconButton size="small" onClick={open} sx={{ color: tokens.color.neutral[400], mx: 'auto' }}>
        <MoreVertical size={16} />
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

// ─── Customer Table ───────────────────────────────────────────────────────────

interface CustomerTableProps {
  items: Customer[]
  loading: boolean
  visibleColumns: CustomerTableVisibleColumns
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  columnFilters: CustomerColumnFilters
  customerNameOptions: ColumnFilterOption[]
  contactPersonOptions: ColumnFilterOption[]
  sectorOptions: ColumnFilterOption[]
  projectCountOptions: ColumnFilterOption[]
  onColumnFilter: (field: keyof CustomerColumnFilters, value: string) => void
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
  columnFilters,
  customerNameOptions,
  contactPersonOptions,
  sectorOptions,
  projectCountOptions,
  onColumnFilter,
  onView,
  onEdit,
  onProjects,
  onAddProject,
  onBillingSummary,
  onArchive,
}: CustomerTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const colCount = customerTableColCount(visibleColumns)

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <FilterableSortHeader
              label="Client Name"
              field="customerName"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={columnFilters.customerName}
              filterOptions={customerNameOptions}
              onFilter={(value) => onColumnFilter('customerName', value)}
              sx={{
                fontSize: 11,
                py: '8px',
                px: '14px',
                borderBottom: `2px solid ${tokens.color.neutral[100]}`,
              }}
            />
            {visibleColumns.contactPerson && (
              <FilterableHeaderCell
                label="Contact Person"
                filterValue={columnFilters.contactPerson}
                filterOptions={contactPersonOptions}
                onFilter={(value) => onColumnFilter('contactPerson', value)}
                sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', py: '8px', px: '14px', borderBottom: `2px solid ${tokens.color.neutral[100]}` }}
              />
            )}
            {visibleColumns.sector && (
              <FilterableSortHeader
                label="Sector"
                field="sector"
                sortField={sortField ?? undefined}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={columnFilters.sector}
                filterOptions={sectorOptions}
                onFilter={(value) => onColumnFilter('sector', value)}
                sx={{ display: { xs: 'none', md: 'table-cell' } }}
              />
            )}
            {visibleColumns.projects && (
              <FilterableSortHeader
                label="Projects"
                filterValue={columnFilters.projectCount}
                filterOptions={projectCountOptions}
                onFilter={(value) => onColumnFilter('projectCount', value)}
                sortable={false}
                sx={{ display: { xs: 'none', lg: 'table-cell' } }}
              />
            )}
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
                {[...Array(colCount)].map((__, j) => (
                  <TableCell key={j} sx={{ py: '10px', px: '14px' }}>
                    <Skeleton variant="text" width="80%" height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} sx={{ border: 0 }}>
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

              <TableCell
                sx={{ py: '6px', px: '8px', verticalAlign: 'middle', textAlign: 'center' }}
                onClick={(e) => e.stopPropagation()}
              >
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
          <Box sx={{ mt: 0.5 }}>
            <SectorCell customer={customer} />
          </Box>
        </Box>
      </Stack>

      <Box sx={{ mb: 1.25 }}>
        <ContactPersonCell customer={customer} />
      </Box>

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
  const { items: rawItems, loading, pagination, filters, sortConfig, filterOptions } = useAppSelector((s) => s.customers)
  const items = rawItems ?? []
  const sectors = useAppSelector((s) => s.settings.sectors)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Customer | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [columnFilters, setColumnFilters] = useState<CustomerColumnFilters>({
    customerName: '',
    contactPerson: '',
    sector: '',
    projectCount: '',
  })
  const [visibleColumns, setVisibleColumns] = useState<CustomerTableVisibleColumns>({
    contactPerson: true,
    sector: true,
    projects: true,
  })

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buildListParams(overrides: Record<string, unknown> = {}) {
    const columns = [
      'id',
      'initials',
      'customerName',
      'phone',
      'email',
      'gstStatus',
      'isActive',
      'statusLabel',
      'city',
      'state',
      'createdAt',
      ...(visibleColumns.contactPerson
        ? ['contactPerson', 'designation', 'contactPersonLabel']
        : []),
      ...(visibleColumns.sector ? ['sector', 'sectorLabel'] : []),
      ...(visibleColumns.projects ? ['projectCount', 'outstandingAmount'] : []),
    ]

    const pickFilter = (key: 'gstStatus' | 'state' | 'sector' | 'search') => {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        return overrides[key] as string | undefined
      }
      if (key === 'search') return filters.search
      return (filters[key] ?? activeFilters[key]) as string | undefined
    }

    const gstRaw = pickFilter('gstStatus')
    const stateRaw = pickFilter('state')
    const sectorRaw = pickFilter('sector')
    const searchRaw = pickFilter('search')
    const search = searchRaw?.trim() || undefined
    const customerNameRaw =
      (Object.prototype.hasOwnProperty.call(overrides, 'customerName')
        ? overrides.customerName
        : columnFilters.customerName) as string | undefined
    const contactPersonRaw =
      (Object.prototype.hasOwnProperty.call(overrides, 'contactPerson')
        ? overrides.contactPerson
        : columnFilters.contactPerson) as string | undefined
    const columnSectorRaw =
      (Object.prototype.hasOwnProperty.call(overrides, 'sector')
        ? overrides.sector
        : columnFilters.sector) as string | undefined

    return {
      page: (overrides.page as number | undefined) ?? pagination.page,
      pageSize: (overrides.pageSize as number | undefined) ?? pagination.pageSize,
      search,
      gstStatus: gstRaw || undefined,
      state: stateRaw || undefined,
      sector: columnSectorRaw || sectorRaw || undefined,
      customerName: customerNameRaw?.trim() || undefined,
      contactPerson: contactPersonRaw?.trim() || undefined,
      columns,
      sortBy:
        (overrides.sortBy as string | undefined) ??
        mapCustomerSortField(sortConfig.field),
      sortOrder:
        (overrides.sortOrder as 'asc' | 'desc' | undefined) ??
        (mapCustomerSortField(sortConfig.field) ? sortConfig.direction : undefined),
    }
  }

  useEffect(() => {
    void dispatch(fetchCustomerFilters())
    void dispatch(fetchSectors())
    void dispatch(fetchCustomers(buildListParams({ page: 1, pageSize: pagination.pageSize || 20 })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const columnsBootstrapped = useRef(false)
  // Refetch when column visibility changes (server column projection)
  useEffect(() => {
    if (!columnsBootstrapped.current) {
      columnsBootstrapped.current = true
      return
    }
    void dispatch(fetchCustomers(buildListParams()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns.contactPerson, visibleColumns.sector, visibleColumns.projects])

  const columnsConfig: ColumnItem[] = [
    { field: 'contactPerson', label: 'Contact Person', visible: visibleColumns.contactPerson },
    { field: 'sector', label: 'Sector', visible: visibleColumns.sector },
    { field: 'projects', label: 'Projects', visible: visibleColumns.projects },
  ]
  const customerNameOptions = toColumnFilterOptions(filterOptions?.customerName)
  const contactPersonOptions = toColumnFilterOptions(filterOptions?.contactPerson)
  const sectorOptions = toColumnFilterOptions(filterOptions?.sector)
  const projectCountOptions: ColumnFilterOption[] = []

  const filterConfig: FilterField[] = [
    {
      field: 'gstStatus',
      label: 'GST Status',
      type: 'select',
      icon: <VerifiedUser sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        ...(filterOptions?.gstStatuses?.map((t) => ({ label: t.label, value: t.value })) ?? [
          { label: 'Registered', value: 'REGISTERED' },
          { label: 'Unregistered', value: 'UNREGISTERED' },
          { label: 'Composition', value: 'COMPOSITION' },
          { label: 'SEZ', value: 'SEZ' },
        ]),
      ],
    },
    {
      field: 'state',
      label: 'State',
      type: 'select',
      icon: <LocationOn sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        ...(filterOptions?.states?.map((t) => ({ label: t.label, value: t.value })) ?? []),
      ],
    },
    {
      field: 'sector',
      label: 'Sector',
      type: 'select',
      icon: <Business sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        ...sectors
          .filter((s) => s.status === 'active')
          .map((s) => ({ label: s.name, value: s.name })),
      ],
    },
  ]

  // ── Handlers ──────────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    dispatch(setFilters({ search: value }))
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      const trimmed = value.trim()
      dispatch(setPage(1))
      void dispatch(
        // Pass empty string (not undefined) so buildListParams clears search instead of
        // falling back to the previous filter via `??`.
        fetchCustomers(buildListParams({ page: 1, search: trimmed })),
      )
    }, 300)
  }

  function handleFilterChange(newFilters: Record<string, unknown>) {
    setActiveFilters(newFilters)
    setColumnFilters((prev) => ({ ...prev, sector: String(newFilters.sector ?? '') }))
    const params: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(newFilters)) {
      params[k] = (v as string) || undefined
    }
    dispatch(setFilters(params as { search?: string; gstStatus?: string; state?: string; sector?: string }))
    dispatch(setPage(1))
    void dispatch(fetchCustomers(buildListParams({ page: 1, ...params })))
  }

  function handleFilterReset() {
    setActiveFilters({})
    setColumnFilters((prev) => ({ ...prev, sector: '' }))
    dispatch(resetFilters())
    dispatch(setPage(1))
    void dispatch(fetchCustomers(buildListParams({
      page: 1,
      search: filters.search,
      gstStatus: '',
      state: '',
      sector: '',
    })))
  }

  function handleSortChange(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
    dispatch(setPage(1))
    void dispatch(
      fetchCustomers(
        buildListParams({
          page: 1,
          sortBy: mapCustomerSortField(field),
          sortOrder: direction,
        }),
      ),
    )
  }

  function handleColumnFilter(field: keyof CustomerColumnFilters, value: string) {
    setColumnFilters((prev) => ({ ...prev, [field]: value }))
    if (field === 'sector') {
      setActiveFilters((prev) => ({ ...prev, sector: value }))
      dispatch(setFilters({ sector: value }))
    }
    dispatch(setPage(1))
    void dispatch(fetchCustomers(buildListParams({ page: 1, [field]: value })))
  }

  function handlePageChange(page: number) {
    dispatch(setPage(page))
    void dispatch(fetchCustomers(buildListParams({ page })))
  }

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    setVisibleColumns((prev) => ({ ...prev, [field]: visible } as CustomerTableVisibleColumns))
  }

  function handleResetAll() {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    setActiveFilters({})
    setColumnFilters({
      customerName: '',
      contactPerson: '',
      sector: '',
      projectCount: '',
    })
    dispatch(setFilters({ search: '', status: '', gstStatus: '', state: '', sector: '' }))
    dispatch(setSortConfig({ field: null, direction: 'asc' }))
    dispatch(setPage(1))
    void dispatch(
      fetchCustomers(
        buildListParams({
          page: 1,
          search: '',
          gstStatus: '',
          state: '',
          sector: '',
          customerName: '',
          contactPerson: '',
          sortBy: undefined,
          sortOrder: undefined,
        }),
      ),
    )
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
    return `/customers/${customer.id}`
  }

  function handleNavigateToCustomer(id: string) {
    const customer = items.find((c) => c.id === id)
    if (customer) {
      navigate(customerDetailPath(customer))
    } else {
      navigate(`/customers/${id}`)
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
      await dispatch(setCustomerActive({ id: archiveTarget.id, isActive: false })).unwrap()
      showToast({ title: 'Customer archived', variant: 'success' })
      void dispatch(fetchCustomers(buildListParams()))
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to archive customer'
      showToast({ title: message, variant: 'error' })
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
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        onResetAll={handleResetAll}
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
            ) : items.length === 0 ? (
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
              items.map((customer) => (
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
            items={items}
            loading={loading}
            visibleColumns={visibleColumns}
            sortField={sortConfig.field}
            sortDirection={sortConfig.direction}
            onSort={handleSortChange}
            columnFilters={columnFilters}
            customerNameOptions={customerNameOptions}
            contactPersonOptions={contactPersonOptions}
            sectorOptions={sectorOptions}
            projectCountOptions={projectCountOptions}
            onColumnFilter={handleColumnFilter}
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

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
  Card as MuiCard,
  Divider,
} from '@mui/material'
import {
  Business,
  VerifiedUser,
  LocationOn,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { Building2, Plus, MoreVertical, Eye, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers, setCustomerActive, fetchCustomerFilters } from '../../slices/customers/thunk'
import { setFilters, resetFilters, setPage, setPageSize, setSortConfig } from '../../slices/customers/reducer'
import type { Customer } from '../../slices/customers/reducer'
import { ListingTemplate } from '../../components/templates'
import type { FilterField, ColumnItem } from '../../components/templates/ListingTemplate'
import {
  FilterableHeaderCell,
  FilterableSortHeader,
  StatusColumnToggle,
  type ColumnFilterOption,
} from '@/components/listing'
import { ROW_ICON_ACTIONS_GROUP_SX } from '@/components/listing/rowIconActionStyles'
import { CustomerDrawer } from './CustomerDrawer'
import { useToast, Modal, Button } from '@/design-system/components'
import { getInitials, getAvatarColor } from '../../utils/formatters'
import { getPrimaryContact } from '../../utils/customerContacts'
import { tokens } from '@/design-system/tokens'
import { getSectorTagSx } from '../../utils/sectorTagStyles'
import { usePermission } from '@/hooks/usePermission'
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
  projectStatus: string
  status: string
}

const DEFAULT_CUSTOMER_VISIBLE_COLUMNS: CustomerTableVisibleColumns = {
  contactPerson: true,
  sector: true,
  projects: true,
}

const CUSTOMER_STATUS_OPTIONS: ColumnFilterOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

const CUSTOMER_PROJECT_STATUS_OPTIONS: ColumnFilterOption[] = [
  { value: 'PITCH', label: 'Pitch' },
  { value: 'LIVE', label: 'Live' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const CUSTOMER_GST_FILTER_OPTIONS = [
  { label: 'Registered', value: 'REGISTERED' },
  { label: 'Unregistered', value: 'UNREGISTERED' },
]

function toColumnFilterOptions(
  options?: Array<{ value: string | number | boolean; label: string }>,
): ColumnFilterOption[] {
  return (options ?? []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }))
}

function toStatusFilterOptions(
  options?: Array<{ value: boolean; label: string }>,
): ColumnFilterOption[] {
  if (!options?.length) return CUSTOMER_STATUS_OPTIONS
  return options.map((option) => ({
    value: option.value ? 'Active' : 'Inactive',
    label: option.label,
  }))
}

function toGstFilterOptions(
  options?: Array<{ value: string | number | boolean; label: string }>,
) {
  const allowed = new Set(CUSTOMER_GST_FILTER_OPTIONS.map((option) => option.value))
  const fromApi = (options ?? [])
    .map((option) => ({ label: option.label, value: String(option.value) }))
    .filter((option) => allowed.has(option.value))
  return fromApi.length ? fromApi : CUSTOMER_GST_FILTER_OPTIONS
}

function customerTableColCount(visible: CustomerTableVisibleColumns): number {
  return (
    1 +
    (visible.contactPerson ? 1 : 0) +
    (visible.sector ? 1 : 0) +
    (visible.projects ? 1 : 0) +
    1 + // Status
    1 // Action
  )
}

const CUSTOMER_STATUS_HEADER_SX = {
  width: 118,
  minWidth: 118,
  maxWidth: 128,
  py: '8px',
  px: '12px',
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'bottom' as const,
  whiteSpace: 'nowrap' as const,
  textAlign: 'center' as const,
  '& .MuiStack-root': {
    width: '100%',
    maxWidth: 'none',
    justifyContent: 'center',
  },
  '& .MuiStack-root > span': {
    overflow: 'visible',
    textOverflow: 'clip',
  },
}

const CUSTOMER_STATUS_CELL_SX = {
  width: 118,
  minWidth: 118,
  maxWidth: 128,
  py: '6px',
  px: '12px',
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
}

function mapCustomerSortField(field: string | null): string | undefined {
  if (field === 'customerName' || field === 'sector') return field
  if (field === 'status') return 'isActive'
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
  canEdit: boolean
  onView: () => void
  onEdit: () => void
}

function RowActions({
  canEdit,
  onView,
  onEdit,
}: RowActionsProps) {
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
        {canEdit ? (
          <MenuItem onClick={() => { onEdit(); close() }} sx={{ fontSize: 13, gap: 1 }}>
            <Pencil size={14} /> Edit
          </MenuItem>
        ) : null}
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
  projectStatusOptions: ColumnFilterOption[]
  statusOptions: ColumnFilterOption[]
  onColumnFilter: (field: keyof CustomerColumnFilters, value: string) => void
  canEdit: boolean
  canToggleActive: boolean
  onView: (id: string) => void
  onEdit: (customer: Customer) => void
  onProjects: (customer: Customer) => void
  onToggleStatus: (customer: Customer) => void
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
  projectStatusOptions,
  statusOptions,
  onColumnFilter,
  canEdit,
  canToggleActive,
  onView,
  onEdit,
  onProjects,
  onToggleStatus,
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
                filterValue={columnFilters.projectStatus}
                filterOptions={projectStatusOptions}
                onFilter={(value) => onColumnFilter('projectStatus', value)}
                sortable={false}
                sx={{ display: { xs: 'none', lg: 'table-cell' } }}
              />
            )}
            <FilterableSortHeader
              label="Status"
              field="status"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={columnFilters.status}
              filterOptions={statusOptions}
              onFilter={(value) => onColumnFilter('status', value)}
              sx={CUSTOMER_STATUS_HEADER_SX}
            />
            <TableCell
              sx={{
                width: 72,
                minWidth: 72,
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
                sx={CUSTOMER_STATUS_CELL_SX}
                onClick={(e) => e.stopPropagation()}
              >
                <StatusColumnToggle
                  active={customer.status === 'Active'}
                  disabled={!canToggleActive}
                  onToggle={() => onToggleStatus(customer)}
                />
              </TableCell>

              <TableCell
                sx={{ width: 72, minWidth: 72, py: '6px', px: '12px', verticalAlign: 'middle', textAlign: 'center' }}
                onClick={(e) => e.stopPropagation()}
              >
                <Box sx={ROW_ICON_ACTIONS_GROUP_SX}>
                  <RowActions
                    canEdit={canEdit}
                    onView={() => onView(customer.id)}
                    onEdit={() => onEdit(customer)}
                  />
                </Box>
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
  visibleColumns: CustomerTableVisibleColumns
  onView: () => void
  onEdit: () => void
  onProjects: () => void
  onToggleStatus: () => void
  canEdit: boolean
  canToggleActive: boolean
}

function CustomerGridCard({
  customer,
  visibleColumns,
  onView,
  onEdit,
  onProjects,
  onToggleStatus,
  canEdit,
  canToggleActive,
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
      <Box
        sx={{ position: 'absolute', top: 8, right: 8, ...ROW_ICON_ACTIONS_GROUP_SX }}
        onClick={(e) => e.stopPropagation()}
      >
        <StatusColumnToggle
          active={customer.status === 'Active'}
          disabled={!canToggleActive}
          onToggle={onToggleStatus}
        />
        <RowActions
          canEdit={canEdit}
          onView={onView}
          onEdit={onEdit}
        />
      </Box>

      <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 1.25 }}>
        <CustomerAvatar name={customer.name} />
        <Box sx={{ minWidth: 0, pr: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.35, wordBreak: 'break-word' }}>
            {customer.name}
          </Typography>
          {visibleColumns.sector ? (
            <Box sx={{ mt: 0.5 }}>
              <SectorCell customer={customer} />
            </Box>
          ) : null}
        </Box>
      </Stack>

      {visibleColumns.contactPerson ? (
        <Box sx={{ mb: 1.25 }}>
          <ContactPersonCell customer={customer} />
        </Box>
      ) : null}

      {visibleColumns.projects ? <Divider sx={{ my: 1.25 }} /> : null}

      {visibleColumns.projects ? (
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
      ) : null}
    </MuiCard>
  )
}

// ─── Confirm Activate / Deactivate Dialog ─────────────────────────────────────

interface ConfirmToggleProps {
  customer: Customer | null
  onConfirm: () => void
  onClose: () => void
}

function ConfirmToggleDialog({ customer, onConfirm, onClose }: ConfirmToggleProps) {
  const nextActive = customer?.status !== 'Active'
  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title={nextActive ? 'Activate?' : 'Deactivate?'}
      size="xs"
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="outlined" color="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="contained" color="primary" size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </Stack>
      }
    >
      <Typography variant="body2">
        {nextActive
          ? `Activate "${customer?.name}"?`
          : `Deactivate "${customer?.name}"? The customer will be marked inactive and hidden from active lists.`}
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
  const canCreateCustomer = usePermission('customers', 'create')
  const canEditCustomer = usePermission('customers', 'edit')
  const canToggleCustomerActive = usePermission('customers', 'delete')

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Customer | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [columnFilters, setColumnFilters] = useState<CustomerColumnFilters>({
    customerName: '',
    contactPerson: '',
    sector: '',
    projectStatus: '',
    status: '',
  })
  const [visibleColumns, setVisibleColumns] = useState<CustomerTableVisibleColumns>(
    DEFAULT_CUSTOMER_VISIBLE_COLUMNS,
  )

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

    const pickFilter = (key: 'gstStatus' | 'state' | 'sector' | 'search' | 'status') => {
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
    const statusRaw =
      (Object.prototype.hasOwnProperty.call(overrides, 'status')
        ? overrides.status
        : columnFilters.status || filters.status) as string | undefined
    const projectStatusRaw =
      (Object.prototype.hasOwnProperty.call(overrides, 'projectStatus')
        ? overrides.projectStatus
        : columnFilters.projectStatus || filters.projectStatus) as string | undefined
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
      status: statusRaw || undefined,
      gstStatus: gstRaw || undefined,
      state: stateRaw || undefined,
      sector: columnSectorRaw || sectorRaw || undefined,
      projectStatus: projectStatusRaw || undefined,
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
    void dispatch(fetchCustomers(buildListParams({ page: 1, pageSize: pagination.pageSize || 10 })))
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
  const projectStatusOptions = filterOptions?.projectStatuses?.length
    ? toColumnFilterOptions(filterOptions.projectStatuses)
    : CUSTOMER_PROJECT_STATUS_OPTIONS
  const statusOptions = toStatusFilterOptions(filterOptions?.status)

  const filterConfig: FilterField[] = [
    {
      field: 'gstStatus',
      label: 'GST Status',
      type: 'select',
      icon: <VerifiedUser sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        ...toGstFilterOptions(filterOptions?.gstStatuses),
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
        ...(filterOptions?.sector?.map((s) => ({ label: s.label, value: s.value })) ??
          sectors
            .filter((s) => s.status === 'active')
            .map((s) => ({ label: s.name, value: s.name }))),
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
    } else if (field === 'status') {
      dispatch(setFilters({ status: value }))
    } else if (field === 'projectStatus') {
      dispatch(setFilters({ projectStatus: value }))
    }
    dispatch(setPage(1))
    void dispatch(fetchCustomers(buildListParams({ page: 1, [field]: value })))
  }

  function handlePageChange(page: number) {
    dispatch(setPage(page))
    void dispatch(fetchCustomers(buildListParams({ page })))
  }

  function handlePageSizeChange(size: number) {
    dispatch(setPageSize(size))
    void dispatch(fetchCustomers(buildListParams({ page: 1, pageSize: size })))
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
      projectStatus: '',
      status: '',
    })
    setVisibleColumns(DEFAULT_CUSTOMER_VISIBLE_COLUMNS)
    dispatch(setFilters({ search: '', status: '', gstStatus: '', state: '', sector: '', projectStatus: '' }))
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
          projectStatus: '',
          customerName: '',
          contactPerson: '',
          status: '',
          sortBy: undefined,
          sortOrder: undefined,
        }),
      ),
    )
  }

  function openAddDrawer() {
    if (!canCreateCustomer) return
    setDrawerMode('add')
    setEditingCustomer(null)
    setDrawerOpen(true)
  }

  function openEditDrawer(customer: Customer) {
    if (!canEditCustomer) return
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

  async function handleToggleStatus() {
    if (!canToggleCustomerActive || !toggleTarget) return
    const nextActive = toggleTarget.status !== 'Active'
    try {
      await dispatch(setCustomerActive({ id: toggleTarget.id, isActive: nextActive })).unwrap()
      showToast({
        title: nextActive ? 'Customer activated' : 'Customer deactivated',
        variant: 'success',
      })
      void dispatch(fetchCustomerFilters())
      void dispatch(fetchCustomers(buildListParams()))
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to update customer status'
      showToast({ title: message, variant: 'error' })
    }
    setToggleTarget(null)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <ListingTemplate
        icon={<Building2 size={20} />}
        title="Customers"
        subtitle="Client directory and relationship management"
        primaryAction={
          canCreateCustomer
            ? {
                label: 'Add Customer',
                onClick: openAddDrawer,
                startIcon: <Plus size={16} strokeWidth={2} />,
              }
            : undefined
        }
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
        page={Math.max(0, pagination.page - 1)}
        pageSize={pagination.pageSize}
        totalCount={pagination.total}
        onPageChange={(zeroBased) => handlePageChange(zeroBased + 1)}
        onPageSizeChange={handlePageSizeChange}
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
                  visibleColumns={visibleColumns}
                  canEdit={canEditCustomer}
                  canToggleActive={canToggleCustomerActive}
                  onView={() => navigate(customerDetailPath(customer))}
                  onEdit={() => openEditDrawer(customer)}
                  onProjects={() => handleProjectsClick(customer)}
                  onToggleStatus={() => setToggleTarget(customer)}
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
            projectStatusOptions={projectStatusOptions}
            statusOptions={statusOptions}
            onColumnFilter={handleColumnFilter}
            canEdit={canEditCustomer}
            canToggleActive={canToggleCustomerActive}
            onView={handleNavigateToCustomer}
            onEdit={openEditDrawer}
            onProjects={handleProjectsClick}
            onToggleStatus={setToggleTarget}
          />
        )}
      </ListingTemplate>

      <CustomerDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        mode={drawerMode}
        customer={editingCustomer}
      />

      <ConfirmToggleDialog
        customer={toggleTarget}
        onConfirm={() => void handleToggleStatus()}
        onClose={() => setToggleTarget(null)}
      />
    </>
  )
}

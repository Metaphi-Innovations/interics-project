import { useState, useEffect, useMemo, useCallback, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
} from '@mui/material'
import {
  CheckCircle,
  Block,
  Add,
  Group,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { Users, MoreVertical } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUsers, toggleUserStatus, deleteUser } from '@/slices/users/thunk'
import { fetchRoles } from '@/slices/roles/thunk'
import { setFilters, resetFilters, setSortConfig } from '@/slices/users/reducer'
import type { User } from '@/slices/users/reducer'
import { ListingTemplate } from '@/components/templates'
import type { StatCardItem, TabItem, FilterField } from '@/components/templates'
import { useToast } from '@/design-system/components'
import {
  FilterableSortHeader,
  StatusColumnToggle,
  useListingQuery,
  clampListingPage0Based,
  type ColumnFilterOption,
} from '@/components/listing'
import { usersApi } from '@/api/usersApi'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { getInitials, getAvatarColor, formatDate } from '@/utils/formatters'
import { tokens } from '@/design-system/tokens'
import { usePermission } from '@/hooks/usePermission'
import { getRoleChip } from './userRoleChips'
import { downloadCsv } from '@/api/downloadCsv'

const LISTING_EDGE_PAD = '14px'
const USER_CELL_PAD_X = LISTING_EDGE_PAD
const USER_ACTION_WIDTH_PX = 84
const USER_MIDDLE_EQUAL_COUNT = 5
const USER_FIXED_RIGHT_PX = USER_ACTION_WIDTH_PX

function userNameColWidth(): string {
  return `calc((100% - ${USER_FIXED_RIGHT_PX}px) * 0.28)`
}

function userMiddleColWidth(): string {
  return `calc((100% - ${USER_FIXED_RIGHT_PX}px) * 0.72 / ${USER_MIDDLE_EQUAL_COUNT})`
}

const TABLE_HEADER_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: USER_CELL_PAD_X,
    paddingRight: USER_CELL_PAD_X,
  },
}

const TABLE_BODY_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: USER_CELL_PAD_X,
    paddingRight: USER_CELL_PAD_X,
  },
}

const TABLE_HEADER_ACTION_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: 0,
    paddingRight: LISTING_EDGE_PAD,
  },
}

const TABLE_BODY_ACTION_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: 0,
    paddingRight: LISTING_EDGE_PAD,
  },
}

const TABLE_HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'middle' as const,
  boxSizing: 'border-box' as const,
  ...TABLE_HEADER_PADDING,
}

const TABLE_HEADER_ACTION_SX = {
  ...TABLE_HEADER_CELL_SX,
  width: USER_ACTION_WIDTH_PX,
  minWidth: USER_ACTION_WIDTH_PX,
  maxWidth: USER_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  whiteSpace: 'nowrap' as const,
  ...TABLE_HEADER_ACTION_PADDING,
}

const TABLE_CELL_SX = {
  verticalAlign: 'middle' as const,
  boxSizing: 'border-box' as const,
  ...TABLE_BODY_PADDING,
}

const TABLE_CELL_ACTION_SX = {
  ...TABLE_CELL_SX,
  width: USER_ACTION_WIDTH_PX,
  minWidth: USER_ACTION_WIDTH_PX,
  maxWidth: USER_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  ...TABLE_BODY_ACTION_PADDING,
}

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

function UserAvatar({ name }: { name: string }) {
  const { bg, text } = getAvatarColor(name)
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: bg,
        color: text,
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

interface UserRowActionsProps {
  user: User
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  onView: () => void
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

function UserRowActions({
  user,
  canView,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: UserRowActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  function open(e: MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }

  function close() {
    setAnchor(null)
  }

  const hasMenuItems = canView || canEdit || canDelete
  if (!hasMenuItems) return null

  return (
    <>
      <MuiIconButton size="small" onClick={open} aria-label="Row actions" sx={{ color: tokens.color.neutral[400], p: 0.5, mx: 'auto' }}>
        <MoreVertical size={16} />
      </MuiIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} onClick={(e) => e.stopPropagation()}>
        {canView ? (
          <MenuItem
            dense
            onClick={() => {
              onView()
              close()
            }}
            sx={{ fontSize: 13, gap: 1 }}
          >
            View
          </MenuItem>
        ) : null}
        {canEdit ? (
          <MenuItem
            dense
            onClick={() => {
              onEdit()
              close()
            }}
            sx={{ fontSize: 13, gap: 1 }}
          >
            Edit
          </MenuItem>
        ) : null}
        {canEdit ? (
          <MenuItem
            dense
            onClick={() => {
              onToggleStatus()
              close()
            }}
            sx={{ fontSize: 13, gap: 1 }}
          >
            {user.status === 'active' ? 'Deactivate' : 'Activate'}
          </MenuItem>
        ) : null}
        {canDelete ? (
          <>
            <Divider />
            <MenuItem
              dense
              disabled={(user.assignedProjectCount ?? user.assignedProjects.length) > 0}
              onClick={() => {
                onDelete()
                close()
              }}
              sx={{ fontSize: 13, gap: 1, color: 'error.main' }}
            >
              Delete
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  )
}

type UsersColumnFilters = {
  name: string
  role: string
  phone: string
  projectAccess: string
  lastLogin: string
  status: string
}

type UsersColumnFilterOptions = {
  name: ColumnFilterOption[]
  role: ColumnFilterOption[]
  phone: ColumnFilterOption[]
  projectAccess: ColumnFilterOption[]
  lastLogin: ColumnFilterOption[]
  status: ColumnFilterOption[]
}

function normalizeProjectAccessFilterOptions(options: ColumnFilterOption[]): ColumnFilterOption[] {
  const counts = Array.from(
    new Set(
      options
        .map((option) => Number(option.value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  ).sort((left, right) => left - right)

  return counts.map((count) => ({ value: String(count), label: String(count) }))
}

interface UsersTableProps {
  items: User[]
  roles: Array<{ id: string; name: string }>
  loading: boolean
  sortField: string
  sortDirection: 'asc' | 'desc'
  filters: UsersColumnFilters
  filterOptions: UsersColumnFilterOptions
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onFilterChange: (next: Partial<UsersColumnFilters>) => void
  onRowClick: (user: User) => void
  onViewClick: (user: User) => void
  onEditClick: (user: User) => void
  onToggleStatus: (user: User) => void
  onDelete: (user: User) => void
  canView: boolean
  canEdit: boolean
  canDelete: boolean
}

function UsersTable({
  items,
  roles,
  loading,
  sortField,
  sortDirection,
  filters,
  filterOptions,
  onSort,
  onFilterChange,
  onRowClick,
  onViewClick,
  onEditClick,
  onToggleStatus,
  onDelete,
  canView,
  canEdit,
  canDelete,
}: UsersTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const nameColWidth = userNameColWidth()
  const middleColWidth = userMiddleColWidth()
  const headNameSx = { ...TABLE_HEADER_CELL_SX, width: nameColWidth, minWidth: 0 }
  const headMiddleSx = { ...TABLE_HEADER_CELL_SX, width: middleColWidth, minWidth: 0 }
  const headStatusSx = { ...headMiddleSx, textAlign: 'center' as const }
  const cellNameSx = { ...TABLE_CELL_SX, width: nameColWidth, minWidth: 0, overflow: 'hidden' }
  const cellMiddleSx = { ...TABLE_CELL_SX, width: middleColWidth, minWidth: 0, overflow: 'hidden' }
  const cellStatusSx = { ...cellMiddleSx, textAlign: 'center' as const }

  return (
    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
        <colgroup>
          <col style={{ width: nameColWidth }} />
          <col style={{ width: middleColWidth }} />
          <col style={{ width: middleColWidth }} />
          <col style={{ width: middleColWidth }} />
          <col style={{ width: middleColWidth }} />
          <col style={{ width: middleColWidth }} />
          <col style={{ width: `${USER_ACTION_WIDTH_PX}px` }} />
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <FilterableSortHeader
              label="Name"
              field="name"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={filters.name}
              filterOptions={filterOptions.name}
              onFilter={(value) => onFilterChange({ name: value })}
              sx={headNameSx}
            />
            <FilterableSortHeader
              label="Role"
              field="role"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={filters.role}
              filterOptions={filterOptions.role}
              onFilter={(value) => onFilterChange({ role: value })}
              sx={headMiddleSx}
            />
            <FilterableSortHeader
              label="Phone"
              filterValue={filters.phone}
              filterOptions={filterOptions.phone}
              onFilter={(value) => onFilterChange({ phone: value })}
              sortable={false}
              sx={headMiddleSx}
            />
            <FilterableSortHeader
              label="Project Access"
              filterValue={filters.projectAccess}
              filterOptions={filterOptions.projectAccess}
              onFilter={(value) => onFilterChange({ projectAccess: value })}
              sortable={false}
              sx={headMiddleSx}
            />
            <FilterableSortHeader
              label="Last Login"
              field="lastLogin"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={filters.lastLogin}
              filterOptions={[]}
              filterMode="date"
              onFilter={(value) => onFilterChange({ lastLogin: value })}
              sx={headMiddleSx}
            />
            <FilterableSortHeader
              label="Status"
              field="status"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={filters.status}
              filterOptions={filterOptions.status}
              onFilter={(value) => onFilterChange({ status: value })}
              sx={headStatusSx}
            />
            <TableCell sx={TABLE_HEADER_ACTION_SX}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading &&
            [...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(7)].map((__, j) => (
                  <TableCell key={j} sx={{ py: '10px', px: USER_CELL_PAD_X }}>
                    <Skeleton variant="text" width="80%" height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} sx={{ border: 0 }}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Users size={32} color={tokens.color.neutral[300]} strokeWidth={1.75} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                    No users found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add your first user to get started
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            items.map((user) => {
              const baseChip = getRoleChip(user.role)
              const chip = {
                ...baseChip,
                label: roles.find((r) => r.id === user.role)?.name ?? baseChip.label,
              }
              const projectCount = user.assignedProjectCount ?? user.assignedProjects.length
              return (
                <TableRow
                  key={user.id}
                  onClick={() => canView && onRowClick(user)}
                  sx={{
                    '&:hover': { bgcolor: hoverBg },
                    '&:last-child td': { border: 0 },
                    cursor: canView ? 'pointer' : 'default',
                  }}
                >
                  <TableCell sx={cellNameSx}>
                    <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
                      <UserAvatar name={user.name} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.3, wordBreak: 'break-word' }}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                          {user.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell sx={cellMiddleSx}>
                    <MuiChip
                      label={chip.label}
                      size="small"
                      sx={{
                        bgcolor: chip.bg,
                        color: chip.color,
                        fontSize: 11,
                        height: 20,
                        fontWeight: 600,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                  </TableCell>

                  <TableCell sx={cellMiddleSx}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {user.phone ?? '—'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={cellMiddleSx}>
                    {projectCount > 0 ? (
                      <MuiChip
                        label={`${projectCount} Project${projectCount !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          bgcolor: tokens.color.neutral[100],
                          color: tokens.color.neutral[600],
                          fontSize: 11,
                          height: 20,
                          fontWeight: 600,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ fontSize: 12, color: tokens.color.neutral[500] }}>
                        All Projects
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={cellMiddleSx}>
                    {user.lastLogin ? (
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {formatDate(user.lastLogin)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12, fontStyle: 'italic' }}>
                        Never
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={cellStatusSx}>
                    <Box sx={CENTER_CELL_CONTENT_SX}>
                      <StatusColumnToggle
                        active={user.status === 'active'}
                        disabled={!canEdit}
                        onToggle={() => onToggleStatus(user)}
                      />
                    </Box>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                    <Box sx={CENTER_CELL_CONTENT_SX}>
                      <UserRowActions
                        user={user}
                        canView={canView}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onView={() => onViewClick(user)}
                        onEdit={() => onEditClick(user)}
                        onToggleStatus={() => onToggleStatus(user)}
                        onDelete={() => onDelete(user)}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function DeactivateDialog({
  open,
  user,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean
  user: User | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Deactivate User</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Deactivating <strong>{user?.name}</strong> will immediately revoke their access.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton size="small" variant="contained" color="warning" onClick={onConfirm} disabled={saving}>
          Deactivate
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

function ActivateDialog({
  open,
  user,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean
  user: User | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Activate User</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Activate <strong>{user?.name}</strong>? They will regain system access.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton size="small" variant="contained" color="success" onClick={onConfirm} disabled={saving}>
          Activate
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

function DeleteDialog({
  open,
  user,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean
  user: User | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Delete User</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Delete <strong>{user?.name}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton size="small" variant="contained" color="error" onClick={onConfirm} disabled={saving}>
          Delete
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

export default function UsersPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { items: rawItems, loading, filters, sortConfig, pagination } = useAppSelector((s) => s.users)
  const items = rawItems ?? []
  const roles = useAppSelector((s) => s.roles.items ?? [])
  const { showToast } = useToast()
  const canCreateUsers = usePermission('userManagementUsers', 'create')
  const canCreateUserManagement = usePermission('userManagement', 'create')
  const canViewUsers = usePermission('userManagementUsers', 'view')
  const canViewUserManagement = usePermission('userManagement', 'view')
  const canEditUsers = usePermission('userManagementUsers', 'edit')
  const canEditUserManagement = usePermission('userManagement', 'edit')
  const canDeleteUsers = usePermission('userManagementUsers', 'delete')
  const canDeleteUserManagement = usePermission('userManagement', 'delete')
  const canCreate = canCreateUsers || canCreateUserManagement
  const canView = canViewUsers || canViewUserManagement
  const canEdit = canEditUsers || canEditUserManagement
  const canDelete = canDeleteUsers || canDeleteUserManagement

  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [actionSaving, setActionSaving] = useState(false)
  const listing = useListingQuery({ pageSize: 10 })
  const [columnFilterOptions, setColumnFilterOptions] = useState<{
    name: ColumnFilterOption[]
    phone: ColumnFilterOption[]
    projectAccess: ColumnFilterOption[]
    lastLogin: ColumnFilterOption[]
    role: ColumnFilterOption[]
    status: ColumnFilterOption[]
  }>({
    name: [],
    phone: [],
    projectAccess: [],
    lastLogin: [],
    role: [],
    status: [],
  })
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    privilegedUsers: 0,
    inactiveUsers: 0,
  })

  const applyStatsResponse = useCallback((res: { data: unknown }) => {
    const data = unwrapApiData<{
      totalUsers?: number
      activeUsers?: number
      privilegedUsers?: number
      inactiveUsers?: number
    }>(res.data)
    if (data) {
      setUserStats({
        totalUsers: data.totalUsers ?? 0,
        activeUsers: data.activeUsers ?? 0,
        privilegedUsers: data.privilegedUsers ?? 0,
        inactiveUsers: data.inactiveUsers ?? 0,
      })
    }
  }, [])

  const refreshUserStats = useCallback(() => {
    void usersApi.getStats().then(applyStatsResponse).catch(() => undefined)
  }, [applyStatsResponse])

  useEffect(() => {
    dispatch(fetchRoles())
    void usersApi.getFilters().then((data) => {
      if (!data) return
      setColumnFilterOptions({
        name: data.name ?? [],
        phone: data.phone ?? [],
        projectAccess: normalizeProjectAccessFilterOptions(data.projectAccess ?? []),
        lastLogin: data.lastLogin ?? [],
        role: data.roles ?? [],
        status: (data.statuses ?? []).map((option) => ({
          ...option,
          value: option.value.toLowerCase(),
        })),
      })
    }).catch(() => undefined)
    refreshUserStats()
  }, [dispatch, refreshUserStats])

  useEffect(() => {
    void dispatch(
      fetchUsers({
        page: listing.apiPage,
        limit: listing.pageSize,
        search: listing.debouncedSearch || undefined,
        status: filters.status || undefined,
        role: filters.role || undefined,
        name: filters.name || undefined,
        phone: filters.phone || undefined,
        projectAccess: filters.projectAccess || undefined,
        lastLogin: filters.lastLogin || undefined,
        sortBy: sortConfig.field || undefined,
        sortOrder: sortConfig.direction,
      }),
    )
  }, [
    dispatch,
    listing.apiPage,
    listing.pageSize,
    listing.debouncedSearch,
    filters.status,
    filters.role,
    filters.name,
    filters.phone,
    filters.projectAccess,
    filters.lastLogin,
    sortConfig.field,
    sortConfig.direction,
  ])

  const pagedItems = items
  const totalUsers = userStats.totalUsers
  const activeUsers = userStats.activeUsers
  const privileged = userStats.privilegedUsers
  const inactiveUsers = userStats.inactiveUsers

  const statCards: StatCardItem[] = useMemo(
    () => [
      { label: 'Total Users', value: totalUsers, variant: 'default', icon: <Group sx={{ fontSize: 24 }} /> },
      { label: 'Active Users', value: activeUsers, variant: 'success', icon: <CheckCircle sx={{ fontSize: 24 }} /> },
      { label: 'Privileged', value: privileged, variant: 'info', icon: <Group sx={{ fontSize: 24 }} /> },
      { label: 'Inactive Users', value: inactiveUsers, variant: 'warning', icon: <Block sx={{ fontSize: 24 }} /> },
    ],
    [totalUsers, activeUsers, privileged, inactiveUsers],
  )

  const listTabs: TabItem[] = useMemo(
    () => [
      { label: 'All', value: 'all', count: totalUsers },
      { label: 'Active', value: 'active', count: activeUsers },
      { label: 'Inactive', value: 'inactive', count: inactiveUsers },
    ],
    [totalUsers, activeUsers, inactiveUsers],
  )

  const activeListTab = filters.status === '' ? 'all' : filters.status === 'active' ? 'active' : 'inactive'

  const filterConfig: FilterField[] = useMemo(
    () => [{ field: 'role', label: 'Role', type: 'select', options: [{ label: 'All Roles', value: '' }, ...columnFilterOptions.role] }],
    [columnFilterOptions.role],
  )

  const activeFilters = useMemo(() => ({ role: filters.role ?? '' }), [filters.role])

  function handleSort(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
  }

  function handleColumnFilterChange(next: Partial<Pick<typeof filters, 'name' | 'role' | 'phone' | 'projectAccess' | 'lastLogin' | 'status'>>) {
    listing.setPage(0)
    dispatch(setFilters(next))
  }

  function handleResetAll() {
    listing.setSearch('')
    listing.setPage(0)
    dispatch(resetFilters())
    dispatch(setSortConfig({ field: '', direction: 'asc' }))
    void dispatch(
      fetchUsers({
        page: 1,
        limit: listing.pageSize,
      }),
    )
  }

  function handleRowClick(user: User) {
    if (!canView) return
    navigate(`/user-management/users/${user.id}`)
  }

  function handleViewClick(user: User) {
    navigate(`/user-management/users/${user.id}`)
  }

  function handleEditClick(user: User) {
    navigate(`/user-management/users/${user.id}/edit`)
  }

  function handleConfirmToggle() {
    if (!toggleTarget) return
    setActionSaving(true)
    dispatch(toggleUserStatus({ id: toggleTarget.id, isActive: toggleTarget.status !== 'active' }))
      .unwrap()
      .then(() => {
        const wasActive = toggleTarget.status === 'active'
        setUserStats((prev) => ({
          ...prev,
          activeUsers: wasActive ? Math.max(0, prev.activeUsers - 1) : prev.activeUsers + 1,
          inactiveUsers: wasActive ? prev.inactiveUsers + 1 : Math.max(0, prev.inactiveUsers - 1),
        }))
        setToggleTarget(null)
        showToast({ title: wasActive ? 'User deactivated' : 'User activated', variant: 'success' })
        refreshUserStats()
        if (filters.status) {
          const nextTotal = Math.max(0, pagination.total - 1)
          const nextPage = clampListingPage0Based(listing.page, nextTotal, listing.pageSize)
          if (nextPage !== listing.page) {
            listing.setPage(nextPage)
            return
          }
          void dispatch(
            fetchUsers({
              page: listing.apiPage,
              limit: listing.pageSize,
              search: listing.debouncedSearch || undefined,
              status: filters.status || undefined,
              role: filters.role || undefined,
              name: filters.name || undefined,
              phone: filters.phone || undefined,
              projectAccess: filters.projectAccess || undefined,
              lastLogin: filters.lastLogin || undefined,
              sortBy: sortConfig.field || undefined,
              sortOrder: sortConfig.direction,
            }),
          )
        }
      })
      .catch(() => showToast({ title: 'Failed to update status', variant: 'error' }))
      .finally(() => setActionSaving(false))
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    setActionSaving(true)
    dispatch(deleteUser(deleteTarget.id))
      .unwrap()
      .then(() => {
        setDeleteTarget(null)
        showToast({ title: 'User deleted', variant: 'success' })
        const nextTotal = Math.max(0, pagination.total - 1)
        const nextPage = clampListingPage0Based(listing.page, nextTotal, listing.pageSize)
        if (nextPage !== listing.page) {
          listing.setPage(nextPage)
          return
        }
        void dispatch(
          fetchUsers({
            page: listing.apiPage,
            limit: listing.pageSize,
            search: listing.debouncedSearch || undefined,
            status: filters.status || undefined,
            role: filters.role || undefined,
            name: filters.name || undefined,
            phone: filters.phone || undefined,
            projectAccess: filters.projectAccess || undefined,
            lastLogin: filters.lastLogin || undefined,
            sortBy: sortConfig.field || undefined,
            sortOrder: sortConfig.direction,
          }),
        )
      })
      .catch((msg: unknown) => showToast({ title: String(msg) || 'Failed to delete user', variant: 'error' }))
      .finally(() => setActionSaving(false))
  }

  function handleDeleteClick(user: User) {
    if ((user.assignedProjectCount ?? user.assignedProjects.length) > 0) {
      showToast({ title: 'Cannot delete user with assigned projects.', variant: 'error' })
      return
    }
    setDeleteTarget(user)
  }

  async function handleExport() {
    try {
      await downloadCsv(
        '/users/export',
        {
          search: listing.debouncedSearch || undefined,
          status: filters.status || undefined,
          role: filters.role || undefined,
          name: filters.name || undefined,
          phone: filters.phone || undefined,
          projectAccess: filters.projectAccess || undefined,
          lastLogin: filters.lastLogin || undefined,
          sortBy: sortConfig.field || undefined,
          sortOrder: sortConfig.direction || undefined,
        },
        `users-${new Date().toISOString().slice(0, 10)}.csv`,
      )
      showToast({ title: 'Export started', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to export users', variant: 'error' })
    }
  }

  return (
    <>
      <ListingTemplate
        icon={<Users size={22} strokeWidth={1.75} />}
        title="Users"
        subtitle="Search, filter, and manage accounts"
        statCards={statCards}
        tabs={listTabs}
        activeTab={activeListTab}
        onTabChange={(v) => {
          listing.setPage(0)
          dispatch(setFilters({ status: v === 'all' ? '' : v }))
        }}
        searchPlaceholder="Search by name or email..."
        searchValue={filters.search}
        onSearchChange={(v) => {
          listing.setSearch(v)
          dispatch(setFilters({ search: v }))
        }}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={(next) => {
          listing.setPage(0)
          dispatch(setFilters({ role: (next.role as string) ?? '' }))
        }}
        onFilterReset={() => {
          listing.setPage(0)
          dispatch(resetFilters())
        }}
        onResetAll={handleResetAll}
        showExport
        onExport={handleExport}
        clipCardContent={false}
        primaryAction={
          canCreate
            ? {
                label: 'Add User',
                onClick: () => navigate('/user-management/users/create'),
                startIcon: <Add sx={{ fontSize: 16 }} />,
              }
            : undefined
        }
        pageSize={listing.pageSize}
        onPageSizeChange={listing.setPageSize}
        page={listing.page}
        totalCount={pagination.total}
        onPageChange={listing.setPage}
      >
        <UsersTable
          items={pagedItems}
          roles={roles}
          loading={loading}
          sortField={sortConfig.field}
          sortDirection={sortConfig.direction}
          filters={{
            name: filters.name,
            role: filters.role,
            phone: filters.phone,
            projectAccess: filters.projectAccess,
            lastLogin: filters.lastLogin,
            status: filters.status,
          }}
          filterOptions={columnFilterOptions}
          onSort={handleSort}
          onFilterChange={handleColumnFilterChange}
          onRowClick={handleRowClick}
          onViewClick={handleViewClick}
          onEditClick={handleEditClick}
          onToggleStatus={(u) => setToggleTarget(u)}
          onDelete={handleDeleteClick}
          canView={canView}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </ListingTemplate>

      {toggleTarget?.status === 'active' ? (
        <DeactivateDialog
          open={Boolean(toggleTarget)}
          user={toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={handleConfirmToggle}
          saving={actionSaving}
        />
      ) : (
        <ActivateDialog
          open={Boolean(toggleTarget)}
          user={toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={handleConfirmToggle}
          saving={actionSaving}
        />
      )}

      <DeleteDialog
        open={Boolean(deleteTarget)}
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        saving={actionSaving}
      />
    </>
  )
}

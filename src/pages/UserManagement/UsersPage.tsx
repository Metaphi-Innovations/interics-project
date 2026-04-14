import { useState, useEffect, useMemo } from 'react'
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
} from '@mui/material'
import {
  CheckCircle,
  Block,
  Edit,
  Delete,
  Add,
  Group,
} from '@mui/icons-material'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import { Users, Eye } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUsers, toggleUserStatus, deleteUser } from '@/slices/users/thunk'
import { fetchRoles } from '@/slices/roles/thunk'
import { setFilters, resetFilters, setSortConfig } from '@/slices/users/reducer'
import type { User } from '@/slices/users/reducer'
import { ListingTemplate } from '@/components/templates'
import type { StatCardItem, TabItem, FilterField } from '@/components/templates'
import { StatusBadge, useToast } from '@/design-system/components'
import { getInitials, getAvatarColor, formatDate } from '@/utils/formatters'
import { tokens } from '@/design-system/tokens'
import { usePermission } from '@/hooks/usePermission'
import { UserManagementLayout } from './components/UserManagementLayout'
import { UserDrawer } from './components/UserDrawer'
import { UserDetailDrawer } from './components/UserDetailDrawer'
import { getRoleChip } from './userRoleChips'

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

interface SortHeaderProps {
  label: string
  field: string
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  sx?: object
}

function SortHeader({ label, field, sortField, sortDirection, onSort, sx }: SortHeaderProps) {
  const isActive = sortField === field
  return (
    <TableCell
      onClick={() => onSort(field, isActive && sortDirection === 'asc' ? 'desc' : 'asc')}
      sx={{
        fontSize: 11,
        fontWeight: isActive ? 700 : 600,
        color: isActive ? 'primary.main' : 'text.secondary',
        py: 1,
        px: 1.75,
        borderBottom: `2px solid ${tokens.color.neutral[100]}`,
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { color: 'primary.main' },
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.25}>
        {label}
        {isActive ? (
          sortDirection === 'asc' ? (
            <KeyboardArrowUpIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          ) : (
            <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          )
        ) : (
          <UnfoldMoreIcon sx={{ fontSize: 14, color: tokens.color.neutral[300] }} />
        )}
      </Stack>
    </TableCell>
  )
}

const STATIC_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: 1,
  px: 1.75,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
}

interface UsersTableProps {
  items: User[]
  loading: boolean
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onView: (user: User) => void
  onEdit: (user: User) => void
  onToggleStatus: (user: User) => void
  onDelete: (user: User) => void
  canView: boolean
  canEdit: boolean
  canDelete: boolean
}

function UsersTable({
  items,
  loading,
  sortField,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  canView,
  canEdit,
  canDelete,
}: UsersTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <SortHeader label="Name" field="name" sortField={sortField} sortDirection={sortDirection} onSort={onSort} sx={{ minWidth: 200 }} />
            <SortHeader label="Role" field="role" sortField={sortField} sortDirection={sortDirection} onSort={onSort} sx={{ width: 140 }} />
            <TableCell sx={{ ...STATIC_CELL_SX, width: 130 }}>Phone</TableCell>
            <TableCell sx={{ ...STATIC_CELL_SX, width: 120 }}>Project Access</TableCell>
            <SortHeader label="Last Login" field="lastLogin" sortField={sortField} sortDirection={sortDirection} onSort={onSort} sx={{ width: 150 }} />
            <TableCell sx={{ ...STATIC_CELL_SX, width: 100 }}>Status</TableCell>
            <TableCell sx={{ ...STATIC_CELL_SX, width: 112, position: 'sticky', right: 0, bgcolor: 'background.paper' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading &&
            [...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(7)].map((__, j) => (
                  <TableCell key={j} sx={{ py: 1.25, px: 1.75 }}>
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
              const chip = getRoleChip(user.role)
              const projectCount = user.assignedProjects.length
              return (
                <TableRow key={user.id} sx={{ '&:hover': { bgcolor: hoverBg }, '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ py: 1.25, px: 1.75 }}>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <UserAvatar name={user.name} />
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.3 }}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ py: 1.25, px: 1.75 }}>
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

                  <TableCell sx={{ py: 1.25, px: 1.75 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {user.phone ?? '—'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.25, px: 1.75 }}>
                    {user.projectAccess === 'all' ? (
                      <Typography variant="body2" sx={{ fontSize: 12, color: tokens.color.neutral[500] }}>
                        All Projects
                      </Typography>
                    ) : (
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
                    )}
                  </TableCell>

                  <TableCell sx={{ py: 1.25, px: 1.75 }}>
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

                  <TableCell sx={{ py: 1.25, px: 1.75 }}>
                    <StatusBadge status={user.status} />
                  </TableCell>

                  <TableCell sx={{ py: 1, px: 1, position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                    <Stack direction="row" alignItems="center" gap={0.25}>
                      {canView && (
                        <Tooltip title="View user">
                          <MuiIconButton size="small" onClick={(e) => { e.stopPropagation(); onView(user) }} sx={{ color: 'text.secondary' }}>
                            <Eye size={15} strokeWidth={1.75} />
                          </MuiIconButton>
                        </Tooltip>
                      )}
                      {canEdit && (
                        <Tooltip title="Edit user">
                          <MuiIconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(user) }} sx={{ color: 'text.secondary' }}>
                            <Edit sx={{ fontSize: 15 }} />
                          </MuiIconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}>
                        <span>
                          <MuiIconButton
                            size="small"
                            disabled={!canEdit}
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleStatus(user)
                            }}
                            sx={{ color: user.status === 'active' ? 'warning.main' : 'success.main' }}
                          >
                            {user.status === 'active' ? <Block sx={{ fontSize: 15 }} /> : <CheckCircle sx={{ fontSize: 15 }} />}
                          </MuiIconButton>
                        </span>
                      </Tooltip>
                      {canDelete && (
                        <Tooltip title={user.assignedProjects.length > 0 ? 'Reassign projects first' : 'Delete user'}>
                          <span>
                            <MuiIconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete(user)
                              }}
                              disabled={user.assignedProjects.length > 0}
                              sx={{ color: 'error.main', '&.Mui-disabled': { color: 'action.disabled' } }}
                            >
                              <Delete sx={{ fontSize: 15 }} />
                            </MuiIconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
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
          Deactivating <strong>{user?.name}</strong> will immediately revoke their system access. This can be undone.
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

function exportUsersCsv(users: User[], roleLabel: (id: string) => string) {
  const headers = ['Name', 'Email', 'Role', 'Phone', 'Project Access', 'Assigned Project IDs', 'Last Login', 'Status']
  const rows = users.map((u) => [
    escapeCsv(u.name),
    escapeCsv(u.email),
    escapeCsv(roleLabel(u.role)),
    escapeCsv(u.phone ?? ''),
    u.projectAccess,
    u.assignedProjects.join(';'),
    u.lastLogin ?? '',
    u.status,
  ])
  const body = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCsv(s: string) {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const ROLE_FILTER_OPTIONS = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: 'r-001' },
  { label: 'Power User', value: 'r-002' },
  { label: 'Project User', value: 'r-003' },
  { label: 'Viewer', value: 'r-004' },
]

export default function UsersPage() {
  const dispatch = useAppDispatch()
  const { items, loading, filters, sortConfig } = useAppSelector((s) => s.users)
  const roles = useAppSelector((s) => s.roles.items)
  const { showToast } = useToast()
  const canCreate = usePermission('users.create')
  const canView = usePermission('users.view')
  const canEdit = usePermission('users.edit')
  const canDelete = usePermission('users.delete')

  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [actionSaving, setActionSaving] = useState(false)
  const [listPage, setListPage] = useState(0)
  const [listPageSize, setListPageSize] = useState(10)

  useEffect(() => {
    dispatch(fetchUsers({}))
    dispatch(fetchRoles())
  }, [dispatch])

  useEffect(() => {
    setListPage(0)
  }, [filters.search, filters.role, filters.status])

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (filters.role) result = result.filter((u) => u.role === filters.role)
    if (filters.status) result = result.filter((u) => u.status === filters.status)

    const { field, direction } = sortConfig
    result.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''
      if (field === 'name') {
        aVal = a.name
        bVal = b.name
      } else if (field === 'role') {
        aVal = a.role
        bVal = b.role
      } else if (field === 'lastLogin') {
        aVal = a.lastLogin ?? ''
        bVal = b.lastLogin ?? ''
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [items, filters, sortConfig])

  const pagedItems = useMemo(
    () => filteredItems.slice(listPage * listPageSize, listPage * listPageSize + listPageSize),
    [filteredItems, listPage, listPageSize],
  )

  const totalUsers = items.length
  const activeUsers = items.filter((u) => u.status === 'active').length
  const privileged = items.filter((u) => u.role === 'r-001' || u.role === 'r-002').length
  const inactiveUsers = items.filter((u) => u.status === 'inactive').length

  const statCards: StatCardItem[] = useMemo(
    () => [
      { label: 'Total Users', value: totalUsers, color: 'default', icon: <Group sx={{ fontSize: 20 }} /> },
      { label: 'Active Users', value: activeUsers, color: 'success', icon: <CheckCircle sx={{ fontSize: 20 }} /> },
      { label: 'Privileged Users', value: privileged, color: 'info', icon: <Group sx={{ fontSize: 20 }} /> },
      { label: 'Inactive Users', value: inactiveUsers, color: 'warning', icon: <Block sx={{ fontSize: 20 }} /> },
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
    () => [{ field: 'role', label: 'Role', type: 'select', options: ROLE_FILTER_OPTIONS }],
    [],
  )

  const activeFilters = useMemo(() => ({ role: filters.role ?? '' }), [filters.role])

  function roleLabel(roleId: string) {
    return roles.find((r) => r.id === roleId)?.name ?? getRoleChip(roleId).label
  }

  function handleSort(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
  }

  function handleConfirmToggle() {
    if (!toggleTarget) return
    setActionSaving(true)
    dispatch(toggleUserStatus(toggleTarget.id))
      .unwrap()
      .then(() => {
        const wasActive = toggleTarget.status === 'active'
        setToggleTarget(null)
        showToast({ title: wasActive ? 'User deactivated' : 'User activated', variant: 'success' })
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
      })
      .catch((msg: unknown) => showToast({ title: String(msg) || 'Failed to delete user', variant: 'error' }))
      .finally(() => setActionSaving(false))
  }

  function handleDeleteClick(user: User) {
    if (user.assignedProjects.length > 0) {
      showToast({ title: 'Cannot delete user with assigned projects. Reassign projects first.', variant: 'error' })
      return
    }
    setDeleteTarget(user)
  }

  function handleExport() {
    exportUsersCsv(filteredItems, roleLabel)
    showToast({ title: 'Export started', variant: 'success' })
  }

  return (
    <>
      <UserManagementLayout>
        <ListingTemplate
          icon={<Users size={22} strokeWidth={1.75} />}
          title="Users"
          subtitle="Search, filter, and manage accounts"
          statCards={statCards}
          tabs={listTabs}
          activeTab={activeListTab}
          onTabChange={(v) => dispatch(setFilters({ status: v === 'all' ? '' : v }))}
          searchPlaceholder="Search by name or email..."
          searchValue={filters.search}
          onSearchChange={(v) => dispatch(setFilters({ search: v }))}
          filterConfig={filterConfig}
          activeFilters={activeFilters}
          onFilterChange={(next) => dispatch(setFilters({ role: (next.role as string) ?? '' }))}
          onFilterReset={() => dispatch(resetFilters())}
          showExport
          onExport={handleExport}
          primaryAction={
            canCreate
              ? {
                  label: '+ Add User',
                  onClick: () => setAddDrawerOpen(true),
                  startIcon: <Add sx={{ fontSize: 16 }} />,
                }
              : undefined
          }
          pageSize={listPageSize}
          onPageSizeChange={(size) => {
            setListPageSize(size)
            setListPage(0)
          }}
          page={listPage}
          totalCount={filteredItems.length}
          onPageChange={setListPage}
        >
          <Box sx={{ p: 0 }}>
            <UsersTable
              items={pagedItems}
              loading={loading}
              sortField={sortConfig.field}
              sortDirection={sortConfig.direction}
              onSort={handleSort}
              onView={(u) => setDetailUser(u)}
              onEdit={(u) => setEditUser(u)}
              onToggleStatus={(u) => setToggleTarget(u)}
              onDelete={handleDeleteClick}
              canView={canView}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </Box>
        </ListingTemplate>
      </UserManagementLayout>

      <UserDrawer open={addDrawerOpen} onClose={() => setAddDrawerOpen(false)} mode="add" />
      <UserDrawer open={Boolean(editUser)} onClose={() => setEditUser(null)} mode="edit" user={editUser} />
      <UserDetailDrawer open={Boolean(detailUser)} onClose={() => setDetailUser(null)} user={detailUser} />

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

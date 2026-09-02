import { useEffect, useState, type MouseEvent } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Skeleton,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Divider,
  Chip as MuiChip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { Plus, ShieldCheck, MoreVertical } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRoles, deleteRole, toggleRoleStatus } from '@/slices/roles/thunk'
import type { Role } from '@/types/permissions'
import { rolesApi } from '@/api/rolesApi'
import {
  FilterableSortHeader,
  SettingsSearchBar,
  StatusColumnToggle,
  useListingQuery,
  type ColumnFilterOption,
} from '@/components/listing'
import { ListingPaginationFooter } from '@/components/templates'
import { tokens } from '@/design-system/tokens'
import { Button, useToast } from '@/design-system/components'
import { usePermission } from '@/hooks/usePermission'
import { UserManagementLayout } from './components/UserManagementLayout'
import { RoleDrawer } from './components/RoleDrawer'

const LEVEL_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: 'Admin',
  1: 'Power User',
  2: 'Project User',
  3: 'Viewer',
}

const LEVEL_CHIP_SX: Record<0 | 1 | 2 | 3, { bgcolor: string; color: string }> = {
  0: { bgcolor: '#CCFBF1', color: '#0D9488' },
  1: { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  2: { bgcolor: '#DCFCE7', color: '#15803D' },
  3: { bgcolor: '#F3F4F6', color: '#6B7280' },
}

const TYPE_SYSTEM_SX = { bgcolor: '#F3F4F6', color: '#6B7280' }
const TYPE_CUSTOM_SX = { bgcolor: '#CCFBF1', color: '#0D9488' }

type RoleColumnFilters = {
  name: string
  level: string
  type: string
  status: string
}

type RoleColumnFilterOptions = {
  name: ColumnFilterOption[]
  level: ColumnFilterOption[]
  type: ColumnFilterOption[]
  status: ColumnFilterOption[]
}

function DeleteRoleDialog({
  open,
  role,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean
  role: Role | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Delete Role</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Delete <strong>{role?.name}</strong>? This cannot be undone.
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

function RoleStatusDialog({
  open,
  role,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean
  role: Role | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  const activating = role?.status !== 'active'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>
        {activating ? 'Activate Role' : 'Deactivate Role'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          {activating ? (
            <>
              Activate <strong>{role?.name}</strong>? Users assigned to this role can use it again.
            </>
          ) : (
            <>
              Deactivate <strong>{role?.name}</strong>? It will no longer be available for assignment.
            </>
          )}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          color={activating ? 'success' : 'warning'}
          onClick={onConfirm}
          disabled={saving}
        >
          {activating ? 'Activate' : 'Deactivate'}
        </MuiButton>
      </DialogActions>
    </Dialog>
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

const ROLE_ACTION_WIDTH_PX = 84

const TABLE_HEADER_ACTION_SX = {
  ...STATIC_CELL_SX,
  width: ROLE_ACTION_WIDTH_PX,
  minWidth: ROLE_ACTION_WIDTH_PX,
  maxWidth: ROLE_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const TABLE_CELL_ACTION_SX = {
  py: 1,
  px: 0,
  pr: 1.75,
  width: ROLE_ACTION_WIDTH_PX,
  minWidth: ROLE_ACTION_WIDTH_PX,
  maxWidth: ROLE_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

interface RoleRowActionsProps {
  role: Role
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}

function RoleRowActions({ role, canEdit, canDelete, onEdit, onDelete }: RoleRowActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  function open(e: MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }

  function close() {
    setAnchor(null)
  }

  if (!canEdit && !canDelete) return null

  const editDisabled = role.isSystem || !canEdit
  const deleteDisabled = role.isSystem || role.userCount > 0 || !canDelete

  return (
    <>
      <MuiIconButton size="small" onClick={open} aria-label="Row actions" sx={{ color: tokens.color.neutral[400], p: 0.5, mx: 'auto' }}>
        <MoreVertical size={16} />
      </MuiIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} onClick={(e) => e.stopPropagation()}>
        {canEdit ? (
          <MenuItem
            dense
            disabled={editDisabled}
            onClick={() => {
              if (!editDisabled) onEdit()
              close()
            }}
            sx={{ fontSize: 13, gap: 1 }}
          >
            Edit
          </MenuItem>
        ) : null}
        {canDelete ? (
          <>
            {canEdit ? <Divider /> : null}
            <MenuItem
              dense
              disabled={deleteDisabled}
              onClick={() => {
                if (!deleteDisabled) onDelete()
                close()
              }}
              sx={{ fontSize: 13, gap: 1, color: deleteDisabled ? undefined : 'error.main' }}
            >
              Delete
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  )
}

export default function RolesPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { items: rawRoles, loading, saving, pagination } = useAppSelector((s) => s.roles)
  const roles = rawRoles ?? []
  const { showToast } = useToast()
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const listing = useListingQuery({
    filters: { name: '', level: '', type: '', status: '' },
  })

  const canEditRole = usePermission('userManagementRoles', 'edit')
  const canEditUserManagement = usePermission('userManagement', 'edit')
  const canCreateRole = usePermission('userManagementRoles', 'create')
  const canCreateUserManagement = usePermission('userManagement', 'create')
  const canDeleteRole = usePermission('userManagementRoles', 'delete')
  const canDeleteUserManagement = usePermission('userManagement', 'delete')
  const canEdit = canEditRole || canEditUserManagement
  const canCreate = canCreateRole || canCreateUserManagement
  const canDelete = canDeleteRole || canDeleteUserManagement

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Role | null>(null)
  const [filterOptions, setFilterOptions] = useState<RoleColumnFilterOptions>({
    name: [],
    level: [],
    type: [],
    status: [],
  })
  const [sortField, setSortField] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const isCreate = /\/user-management\/roles\/create\/?$/.test(pathname)
  const editMatch = /\/user-management\/roles\/([^/]+)\/edit\/?$/.exec(pathname)
  const editId = editMatch?.[1] ?? null
  const drawerOpen = isCreate || Boolean(editId)
  const drawerMode: 'create' | 'edit' | null = isCreate ? 'create' : editId ? 'edit' : null

  function closeDrawer() {
    navigate('/user-management/roles')
  }

  useEffect(() => {
    void dispatch(
      fetchRoles({
        page: listing.apiPage,
        limit: listing.pageSize,
        search: listing.debouncedSearch || undefined,
        name: listing.filters.name || undefined,
        level: listing.filters.level || undefined,
        type: listing.filters.type || undefined,
        status: listing.filters.status || undefined,
        sortBy: sortField,
        sortOrder: sortField ? sortDirection : undefined,
      }),
    )
  }, [
    dispatch,
    listing.apiPage,
    listing.pageSize,
    listing.debouncedSearch,
    listing.filters.name,
    listing.filters.level,
    listing.filters.type,
    listing.filters.status,
    sortField,
    sortDirection,
  ])

  useEffect(() => {
    void rolesApi.getFilters().then((data) => {
      if (!data) return
      setFilterOptions({
        name: data.name ?? [],
        level: data.level ?? [],
        type: data.type ?? [],
        status: data.statuses ?? [],
      })
    }).catch(() => undefined)
  }, [])

  function handleEdit(role: Role) {
    navigate(`/user-management/roles/${role.id}/edit`)
  }

  function handleDeleteClick(role: Role) {
    if (role.isSystem) {
      showToast({ title: 'System roles cannot be deleted', variant: 'error' })
      return
    }
    if (role.userCount > 0) {
      showToast({ title: 'Reassign users before deleting this role', variant: 'error' })
      return
    }
    setDeleteTarget(role)
  }

  function handleStatusToggleClick(role: Role) {
    if (role.isSystem) {
      showToast({ title: 'System roles cannot be updated', variant: 'error' })
      return
    }
    if (role.status === 'active' && role.userCount > 0) {
      showToast({ title: 'Reassign users before deactivating this role', variant: 'error' })
      return
    }
    setToggleTarget(role)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    dispatch(deleteRole(deleteTarget.id))
      .unwrap()
      .then(() => {
        setDeleteTarget(null)
        showToast({ title: 'Role deleted', variant: 'success' })
      })
      .catch(() => showToast({ title: 'Failed to delete role', variant: 'error' }))
  }

  function handleConfirmToggle() {
    if (!toggleTarget) return
    const nextStatus = toggleTarget.status === 'active' ? 'INACTIVE' : 'ACTIVE'
    dispatch(toggleRoleStatus({ id: toggleTarget.id, status: nextStatus }))
      .unwrap()
      .then(() => {
        const activating = nextStatus === 'ACTIVE'
        setToggleTarget(null)
        showToast({ title: activating ? 'Role activated' : 'Role deactivated', variant: 'success' })
      })
      .catch((message: unknown) => {
        showToast({ title: String(message) || 'Failed to update role status', variant: 'error' })
      })
  }

  function handleColumnFilterChange(next: Partial<RoleColumnFilters>) {
    listing.setPage(0)
    listing.setFilters({ ...listing.filters, ...next })
  }

  function handleResetAll() {
    listing.setSearch('')
    listing.resetFilters()
    setSortField(undefined)
    setSortDirection('asc')
  }

  return (
    <>
      <UserManagementLayout>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 3 }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}>
              <ShieldCheck size={22} strokeWidth={1.75} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: 18 }}>
                Roles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage role labels and access levels
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5}>
            <SettingsSearchBar
              placeholder="Search roles..."
              value={listing.search}
              onChange={listing.setSearch}
              onReset={handleResetAll}
              sx={{ mb: 0 }}
            />
            {canCreate && (
              <Button
                variant="contained"
                color="primary"
                size="sm"
                startIcon={<Plus size={14} strokeWidth={2} />}
                onClick={() => navigate('/user-management/roles/create')}
                sx={{ bgcolor: tokens.color.success[600], '&:hover': { bgcolor: tokens.color.success[700] } }}
              >
                Create Role
              </Button>
            )}
          </Stack>
        </Stack>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <FilterableSortHeader
                    label="Role Name"
                    field="name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field, direction) => {
                      setSortField(field)
                      setSortDirection(direction)
                    }}
                    filterValue={listing.filters.name}
                    filterOptions={filterOptions.name}
                    onFilter={(value) => handleColumnFilterChange({ name: value })}
                    sx={{ ...STATIC_CELL_SX, minWidth: 200 }}
                  />
                  <FilterableSortHeader
                    label="Level"
                    filterValue={listing.filters.level}
                    filterOptions={filterOptions.level}
                    onFilter={(value) => handleColumnFilterChange({ level: value })}
                    sortable={false}
                    sx={{ ...STATIC_CELL_SX, width: 140 }}
                  />
                  <TableCell sx={{ ...STATIC_CELL_SX, width: 90 }}>Users</TableCell>
                  <FilterableSortHeader
                    label="Type"
                    filterValue={listing.filters.type}
                    filterOptions={filterOptions.type}
                    onFilter={(value) => handleColumnFilterChange({ type: value })}
                    sortable={false}
                    sx={{ ...STATIC_CELL_SX, width: 100 }}
                  />
                  <FilterableSortHeader
                    label="Status"
                    field="status"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field, direction) => {
                      setSortField(field)
                      setSortDirection(direction)
                    }}
                    filterValue={listing.filters.status}
                    filterOptions={filterOptions.status}
                    onFilter={(value) => handleColumnFilterChange({ status: value })}
                    sx={{ ...STATIC_CELL_SX, width: 120, textAlign: 'center' as const }}
                  />
                  <TableCell sx={TABLE_HEADER_ACTION_SX}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading &&
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((__, j) => (
                        <TableCell key={j} sx={{ py: 1.25, px: 1.75 }}>
                          <Skeleton variant="text" width="80%" height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!loading && roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ border: 0 }}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <ShieldCheck size={32} color={tokens.color.neutral[300]} strokeWidth={1.75} />
                        <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                          No roles found
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  roles.map((role) => (
                    <TableRow key={role.id} sx={{ '&:hover': { bgcolor: hoverBg }, '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ py: 1.25, px: 1.75 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.3 }}>
                          {role.name}
                        </Typography>
                        {role.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {role.description}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ py: 1.25, px: 1.75 }}>
                        <MuiChip
                          label={`${role.level} — ${LEVEL_LABELS[role.level]}`}
                          size="small"
                          sx={{
                            ...LEVEL_CHIP_SX[role.level],
                            fontSize: 11,
                            height: 22,
                            fontWeight: 600,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ py: 1.25, px: 1.75 }}>
                        <MuiChip
                          label={role.userCount}
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
                      </TableCell>

                      <TableCell sx={{ py: 1.25, px: 1.75 }}>
                        {role.isSystem ? (
                          <MuiChip
                            label="System"
                            size="small"
                            sx={{
                              ...TYPE_SYSTEM_SX,
                              fontSize: 11,
                              height: 20,
                              fontWeight: 600,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        ) : (
                          <MuiChip
                            label="Custom"
                            size="small"
                            sx={{
                              ...TYPE_CUSTOM_SX,
                              fontSize: 11,
                              height: 20,
                              fontWeight: 600,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        )}
                      </TableCell>

                      <TableCell sx={{ py: 1.25, px: 1.75, textAlign: 'center' }}>
                        <Box sx={CENTER_CELL_CONTENT_SX}>
                          <StatusColumnToggle
                            active={role.status === 'active'}
                            disabled={!canEdit || role.isSystem || saving}
                            onToggle={() => handleStatusToggleClick(role)}
                          />
                        </Box>
                      </TableCell>

                      <TableCell sx={TABLE_CELL_ACTION_SX}>
                        <Box sx={CENTER_CELL_CONTENT_SX}>
                          <RoleRowActions
                            role={role}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onEdit={() => handleEdit(role)}
                            onDelete={() => handleDeleteClick(role)}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <ListingPaginationFooter
            pageSize={listing.pageSize}
            onPageSizeChange={listing.setPageSize}
            page={listing.page}
            totalCount={pagination.total}
            onPageChange={listing.setPage}
          />
        </Box>
      </UserManagementLayout>

      <RoleDrawer open={drawerOpen} mode={drawerMode} roleId={editId} onClose={closeDrawer} />

      <DeleteRoleDialog
        open={Boolean(deleteTarget)}
        role={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        saving={saving}
      />

      <RoleStatusDialog
        open={Boolean(toggleTarget)}
        role={toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
        saving={saving}
      />
    </>
  )
}

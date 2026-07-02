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
import { fetchRoles, deleteRole } from '@/slices/roles/thunk'
import { fetchUsers } from '@/slices/users/thunk'
import type { Role } from '@/types/permissions'
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

const STATIC_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: 1,
  px: 1.75,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
}

const ROLE_ACTION_WIDTH_PX = 60

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
  const { items: rawRoles, loading, saving } = useAppSelector((s) => s.roles)
  const roles = rawRoles ?? []
  const { showToast } = useToast()
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  const canEdit = usePermission('userManagement', 'edit')
  const canCreate = usePermission('userManagement', 'create')
  const canDelete = usePermission('userManagement', 'delete')

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const isCreate = /\/user-management\/roles\/create\/?$/.test(pathname)
  const editMatch = /\/user-management\/roles\/([^/]+)\/edit\/?$/.exec(pathname)
  const editId = editMatch?.[1] ?? null
  const drawerOpen = isCreate || Boolean(editId)
  const drawerMode: 'create' | 'edit' | null = isCreate ? 'create' : editId ? 'edit' : null

  function closeDrawer() {
    navigate('/user-management/roles')
  }

  useEffect(() => {
    dispatch(fetchRoles())
    dispatch(fetchUsers({}))
  }, [dispatch])

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

  return (
    <>
      <UserManagementLayout>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }}>
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
                  <TableCell sx={{ ...STATIC_CELL_SX, minWidth: 200 }}>Role Name</TableCell>
                  <TableCell sx={{ ...STATIC_CELL_SX, width: 140 }}>Level</TableCell>
                  <TableCell sx={{ ...STATIC_CELL_SX, width: 90 }}>Users</TableCell>
                  <TableCell sx={{ ...STATIC_CELL_SX, width: 100 }}>Type</TableCell>
                  <TableCell sx={TABLE_HEADER_ACTION_SX}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading &&
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((__, j) => (
                        <TableCell key={j} sx={{ py: 1.25, px: 1.75 }}>
                          <Skeleton variant="text" width="80%" height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!loading && roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ border: 0 }}>
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
    </>
  )
}

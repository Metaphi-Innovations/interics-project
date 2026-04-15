import { useEffect, useState } from 'react'
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
  Tooltip,
  Chip as MuiChip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { Edit, Delete } from '@mui/icons-material'
import { ShieldCheck } from 'lucide-react'
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

export default function RolesPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { items: roles, loading, saving } = useAppSelector((s) => s.roles)
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
            <Button variant="contained" color="primary" size="sm" onClick={() => navigate('/user-management/roles/create')}>
              + Create Role
            </Button>
          )}
        </Stack>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: `1px solid ${tokens.color.neutral[200]}`,
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
                  <TableCell sx={{ ...STATIC_CELL_SX, width: 80, position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                    Actions
                  </TableCell>
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
                            bgcolor: tokens.color.neutral[100],
                            color: tokens.color.neutral[700],
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
                              bgcolor: tokens.color.neutral[100],
                              color: tokens.color.neutral[600],
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
                              bgcolor: tokens.color.success[100],
                              color: tokens.color.success[800],
                              fontSize: 11,
                              height: 20,
                              fontWeight: 600,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        )}
                      </TableCell>

                      <TableCell sx={{ py: 1, px: 1, position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                        <Stack direction="row" alignItems="center" gap={0.25}>
                          <Tooltip
                            title={
                              role.isSystem
                                ? 'System roles cannot be edited'
                                : canEdit
                                  ? 'Edit role'
                                  : 'No permission'
                            }
                          >
                            <span>
                              <MuiIconButton
                                size="small"
                                disabled={role.isSystem || !canEdit}
                                onClick={() => handleEdit(role)}
                                sx={{ color: 'text.secondary', '&.Mui-disabled': { color: 'action.disabled' } }}
                              >
                                <Edit sx={{ fontSize: 15 }} />
                              </MuiIconButton>
                            </span>
                          </Tooltip>

                          {canDelete && (
                            <Tooltip
                              title={
                                role.isSystem
                                  ? 'System roles cannot be deleted'
                                  : role.userCount > 0
                                    ? 'Reassign users before deleting'
                                    : 'Delete role'
                              }
                            >
                              <span>
                                <MuiIconButton
                                  size="small"
                                  disabled={role.isSystem || role.userCount > 0}
                                  onClick={() => handleDeleteClick(role)}
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

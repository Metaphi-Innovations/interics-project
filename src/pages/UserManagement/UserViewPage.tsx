import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip as MuiChip,
  CircularProgress,
  IconButton as MuiIconButton,
} from '@mui/material'
import { ArrowLeft } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUsers } from '@/slices/users/thunk'
import { fetchRoles } from '@/slices/roles/thunk'
import type { User } from '@/slices/users/reducer'
import type { ModuleCrudAction, UserPermissions, UserPermissionModuleKey } from '@/types/permissions'
import { MODULE_CRUD_ACTIONS } from '@/types/permissions'
import { FormSection, FormField } from '@/components/templates'
import PageHeader from '@/components/layout/PageHeader'
import { Button, StatusBadge } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { usersApi } from '@/api/usersApi'
import client from '@/api/client'
import type { ProjectOption } from './projectOption'
import { MODULE_DEFS } from './components/RolePermissionsPanel'
import { UserManagementLayout } from './components/UserManagementLayout'
import { getRoleChip } from './userRoleChips'
import { usePermission } from '@/hooks/usePermission'

const ACTION_LABELS: Record<ModuleCrudAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

const FULL_ACCESS_COLOR = '#0D9488'

function PermissionActionsCell({ perms, modId }: { perms: UserPermissions; modId: UserPermissionModuleKey }) {
  const b = perms[modId]
  const allTrue = MODULE_CRUD_ACTIONS.every((a) => b[a])
  const noneTrue = MODULE_CRUD_ACTIONS.every((a) => !b[a])
  if (allTrue) {
    return (
      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, color: FULL_ACCESS_COLOR }}>
        Full Access
      </Typography>
    )
  }
  if (noneTrue) {
    return (
      <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
        None
      </Typography>
    )
  }
  const labels = MODULE_CRUD_ACTIONS.filter((a) => b[a]).map((a) => ACTION_LABELS[a])
  return (
    <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
      {labels.join(', ')}
    </Typography>
  )
}

export default function UserViewPage() {
  const navigate = useNavigate()
  const { id: userId } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const roles = useAppSelector((s) => s.roles.items)
  const canEdit = usePermission('userManagement', 'edit')

  const [user, setUser] = useState<User | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    dispatch(fetchRoles())
    dispatch(fetchUsers({}))
  }, [dispatch])

  useEffect(() => {
    client
      .get<{ items: { id: string; name: string; customerName: string }[] }>('/projects', {
        params: { page: 1, pageSize: 500 },
      })
      .then((r) => {
        const items = r.data.items ?? []
        setProjects(
          items.map((p) => ({
            id: p.id,
            name: p.name,
            clientName: p.customerName,
          })),
        )
      })
      .catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    if (!userId) {
      setLoadState('error')
      return
    }
    let cancelled = false
    setLoadState('loading')
    usersApi
      .getById(userId)
      .then((res) => {
        if (cancelled) return
        setUser(res.data as User)
        setLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const roleName = user
    ? roles.find((r) => r.id === user.role)?.name ?? getRoleChip(user.role).label
    : ''
  const roleChip = user ? getRoleChip(user.role) : { label: '', bg: '', color: '' }

  const projectAccessText =
    user && user.projectAccess === 'all'
      ? 'All Projects'
      : user
        ? user.assignedProjects.map((pid) => projects.find((p) => p.id === pid)?.name ?? pid).join(', ') || '—'
        : '—'

  if (loadState === 'loading') {
    return (
      <UserManagementLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      </UserManagementLayout>
    )
  }

  if (loadState === 'error' || !user) {
    return (
      <UserManagementLayout>
        <Typography color="error">User not found.</Typography>
        <Button variant="outlined" color="secondary" size="sm" onClick={() => navigate('/user-management/users')} sx={{ mt: 2 }}>
          Back to Users
        </Button>
      </UserManagementLayout>
    )
  }

  return (
    <UserManagementLayout>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <MuiIconButton
          aria-label="Back to users"
          onClick={() => navigate('/user-management/users')}
          size="small"
          sx={{ color: 'text.secondary', mr: 0.5 }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </MuiIconButton>
      </Stack>

      <PageHeader
        breadcrumb={[
          { label: 'User Management', href: '/user-management/users' },
          { label: 'Users', href: '/user-management/users' },
          { label: user.name },
        ]}
        title={user.name}
        actions={
          canEdit ? (
            <Button
              variant="contained"
              color="primary"
              size="sm"
              onClick={() => navigate(`/user-management/users/${user.id}/edit`)}
              sx={{ bgcolor: tokens.color.success[600], '&:hover': { bgcolor: tokens.color.success[700] } }}
            >
              Edit User
            </Button>
          ) : undefined
        }
      />

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          p: { xs: 2, md: 3 },
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} gap={3} alignItems="flex-start">
          <Box sx={{ width: { xs: 1, md: 400 }, flexShrink: 0 }}>
            <FormSection title="Basic Info" columns={1} divider={false}>
              <FormField label="Full Name">
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {user.name}
                </Typography>
              </FormField>
              <FormField label="Email">
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {user.email}
                </Typography>
              </FormField>
              <FormField label="Phone">
                <Typography variant="body2" sx={{ fontSize: 13, fontFamily: 'monospace' }}>
                  {user.phone?.trim() ? user.phone : '—'}
                </Typography>
              </FormField>
              <FormField label="Employee ID">
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {user.employeeId?.trim() ? user.employeeId.trim() : '—'}
                </Typography>
              </FormField>
            </FormSection>

            <FormSection title="Role" columns={1}>
              <MuiChip
                label={roleName}
                size="small"
                sx={{
                  bgcolor: roleChip.bg,
                  color: roleChip.color,
                  fontSize: 11,
                  height: 22,
                  fontWeight: 600,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            </FormSection>

            <FormSection title="Status" columns={1}>
              <StatusBadge status={user.status} />
            </FormSection>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <FormSection title="Permissions" columns={1} divider={false}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Actions granted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MODULE_DEFS.map((mod) => (
                    <TableRow key={mod.id}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{mod.label}</TableCell>
                      <TableCell>
                        <PermissionActionsCell perms={user.permissions} modId={mod.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </FormSection>

            <FormSection title="Project Access" columns={1}>
              <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {projectAccessText}
              </Typography>
            </FormSection>
          </Box>
        </Stack>
      </Box>
    </UserManagementLayout>
  )
}

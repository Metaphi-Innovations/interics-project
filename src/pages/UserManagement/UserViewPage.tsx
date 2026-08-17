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
  TableContainer,
  Chip as MuiChip,
  CircularProgress,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUsers, toUiUser } from '@/slices/users/thunk'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { fetchRoles } from '@/slices/roles/thunk'
import type { User } from '@/slices/users/reducer'
import type { ModuleCrudAction, UserPermissions, UserPermissionModuleKey } from '@/types/permissions'
import { MODULE_CRUD_ACTIONS } from '@/types/permissions'
import { FormSection, FormField } from '@/components/templates'
import PageHeader from '@/components/layout/PageHeader'
import { Button, StatusBadge } from '@/design-system/components'
import { tokens, TREND_COLORS } from '@/design-system/tokens'
import { usersApi } from '@/api/usersApi'
import client from '@/api/client'
import type { ProjectOption } from './projectOption'
import { MODULE_DEFS } from './components/RolePermissionsPanel'
import { getRoleChip } from './userRoleChips'
import { usePermission } from '@/hooks/usePermission'

const ACTION_LABELS: Record<ModuleCrudAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

const FULL_ACCESS_COLOR = tokens.color.success[700]
const FIELD_LABEL_COLOR = TREND_COLORS.neutral.color

const TABLE_HEADER_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: FIELD_LABEL_COLOR,
  py: 1,
  px: 1.75,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  bgcolor: tokens.color.neutral[50],
}

const TABLE_CELL_SX = {
  fontSize: 13,
  py: 1.25,
  px: 1.75,
  verticalAlign: 'middle' as const,
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontSize: 13,
        fontWeight: 500,
        color: value === '—' ? 'text.secondary' : 'text.primary',
      }}
    >
      {value}
    </Typography>
  )
}

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
  const theme = useTheme()
  const roles = useAppSelector((s) => s.roles.items ?? [])
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
        setUser(toUiUser(unwrapApiData(res.data)))
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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (loadState === 'error' || !user) {
    return (
      <Stack gap={2}>
        <Typography color="error">User not found.</Typography>
        <Button variant="outlined" color="secondary" size="sm" onClick={() => navigate('/user-management/users')}>
          Back to Users
        </Button>
      </Stack>
    )
  }

  return (
    <>
      <PageHeader
        backHref="/user-management/users"
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
        <Stack direction={{ xs: 'column', lg: 'row' }} gap={3} alignItems="flex-start">
          <Box sx={{ width: { xs: 1, lg: 420 }, flexShrink: 0 }}>
            <FormSection title="Basic Info" columns={2} divider={false}>
              <FormField label="Full Name">
                <ReadOnlyValue value={user.name} />
              </FormField>
              <FormField label="Email">
                <ReadOnlyValue value={user.email} />
              </FormField>
              <FormField label="Phone">
                <ReadOnlyValue value={user.phone?.trim() ? user.phone : '—'} />
              </FormField>
              <FormField label="Employee ID">
                <ReadOnlyValue value={user.employeeId?.trim() ? user.employeeId.trim() : '—'} />
              </FormField>
              <FormField label="Role">
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
              </FormField>
              <FormField label="Status">
                <StatusBadge status={user.status} />
              </FormField>
            </FormSection>

            <FormSection title="Project Access" columns={1}>
              <ReadOnlyValue value={projectAccessText} />
            </FormSection>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <FormSection title="Permissions" columns={1} divider={false}>
              <TableContainer
                sx={{
                  border: `1px solid ${tokens.color.neutral[100]}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '60%' }} />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={TABLE_HEADER_SX}>Module</TableCell>
                      <TableCell sx={TABLE_HEADER_SX}>Actions Granted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MODULE_DEFS.map((mod, index) => (
                      <TableRow
                        key={mod.id}
                        sx={{
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                          '&:last-child td': { border: 0 },
                          bgcolor: index % 2 === 0 ? 'background.paper' : tokens.color.neutral[50],
                        }}
                      >
                        <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>{mod.label}</TableCell>
                        <TableCell sx={TABLE_CELL_SX}>
                          <PermissionActionsCell perms={user.permissions} modId={mod.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </FormSection>
          </Box>
        </Stack>
      </Box>
    </>
  )
}

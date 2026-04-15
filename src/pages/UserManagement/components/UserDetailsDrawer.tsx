import { useEffect, useState } from 'react'
import { Typography, Chip as MuiChip, Divider, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { useAppSelector } from '@/store/hooks'
import type { User } from '@/slices/users/reducer'
import type { UserPermissionModuleKey, UserPermissions } from '@/types/permissions'
import { MODULE_CRUD_ACTIONS } from '@/types/permissions'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import { Button } from '@/design-system/components'
import { formatDate } from '@/utils/formatters'
import { getRoleChip } from '../userRoleChips'
import client from '@/api/client'
import type { ProjectOption } from '../projectOption'
import { MODULE_DEFS } from './RolePermissionsPanel'

const ACTION_LABELS: Record<(typeof MODULE_CRUD_ACTIONS)[number], string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

function actionsSummary(perms: UserPermissions, modId: UserPermissionModuleKey): string {
  const b = perms[modId]
  const labels = MODULE_CRUD_ACTIONS.filter((a) => b[a]).map((a) => ACTION_LABELS[a])
  return labels.length ? labels.join(', ') : 'None'
}

export interface UserDetailsDrawerProps {
  open: boolean
  onClose: () => void
  user: User | null
  onEdit?: () => void
}

export function UserDetailsDrawer({ open, onClose, user, onEdit }: UserDetailsDrawerProps) {
  const roles = useAppSelector((s) => s.roles.items)
  const [projects, setProjects] = useState<ProjectOption[]>([])

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

  const roleName = user
    ? roles.find((r) => r.id === user.role)?.name ?? getRoleChip(user.role).label
    : ''

  const projectBlock =
    user && user.projectAccess === 'all'
      ? 'All Projects'
      : user
        ? user.assignedProjects.map((id) => projects.find((p) => p.id === id)?.name ?? id).join(', ') || '—'
        : ''

  return (
    <DrawerForm
      open={open && Boolean(user)}
      onClose={onClose}
      title="User details"
      subtitle={user?.name}
      hideFooter
      width={560}
      headerActions={
        onEdit && user ? (
          <Button
            variant="outlined"
            color="primary"
            size="sm"
            onClick={() => {
              onEdit()
              onClose()
            }}
          >
            Edit
          </Button>
        ) : undefined
      }
    >
      {user && (
        <>
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
                {user.phone ?? '—'}
              </Typography>
            </FormField>
            <FormField label="Employee ID">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {user.employeeId ?? '—'}
              </Typography>
            </FormField>
          </FormSection>

          <FormSection title="Role" columns={1}>
            <MuiChip
              label={roleName}
              size="small"
              sx={{
                bgcolor: getRoleChip(user.role).bg,
                color: getRoleChip(user.role).color,
                fontSize: 11,
                height: 22,
                fontWeight: 600,
              }}
            />
          </FormSection>

          <FormSection title="Permissions" columns={1}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MODULE_DEFS.map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{mod.label}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {actionsSummary(user.permissions, mod.id)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </FormSection>

          <FormSection title="Project Access" columns={1}>
            <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {projectBlock}
            </Typography>
          </FormSection>

          <Divider sx={{ my: 2 }} />

          <FormSection title="Activity" columns={1} divider={false}>
            <FormField label="Last Login">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {user.lastLogin ? formatDate(user.lastLogin) : <em>Never</em>}
              </Typography>
            </FormField>
          </FormSection>
        </>
      )}
    </DrawerForm>
  )
}

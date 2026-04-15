import { useEffect, useState } from 'react'
import { Stack, Typography, Chip as MuiChip, Divider } from '@mui/material'
import { useAppSelector } from '@/store/hooks'
import type { User } from '@/slices/users/reducer'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import { formatDate } from '@/utils/formatters'
import { getRoleChip } from '../userRoleChips'
import client from '@/api/client'
import type { ProjectOption } from './UserDrawer'

interface UserDetailDrawerProps {
  open: boolean
  onClose: () => void
  user: User | null
}

export function UserDetailDrawer({ open, onClose, user }: UserDetailDrawerProps) {
  const roles = useAppSelector((s) => s.roles.items)
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    client.get<ProjectOption[]>('/projects-list').then((r) => setProjects(r.data)).catch(() => {})
  }, [])

  const roleName = user
    ? roles.find((r) => r.id === user.role)?.name ?? getRoleChip(user.role).label
    : ''
  const projectLabels = user
    ? user.projectAccess === 'all'
      ? 'All Projects'
      : user.assignedProjects
          .map((id) => projects.find((p) => p.id === id)?.name ?? id)
          .join(', ') || '—'
    : ''

  return (
    <DrawerForm
      open={open && Boolean(user)}
      onClose={onClose}
      title="User details"
      subtitle={user?.name}
      hideFooter
      width={520}
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
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
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
              {user.role === 'r-001' && (
                <Typography variant="caption" color="text.secondary">
                  Full system access
                </Typography>
              )}
            </Stack>
          </FormSection>

          <FormSection title="Project Access" columns={1}>
            <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {projectLabels}
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

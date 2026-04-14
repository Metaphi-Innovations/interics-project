import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { Button } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Users, ShieldCheck } from 'lucide-react'
import { tokens } from '@/design-system/tokens'

interface UserManagementLayoutProps {
  children: ReactNode
  /** Right side of header row (e.g. Add User, Create Role) */
  endAdornment?: ReactNode
}

export function UserManagementLayout({ children, endAdornment }: UserManagementLayoutProps) {
  const { pathname } = useLocation()
  const usersActive = pathname === '/user-management'
  const rolesActive = pathname.startsWith('/user-management/roles')

  return (
    <Box sx={{ p: { xs: 2, md: 3, lg: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box
            sx={{
              p: 1,
              bgcolor: tokens.color.primary[50],
              borderRadius: 1.5,
              color: tokens.color.primary[500],
              display: 'flex',
            }}
          >
            <Users size={20} strokeWidth={1.75} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              User Management
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Manage system users, roles, and access
            </Typography>
          </Box>
        </Stack>
        {endAdornment}
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        sx={{ mb: 3, borderBottom: `1px solid ${tokens.color.neutral[200]}` }}
      >
        <Button
          component={RouterLink}
          to="/user-management"
          variant={usersActive ? 'contained' : 'text'}
          color={usersActive ? 'primary' : 'inherit'}
          sx={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 40,
            px: 2,
            borderRadius: 1,
            ...(usersActive
              ? {}
              : { color: tokens.color.neutral[600], '&:hover': { bgcolor: tokens.color.neutral[50] } }),
          }}
          startIcon={<Users size={14} strokeWidth={1.75} />}
        >
          Users
        </Button>
        <Button
          component={RouterLink}
          to="/user-management/roles"
          variant={rolesActive ? 'contained' : 'text'}
          color={rolesActive ? 'primary' : 'inherit'}
          sx={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 40,
            px: 2,
            borderRadius: 1,
            gap: 0.5,
            ...(rolesActive
              ? {}
              : { color: tokens.color.neutral[600], '&:hover': { bgcolor: tokens.color.neutral[50] } }),
          }}
          startIcon={<ShieldCheck size={14} strokeWidth={1.75} />}
        >
          Roles & Permissions
        </Button>
      </Stack>

      {children}
    </Box>
  )
}

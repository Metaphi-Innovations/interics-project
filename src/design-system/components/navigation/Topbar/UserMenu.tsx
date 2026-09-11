import {
  Box, Menu, MenuItem, ListItemIcon, Divider, Typography, Avatar, Stack,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { User, Settings, LogOut /*, Sun, Moon */ } from 'lucide-react'
import { useState } from 'react'
import { tokens } from '../../../tokens'
// import { useFoundationTheme } from '../../../ThemeContext'
// import Toggle from '../../primitives/Toggle'

export interface UserMenuUser {
  name: string
  email: string
  avatarSrc?: string
  role?: string
}

export interface UserMenuProps {
  user: UserMenuUser
  onSignOut?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
}

export default function UserMenu({
  user,
  onSignOut,
  onProfileClick,
  onSettingsClick,
}: UserMenuProps) {
  const theme = useTheme()
  // const { isDark, setMode } = useFoundationTheme()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      {/* Trigger */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        onClick={e => setAnchor(e.currentTarget)}
        sx={{
          px: '8px',
          py: '4px',
          borderRadius: tokens.borderRadius.md,
          cursor: 'pointer',
          transition: 'background-color 150ms ease',
          '&:hover': {
            bgcolor: alpha(theme.palette.mode === 'light' ? '#000000' : '#ffffff', 0.04),
          },
        }}
      >
        <Avatar
          src={user.avatarSrc}
          sx={{
            width: 28,
            height: 28,
            fontSize: '11px',
            fontWeight: 700,
            bgcolor: theme.palette.primary.main,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }} noWrap>
            {user.name}
          </Typography>
          {user.role && (
            <Typography sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }} noWrap>
              {user.role}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Dropdown */}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              mt: '4px',
              borderRadius: tokens.borderRadius.lg,
              boxShadow: tokens.shadow.lg,
              border: `1px solid ${alpha(theme.palette.mode === 'light' ? '#000000' : '#ffffff', 0.08)}`,
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, pt: '12px', pb: '8px' }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar
              src={user.avatarSrc}
              sx={{ width: 36, height: 36, fontSize: '13px', fontWeight: 600, bgcolor: theme.palette.primary.main }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{user.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {user.email}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => { setAnchor(null); onProfileClick?.() }}
          sx={{ py: '8px', gap: 1.5 }}
        >
          <ListItemIcon sx={{ minWidth: 'unset' }}>
            <User size={16} strokeWidth={1.75} />
          </ListItemIcon>
          <Typography variant="body2">Profile</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => { setAnchor(null); onSettingsClick?.() }}
          sx={{ py: '8px', gap: 1.5 }}
        >
          <ListItemIcon sx={{ minWidth: 'unset' }}>
            <Settings size={16} strokeWidth={1.75} />
          </ListItemIcon>
          <Typography variant="body2">Settings</Typography>
        </MenuItem>

        {/* Appearance / theme toggle — hidden for now
        <Divider />
        <Box sx={{ px: '8px', py: '4px' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={1}>
              {isDark
                ? <Moon size={16} strokeWidth={1.75} color={theme.palette.text.secondary} />
                : <Sun size={16} strokeWidth={1.75} color={theme.palette.text.secondary} />
              }
              <Typography sx={{ fontSize: '14px', color: 'text.primary' }}>
                Appearance
              </Typography>
            </Stack>
            <Toggle
              checked={isDark}
              onChange={(checked) => setMode(checked ? 'dark' : 'light')}
              size="sm"
            />
          </Stack>
        </Box>
        */}

        <Divider />

        <MenuItem
          onClick={() => { setAnchor(null); onSignOut?.() }}
          sx={{ py: '8px', gap: 1.5 }}
        >
          <ListItemIcon sx={{ minWidth: 'unset', color: 'error.main' }}>
            <LogOut size={16} strokeWidth={1.75} />
          </ListItemIcon>
          <Typography variant="body2" color="error.main">Sign out</Typography>
        </MenuItem>
      </Menu>
    </>
  )
}

import { Box, Toolbar, IconButton, Badge, Divider } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { Bell } from 'lucide-react'
import UserMenu from './UserMenu'
import type { UserMenuUser } from './UserMenu'

export const TOPBAR_HEIGHT = 52

export interface TopbarProps {
  onMenuToggle: () => void
  user: UserMenuUser
  notificationCount?: number
  onNotificationClick?: () => void
  onSignOut?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
  showMenuButton?: boolean
}

export default function Topbar({
  onMenuToggle,
  user,
  notificationCount,
  onNotificationClick,
  onSignOut,
  onProfileClick,
  onSettingsClick,
  showMenuButton = false,
}: TopbarProps) {
  return (
    <Toolbar
      sx={{
        height: TOPBAR_HEIGHT,
        minHeight: `${TOPBAR_HEIGHT}px !important`,
        px: { xs: 1.5, md: 2 },
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
        width: '100%',
      }}
    >
      {/* LEFT — hamburger (shown conditionally) */}
      {showMenuButton && (
        <IconButton
          onClick={onMenuToggle}
          size="small"
          sx={{
            color: 'text.secondary',
            width: 32,
            height: 32,
            flexShrink: 0,
          }}
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {/* SPACER — pushes right section to end */}
      <Box sx={{ flex: 1 }} />

      {/* RIGHT — bell + avatar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Notification bell */}
        <IconButton
          size="small"
          onClick={onNotificationClick}
          sx={{
            color: 'text.secondary',
            width: 34,
            height: 34,
            flexShrink: 0,
          }}
        >
          <Badge
            badgeContent={notificationCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                height: 14,
                minWidth: 14,
                fontSize: '9px',
              },
            }}
          >
            <Bell size={18} strokeWidth={1.75} />
          </Badge>
        </IconButton>

        {/* Vertical divider */}
        <Divider
          orientation="vertical"
          flexItem
          sx={{ height: 18, alignSelf: 'center', mx: '4px', opacity: 0.25 }}
        />

        {/* Avatar + dropdown */}
        <UserMenu
          user={user}
          onSignOut={onSignOut}
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
        />
      </Box>
    </Toolbar>
  )
}

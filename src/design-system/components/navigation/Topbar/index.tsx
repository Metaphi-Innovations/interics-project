import { Box, Toolbar, IconButton } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import UserMenu from './UserMenu'
import type { UserMenuUser } from './UserMenu'

export const TOPBAR_HEIGHT = 52

export interface TopbarProps {
  onMenuToggle: () => void
  user: UserMenuUser
  /** @deprecated Notification bell removed from topbar; prop kept for call-site compatibility. */
  notificationCount?: number
  /** @deprecated Notification bell removed from topbar; prop kept for call-site compatibility. */
  onNotificationClick?: () => void
  onSignOut?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
  showMenuButton?: boolean
}

export default function Topbar({
  onMenuToggle,
  user,
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

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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

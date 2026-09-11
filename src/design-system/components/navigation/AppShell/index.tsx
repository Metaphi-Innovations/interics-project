import { Box, useMediaQuery, Drawer as MuiDrawer } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Topbar, { TOPBAR_HEIGHT } from '../Topbar'
import Sidebar from '../Sidebar'
import type { NavConfig, SidebarUser } from '../Sidebar'
import type { UserMenuUser } from '../Topbar/UserMenu'
import { tokens } from '../../../tokens'

const STORAGE_KEY = 'foundation:sidebar-collapsed'
const SIDEBAR_EXPANDED = 224
const SIDEBAR_COLLAPSED = 56

export interface AppShellProps {
  children: ReactNode
  navConfig: NavConfig[]
  user: UserMenuUser
  logo?: ReactNode
  logoCollapsed?: ReactNode
  appName?: string
  logoMark?: string
  logoFullSrc?: string
  logoMarkSrc?: string
  notificationCount?: number
  onNotificationClick?: () => void
  onSignOut?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
  sidebarUser?: SidebarUser | null
  onLogout?: () => void
}

export default function AppShell({
  children,
  navConfig,
  user,
  logoFullSrc = '/logo-full.png',
  logoMarkSrc = '/logo-mark.png',
  notificationCount,
  onNotificationClick,
  onSignOut,
  onProfileClick,
  onSettingsClick,
  sidebarUser,
  onLogout,
}: AppShellProps) {
  const theme = useTheme()
  const location = useLocation()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
    return false
  })
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Close drawer when resizing to desktop
  useEffect(() => {
    if (isDesktop) {
      setMobileDrawerOpen(false)
    }
  }, [isDesktop])

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  function handleDesktopCollapse(val: boolean) {
    setCollapsed(val)
    localStorage.setItem(STORAGE_KEY, String(val))
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  const sidebar = (
    <Sidebar
      navConfig={navConfig}
      collapsed={isDesktop ? collapsed : false}
      onCollapse={handleDesktopCollapse}
      currentPath={location.pathname}
      logoFullSrc={logoFullSrc}
      logoMarkSrc={logoMarkSrc}
      sidebarUser={sidebarUser}
      onLogout={onLogout}
    />
  )

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* ── DESKTOP SIDEBAR (lg+) ── */}
      {isDesktop && (
        <Box
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            height: '100vh',
            transition: `width ${theme.transitions.duration.standard}ms ${theme.transitions.easing.easeInOut}`,
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {sidebar}
        </Box>
      )}

      {/* ── MOBILE DRAWER (below lg) ── */}
      {!isDesktop && (
        <MuiDrawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_EXPANDED,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: tokens.shadow.xl,
            },
          }}
        >
          {sidebar}
        </MuiDrawer>
      )}

      {/* ── MAIN COLUMN ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            height: `${TOPBAR_HEIGHT}px`,
            zIndex: 100,
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${alpha(
              theme.palette.mode === 'light' ? '#000000' : '#ffffff',
              0.06
            )}`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Topbar
            onMenuToggle={() => setMobileDrawerOpen(true)}
            user={user}
            notificationCount={notificationCount}
            onNotificationClick={onNotificationClick}
            onSignOut={onSignOut}
            onProfileClick={onProfileClick}
            onSettingsClick={onSettingsClick}
            showMenuButton={!isDesktop}
          />
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            p: { xs: 2, md: 3, lg: 4 },
            backgroundColor: theme.palette.background.default,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}

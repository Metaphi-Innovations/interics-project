import { Box, Drawer, IconButton, Tooltip, Stack } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import NavItem from './NavItem'
import NavGroup from './NavGroup'

export interface NavConfig {
  type: 'item' | 'group' | 'divider'
  label?: string
  icon?: ReactNode
  href?: string
  badge?: number | string
  children?: NavConfig[]
  roles?: string[]
}

export interface SidebarProps {
  navConfig: NavConfig[]
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
  logo?: ReactNode
  logoCollapsed?: ReactNode
  currentPath?: string
  mobileOpen?: boolean
  onMobileClose?: () => void
  logoMark?: string
  appName?: string
  logoFullSrc?: string
  logoMarkSrc?: string
}

const TOPBAR_HEIGHT = 52

function renderNavConfig(
  items: NavConfig[],
  collapsed: boolean,
  currentPath: string,
): ReactNode {
  return items.map((item, i) => {
    if (item.type === 'divider') {
      return (
        <Box
          key={i}
          sx={{
            height: '1px',
            mx: 2,
            my: 1,
            backgroundColor: (t) =>
              alpha(t.palette.mode === 'light' ? '#000000' : '#ffffff', 0.05),
          }}
        />
      )
    }

    if (item.type === 'group') {
      if (item.icon) {
        return (
          <NavGroup
            key={i}
            label={item.label ?? ''}
            icon={item.icon}
            collapsed={collapsed}
            badge={typeof item.badge === 'number' ? item.badge : undefined}
          >
            {item.children?.map((child, j) => {
              if (child.type === 'item') {
                return (
                  <NavItem
                    key={j}
                    label={child.label ?? ''}
                    href={child.href}
                    active={!!child.href && (currentPath === child.href || currentPath.startsWith(child.href + '/'))}
                    badge={child.badge}
                    depth={collapsed ? 0 : 1}
                    collapsed={collapsed}
                  />
                )
              }
              return null
            })}
          </NavGroup>
        )
      }
      return (
        <NavGroup key={i} label={item.label ?? ''} collapsed={collapsed}>
          {item.children?.map((child) => renderNavConfig([child], collapsed, currentPath))}
        </NavGroup>
      )
    }

    if (item.type === 'item') {
      return (
        <NavItem
          key={i}
          label={item.label ?? ''}
          icon={item.icon}
          href={item.href}
          active={!!item.href && (currentPath === item.href || currentPath.startsWith(item.href + '/'))}
          badge={item.badge}
          collapsed={collapsed}
        />
      )
    }

    return null
  })
}

function SidebarContent({
  navConfig,
  collapsed,
  onCollapse,
  currentPath = '',
  logoFullSrc = '/logo-full.png',
  logoMarkSrc = '/logo-mark.png',
}: Pick<SidebarProps, 'navConfig' | 'collapsed' | 'onCollapse' | 'currentPath' | 'logoFullSrc' | 'logoMarkSrc'>) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: `1px solid ${alpha(isDark ? '#ffffff' : '#000000', 0.06)}`,
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Logo area — 52px to align with topbar */}
      {!collapsed ? (
        <Box
          sx={{
            height: TOPBAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: '12px',
            flexShrink: 0,
            borderBottom: `1px solid ${alpha(isDark ? '#ffffff' : '#000000', 0.06)}`,
            overflow: 'hidden',
            gap: 1.5,
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
            <Box
              component="img"
              src={logoFullSrc}
              alt="Logo"
              sx={{
                height: 28,
                width: 'auto',
                maxWidth: 160,
                objectFit: 'contain',
                objectPosition: 'left center',
                filter: isDark ? 'brightness(0) invert(1)' : 'none',
                flexShrink: 0,
              }}
            />
          </Stack>

          {/* Collapse button */}
          <IconButton
            onClick={() => onCollapse(true)}
            size="small"
            sx={{
              width: 28,
              height: 28,
              color: theme.palette.text.disabled,
              flexShrink: 0,
              '&:hover': {
                color: theme.palette.text.secondary,
                background: alpha(isDark ? '#ffffff' : '#000000', 0.04),
              },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      ) : (
        <Tooltip title="Expand sidebar" placement="right">
          <Box
            onClick={() => onCollapse(false)}
            sx={{
              height: TOPBAR_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderBottom: `1px solid ${alpha(isDark ? '#ffffff' : '#000000', 0.06)}`,
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
              '&:hover': {
                background: alpha(isDark ? '#ffffff' : '#000000', 0.04),
              },
            }}
          >
            <Box
              component="img"
              src={logoMarkSrc}
              alt="Logo"
              sx={{
                width: 32,
                height: 32,
                objectFit: 'contain',
                filter: isDark ? 'brightness(0) invert(1)' : 'none',
              }}
            />
          </Box>
        </Tooltip>
      )}

      {/* Nav scroll area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: '8px',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'transparent',
            borderRadius: '2px',
            transition: 'background-color 200ms',
          },
          '&:hover::-webkit-scrollbar-thumb': {
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(0,0,0,0.15)',
          },
        }}
      >
        {renderNavConfig(navConfig, collapsed, currentPath)}
      </Box>

      {/* Bottom — Help & Docs */}
      <Box
        sx={{
          flexShrink: 0,
          borderTop: `1px solid ${alpha(theme.palette.mode === 'light' ? '#000000' : '#ffffff', 0.06)}`,
          p: '8px',
        }}
      >
        <NavItem
          label="Help & Docs"
          icon={<HelpCircle size={16} strokeWidth={1.75} />}
          href="/docs"
          collapsed={collapsed}
        />
      </Box>
    </Box>
  )
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  navConfig,
  onCollapse,
  currentPath,
  logoFullSrc = '/logo-full.png',
  logoMarkSrc = '/logo-mark.png',
}: SidebarProps) {
  return (
    <>
      {/* Desktop permanent sidebar — managed by AppShell layout */}
      <SidebarContent
        navConfig={navConfig}
        collapsed={collapsed}
        onCollapse={onCollapse}
        currentPath={currentPath}
        logoFullSrc={logoFullSrc}
        logoMarkSrc={logoMarkSrc}
      />

      {/* Mobile temporary drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 220,
            top: 0,
            height: '100%',
            border: 'none',
            boxSizing: 'border-box',
          },
        }}
      >
        <SidebarContent
          navConfig={navConfig}
          collapsed={false}
          onCollapse={onCollapse}
          currentPath={currentPath}
          logoFullSrc={logoFullSrc}
          logoMarkSrc={logoMarkSrc}
        />
      </Drawer>
    </>
  )
}

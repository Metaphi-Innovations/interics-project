import { Box, Typography, Collapse, Popper, Paper } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { tokens } from '../../../tokens'

export interface NavGroupProps {
  label: string
  icon?: ReactNode
  children: ReactNode
  defaultExpanded?: boolean
  /** Highlight group header when current route belongs to this section */
  headerActive?: boolean
  collapsed?: boolean
  badge?: number
}

export default function NavGroup({
  label,
  icon,
  children,
  defaultExpanded = true,
  headerActive = false,
  collapsed = false,
  badge,
}: NavGroupProps) {
  const theme = useTheme()
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    if (defaultExpanded) setExpanded(true)
  }, [defaultExpanded])
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  // Section label group (no icon) — just a label + children
  if (!icon) {
    return (
      <Box>
        {!collapsed && (
          <Typography
            sx={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: tokens.color.neutral[400],
              px: '12px',
              mt: '16px',
              mb: '4px',
            }}
          >
            {label}
          </Typography>
        )}
        {collapsed && <Box sx={{ pt: 1 }} />}
        {children}
      </Box>
    )
  }

  // Collapsible group with icon — collapsed mode: flyout
  if (collapsed) {
    return (
      <Box>
        <Box
          ref={anchorRef}
          onMouseEnter={() => setFlyoutOpen(true)}
          onMouseLeave={() => setFlyoutOpen(false)}
          sx={{ display: 'flex', justifyContent: 'center', py: '1px' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '6px',
              cursor: 'pointer',
              color: headerActive ? 'primary.main' : 'text.secondary',
              mx: '8px',
              transition: 'background-color 150ms ease',
              bgcolor: headerActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              '&:hover': {
                bgcolor: alpha(theme.palette.mode === 'light' ? '#000000' : '#ffffff', 0.04),
                color: 'text.primary',
              },
            }}
          >
            <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </Box>
          </Box>
        </Box>
        <Popper
          open={flyoutOpen}
          anchorEl={anchorRef.current}
          placement="right-start"
          sx={{ zIndex: 1200 }}
          onMouseEnter={() => setFlyoutOpen(true)}
          onMouseLeave={() => setFlyoutOpen(false)}
        >
          <Paper
            elevation={4}
            sx={{
              ml: 1,
              py: 0.5,
              minWidth: 180,
              borderRadius: '6px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              sx={{
                display: 'block',
                px: 2,
                pt: 0.5,
                pb: 0.25,
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: tokens.color.neutral[400],
              }}
            >
              {label}
            </Typography>
            {children}
          </Paper>
        </Popper>
      </Box>
    )
  }

  // Expanded mode: collapsible with header
  return (
    <Box>
      <Box
        onClick={() => setExpanded((e) => !e)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          px: '10px',
          mx: '8px',
          height: '34px',
          borderRadius: '6px',
          cursor: 'pointer',
          color: headerActive ? 'primary.main' : tokens.color.neutral[600],
          my: '1px',
          transition: 'background-color 150ms ease',
          bgcolor: headerActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
          '&:hover': {
            bgcolor: alpha(theme.palette.mode === 'light' ? '#000000' : '#ffffff', 0.04),
            color: 'text.primary',
          },
          userSelect: 'none',
        }}
      >
        <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'inherit' }}>
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 400,
            lineHeight: 1,
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'inherit',
          }}
        >
          {label}
        </Typography>
        {badge !== undefined && (
          <Box
            sx={{
              minWidth: 16,
              height: 16,
              fontSize: '10px',
              fontWeight: 600,
              borderRadius: '8px',
              px: '4px',
              lineHeight: '16px',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {badge}
          </Box>
        )}
        <ExpandMoreIcon
          sx={{
            fontSize: 14,
            flexShrink: 0,
            color: 'inherit',
            transition: `transform ${tokens.transition.normal}`,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Box>
      <Collapse in={expanded} timeout={200}>
        {children}
      </Collapse>
    </Box>
  )
}

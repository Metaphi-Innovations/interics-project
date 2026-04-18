import { useState } from 'react'
import {
  Box,
  Card,
  Typography,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material'
import { ChevronRight, MoreVert } from '@mui/icons-material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { tokens } from '@/design-system/tokens'
import { Button } from '@/design-system/components'

interface MetricItem {
  label: string
  value: string | number
  prefix?: string
  suffix?: string
  highlight?: boolean
}

interface TabItem {
  label: string
  value: string
  icon?: ReactNode
}

interface WorkspaceDetailProps {
  moduleName: string
  moduleHref: string
  recordName: string

  avatarText: string
  avatarColor?: string
  title: string
  titleMeta?: ReactNode
  metaItems?: {
    icon?: ReactNode
    label: string
  }[]

  /** Extra content rendered between metaItems and action buttons in the hero strip */
  heroExtra?: ReactNode

  primaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryActions?: {
    label: string
    onClick: () => void
    icon?: ReactNode
    destructive?: boolean
  }[]

  metrics?: MetricItem[]

  tabs: TabItem[]
  activeTab: string
  onTabChange: (value: string) => void

  children: ReactNode
}

export function WorkspaceDetail({
  moduleName,
  moduleHref,
  recordName,
  avatarText,
  avatarColor,
  title,
  titleMeta,
  metaItems,
  heroExtra,
  primaryAction,
  secondaryActions,
  metrics,
  tabs,
  activeTab,
  onTabChange,
  children,
}: WorkspaceDetailProps) {
  const navigate = useNavigate()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  return (
    <Box>
      {/* Breadcrumb */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          mb: '12px',
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate(-1)}
          sx={{ color: tokens.color.neutral[500], p: 0.25 }}
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Typography
          variant="body2"
          sx={{
            color: 'primary.main',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 12,
          }}
          onClick={() => navigate(moduleHref)}
        >
          {moduleName}
        </Typography>
        <ChevronRight sx={{ fontSize: 14, color: tokens.color.neutral[400] }} />
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: 12,
            maxWidth: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {recordName}
        </Typography>
      </Box>

      {/* Hero strip */}
      <Card
        sx={{
          p: '14px 20px',
          mb: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          borderRadius: '10px',
        }}
      >
        {/* Avatar */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '8px',
            backgroundColor: avatarColor ?? tokens.color.primary[100],
            color: tokens.color.primary[700],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {avatarText}
        </Box>

        {/* Center */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}
            >
              {title}
            </Typography>
            {titleMeta && (
              <Box sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>
                {titleMeta}
              </Box>
            )}
          </Box>
          {metaItems && metaItems.length > 0 && (
            <Box sx={{ display: 'flex', gap: '12px', mt: '3px', flexWrap: 'wrap' }}>
              {metaItems.map((item, i) => (
                <Box
                  key={i}
                  sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  {item.icon && (
                    <Box sx={{ color: tokens.color.neutral[400], display: 'flex', fontSize: 12 }}>
                      {item.icon}
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Hero extra (e.g. inline metric chips) */}
        {heroExtra && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', mr: 1, flexShrink: 0 }}>
            {heroExtra}
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {primaryAction && (
            <Button
              variant="outlined"
              color="secondary"
              size="sm"
              onClick={primaryAction.onClick}
            >
              {primaryAction.icon && (
                <Box sx={{ display: 'flex', mr: 0.5, fontSize: 14 }}>
                  {primaryAction.icon}
                </Box>
              )}
              {primaryAction.label}
            </Button>
          )}
          {secondaryActions && secondaryActions.length > 0 && (
            <>
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
              >
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
              >
                {secondaryActions.map((action, i) => (
                  <MenuItem
                    key={i}
                    onClick={() => {
                      action.onClick()
                      setMenuAnchor(null)
                    }}
                    sx={action.destructive ? { color: 'error.main' } : {}}
                  >
                    {action.label}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      </Card>

      {/* Metrics strip */}
      {metrics && metrics.length > 0 && (
        <Card
          sx={{
            mb: '12px',
            p: '10px 0',
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              lg: `repeat(${metrics.length}, 1fr)`,
            },
          }}
        >
          {metrics.map((metric, i) => (
            <Box
              key={i}
              sx={(theme) => ({
                px: '20px',
                py: '4px',
                borderRight: `1px solid`,
                borderRightColor: 'divider',
                '&:nth-of-type(2n)': { borderRight: 'none' },
                '&:nth-of-type(-n+2)': { borderBottom: `1px solid`, borderBottomColor: 'divider' },
                [theme.breakpoints.up('lg')]: {
                  '&:nth-of-type(2n)': { borderRight: `1px solid`, borderRightColor: 'divider' },
                  '&:last-of-type': { borderRight: 'none' },
                  '&:nth-of-type(-n+2)': { borderBottom: 'none' },
                },
              })}
            >
              <Typography
                variant="overline"
                sx={{
                  fontSize: 10,
                  color: 'text.secondary',
                  letterSpacing: 0.6,
                  display: 'block',
                }}
              >
                {metric.label}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: 15,
                  mt: '1px',
                  color: metric.highlight ? 'primary.main' : 'text.primary',
                }}
              >
                {metric.prefix && (
                  <Box
                    component="span"
                    sx={{ fontSize: 12, fontWeight: 400, color: 'text.secondary' }}
                  >
                    {metric.prefix}
                  </Box>
                )}
                {metric.value}
                {metric.suffix && (
                  <Box
                    component="span"
                    sx={{ fontSize: 12, fontWeight: 400, color: 'text.secondary' }}
                  >
                    {metric.suffix}
                  </Box>
                )}
              </Typography>
            </Box>
          ))}
        </Card>
      )}

      {/* Tabs + Content card */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          mt: 2,
        }}
      >
        {/* Tab bar */}
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 2,
            pt: 0.5,
            bgcolor: 'background.paper',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, val) => onTabChange(val as string)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'none',
                minHeight: 44,
                padding: '8px 14px',
                color: 'text.secondary',
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'primary.main',
                fontWeight: 600,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
                height: '2px',
                borderRadius: '2px',
              },
              '& .MuiTab-root.Mui-disabled': {
                color: 'text.disabled',
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon as React.ReactElement | undefined}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab content */}
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}

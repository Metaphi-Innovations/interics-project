import { Fragment, useState } from 'react'
import { Box, Divider, IconButton as MuiIconButton, Menu, MenuItem } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'

export type ProjectLiveRowActionItem = {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
  dividerBefore?: boolean
}

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

export function ProjectLiveRowActionMenu({
  items,
  alwaysShowTrigger = false,
}: {
  items: ProjectLiveRowActionItem[]
  /** Render ⋮ even when every menu item is hidden (Payable milestone rows). */
  alwaysShowTrigger?: boolean
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const visible = items.filter((i) => !i.hidden)

  if (!alwaysShowTrigger && visible.length === 0) {
    return null
  }

  const close = () => setAnchor(null)
  const triggerDisabled = !alwaysShowTrigger && visible.length === 0

  return (
    <Box sx={CENTER_CELL_CONTENT_SX} onClick={(e) => e.stopPropagation()}>
      <MuiIconButton
        size="small"
        disabled={triggerDisabled}
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
        aria-label="Actions"
        sx={{ p: 0.25 }}
      >
        <MoreVertIcon sx={{ fontSize: 14 }} />
      </MuiIconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { elevation: 2 } }}
      >
        {visible.map((item) => (
          <Fragment key={item.label}>
            {item.dividerBefore ? <Divider /> : null}
            <MenuItem
              sx={item.destructive ? { ...menuItemSx, color: 'error.main' } : menuItemSx}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return
                item.onClick()
                close()
              }}
            >
              {item.label}
            </MenuItem>
          </Fragment>
        ))}
      </Menu>
    </Box>
  )
}

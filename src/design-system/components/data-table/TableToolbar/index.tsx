import { useRef, useState } from 'react'
import {
  Box, Typography, InputBase, IconButton, Badge,
  Tooltip, Fade, Button, useTheme, useMediaQuery,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import ClearIcon from '@mui/icons-material/Clear'
import CloseIcon from '@mui/icons-material/Close'
import type { Column, FilterRule, BulkAction } from '../types'
import FilterPanel from '../FilterPanel'
import FilterChip from '../FilterChip'
import BulkActions from '../BulkActions'

export interface TableToolbarProps {
  title?: string
  searchValue: string
  onSearch: (value: string) => void
  filters: FilterRule[]
  onFiltersChange: (filters: FilterRule[]) => void
  columns: Column[]
  selectedCount: number
  selectedRows?: any[]
  bulkActions?: BulkAction[]
  onBulkAction?: (action: BulkAction, rows: any[]) => void
  onDeselectAll?: () => void
  actions?: React.ReactNode
}

export default function TableToolbar({
  title,
  searchValue,
  onSearch,
  filters,
  onFiltersChange,
  columns,
  selectedCount,
  selectedRows = [],
  bulkActions,
  onBulkAction,
  onDeselectAll,
  actions,
}: TableToolbarProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [filterOpen, setFilterOpen] = useState(false)
  const filterBtnRef = useRef<HTMLButtonElement>(null)

  const activeFilters = filters.length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Main toolbar row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 48 }}>
        {/* Bulk mode */}
        <Fade in={selectedCount > 0} unmountOnExit>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {bulkActions && onBulkAction && onDeselectAll && (
              <BulkActions
                selectedRows={selectedRows}
                actions={bulkActions}
                onAction={onBulkAction}
                onDeselectAll={onDeselectAll}
              />
            )}
          </Box>
        </Fade>

        {/* Normal mode */}
        <Fade in={selectedCount === 0} unmountOnExit>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {title && !isMobile && (
              <Typography variant="subtitle1" fontWeight={600} sx={{ mr: 1, whiteSpace: 'nowrap' }}>
                {title}
              </Typography>
            )}

            {/* Search */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                maxWidth: { xs: '100%', md: 360 },
                height: 32,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.25,
                bgcolor: 'background.paper',
                '&:focus-within': { borderColor: 'primary.main' },
              }}
            >
              <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.75 }} />
              <InputBase
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search..."
                sx={{ flex: 1, fontSize: 12, '& input': { p: 0 } }}
              />
              {searchValue && (
                <IconButton size="small" sx={{ p: 0.25 }} onClick={() => onSearch('')}>
                  <ClearIcon sx={{ fontSize: 15 }} />
                </IconButton>
              )}
            </Box>

            {/* Filter button */}
            <Tooltip title="Filters">
              <IconButton
                ref={filterBtnRef}
                size="small"
                onClick={() => setFilterOpen(true)}
                sx={{ color: activeFilters > 0 ? 'primary.main' : 'text.secondary' }}
              >
                <Badge badgeContent={activeFilters || undefined} color="primary">
                  <FilterListIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Custom actions */}
            {actions}
          </Box>
        </Fade>
      </Box>

      {/* Active filter chips */}
      {filters.length > 0 && selectedCount === 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          {filters.map((f) => (
            <FilterChip
              key={f.id}
              filter={f}
              columns={columns}
              onRemove={(id) => onFiltersChange(filters.filter(x => x.id !== id))}
              onEdit={() => setFilterOpen(true)}
            />
          ))}
          <Button
            size="small"
            startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
            onClick={() => onFiltersChange([])}
            sx={{ fontSize: 12, py: 0.25 }}
          >
            Clear
          </Button>
        </Box>
      )}

      {/* Filter panel */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        anchorEl={filterBtnRef.current}
        columns={columns}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    </Box>
  )
}

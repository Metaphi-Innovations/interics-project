import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  Grid,
  Stack,
  Typography,
  Tab,
  Tabs,
  InputBase,
  Button,
  Badge,
  IconButton,
  Divider,
  useMediaQuery,
  Popover,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  TextField,
} from '@mui/material'
import type { ReactNode } from 'react'
import FilterListIcon from '@mui/icons-material/FilterList'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useTheme, alpha } from '@mui/material/styles'
import { tokens } from '@/design-system/tokens'
import { DatePicker, dateFromIso, isoFromDate } from '@/design-system/components'
import { isInvalidDateRange, formatListingShowingLabel } from '@/components/listing/listingStandards'
import { KpiStatCard, type StatCardVariant } from '../KpiStatCard'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { StatCardVariant }

export interface StatCardItem {
  label: string
  value: string | number
  variant?: StatCardVariant
  /** @deprecated Prefer `variant` */
  color?: 'default' | 'success' | 'warning' | 'error' | 'info'
  icon?: ReactNode
}

const LEGACY_STAT_VARIANT: Record<
  NonNullable<StatCardItem['color']>,
  StatCardVariant
> = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
}

function statCardVariant(item: StatCardItem): StatCardVariant {
  if (item.variant != null) return item.variant
  if (item.color != null) return LEGACY_STAT_VARIANT[item.color]
  return 'default'
}

export interface TabItem {
  label: string
  value: string
  count?: number
}

export interface PrimaryAction {
  label: string
  onClick: () => void
  startIcon?: ReactNode
}

export interface SecondaryAction {
  label: string
  onClick: () => void
  startIcon?: ReactNode
}

export interface ColumnItem {
  field: string
  label: string
  visible: boolean
}

export interface FilterField {
  field: string
  label: string
  type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange'
  options?: { label: string; value: string }[]
  icon?: ReactNode
}

export interface ListingTemplateProps {
  // Header
  icon?: ReactNode
  title: string
  subtitle?: string
  primaryAction?: PrimaryAction
  secondaryActions?: SecondaryAction[]

  // Stat cards
  statCards?: StatCardItem[]
  /** Renders below the page header in place of stat cards (e.g. custom summary strip). */
  customSummary?: ReactNode

  // Tabs
  tabs?: TabItem[]
  activeTab?: string
  onTabChange?: (value: string) => void

  // Toolbar — search
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  /** When true, omits the search field (use with `toolbarAfterSearch` for inline selects only). */
  hideSearch?: boolean
  /** Rendered after the search box in the toolbar row (e.g. Project / Status MUI Selects). */
  toolbarAfterSearch?: ReactNode
  /** Clears search, toolbar filters, column filters, and sort. */
  onResetAll?: () => void

  // Toolbar — filters
  filterConfig?: FilterField[]
  activeFilters?: Record<string, unknown>
  onFilterChange?: (filters: Record<string, unknown>) => void
  onFilterReset?: () => void
  /** Legacy: called when no filterConfig is provided */
  onFilterClick?: () => void
  filterCount?: number

  // Toolbar — sort (state owned by parent, passed through)
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void

  // Toolbar — column visibility
  columns?: ColumnItem[]
  onColumnVisibilityChange?: (field: string, visible: boolean) => void

  // Toolbar — view toggle
  showViewToggle?: boolean
  onViewModeChange?: (mode: 'grid' | 'list') => void

  // Toolbar — export
  showExport?: boolean
  onExport?: () => void

  // Pagination
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  page?: number
  totalCount?: number
  onPageChange?: (page: number) => void

  // Content
  children: ReactNode

  /** Hide search/filters toolbar inside the content card */
  hideToolbar?: boolean
  /** Extra node in page header row (e.g. period selector), right side */
  headerRight?: ReactNode
  /** When false, listing card does not clip table overflow (e.g. fixed Action column). Default true. */
  clipCardContent?: boolean
}

// ─── Filters Popover ──────────────────────────────────────────────────────────

export interface FiltersPopoverProps {
  anchor: HTMLElement | null
  onClose: () => void
  filterConfig: FilterField[]
  activeFilters: Record<string, unknown>
  onFilterChange: (filters: Record<string, unknown>) => void
  onFilterReset: () => void
}

export function FiltersPopover({
  anchor,
  onClose,
  filterConfig,
  activeFilters,
  onFilterChange,
  onFilterReset,
}: FiltersPopoverProps) {
  const [local, setLocal] = useState<Record<string, unknown>>(activeFilters)
  const [rangeError, setRangeError] = useState('')

  useEffect(() => {
    setLocal(activeFilters)
    setRangeError('')
  }, [activeFilters])

  function handleApply() {
    const from = String(local.dateFrom ?? '')
    const to = String(local.dateTo ?? '')
    if (isInvalidDateRange(from, to)) {
      setRangeError('Date from must be on or before date to')
      return
    }
    setRangeError('')
    onFilterChange(local)
    onClose()
  }

  function handleReset() {
    setRangeError('')
    onFilterReset()
    onClose()
  }

  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ sx: { width: 300, p: '12px', mt: '4px' } }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '12px' }}>
        <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>Filters</Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close filters">
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>

      {/* Fields */}
      <Stack gap="10px">
        {filterConfig.map((f) => (
          <Box key={f.field}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 500, display: 'block', mb: '4px', color: 'text.secondary' }}
            >
              {f.label}
            </Typography>
            {(f.type === 'select' || f.type === 'multiselect') && f.options ? (
              <FormControl fullWidth size="small">
                <Select
                  value={(local[f.field] as string) ?? ''}
                  onChange={(e) => setLocal((prev) => ({ ...prev, [f.field]: e.target.value }))}
                  displayEmpty
                  sx={{ fontSize: '12px' }}
                >
                  {f.options.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '12px' }}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : f.type === 'date' || f.type === 'daterange' ? (
              <DatePicker
                label={f.label}
                size="sm"
                fullWidth
                value={dateFromIso(String(local[f.field] ?? ''))}
                onChange={(d) => {
                  setRangeError('')
                  setLocal((prev) => ({ ...prev, [f.field]: isoFromDate(d) }))
                }}
                error={
                  (f.field === 'dateFrom' || f.field === 'dateTo') && Boolean(rangeError)
                }
                helperText={
                  f.field === 'dateTo' && rangeError ? rangeError : undefined
                }
              />
            ) : (
              <TextField
                fullWidth
                size="small"
                value={(local[f.field] as string) ?? ''}
                onChange={(e) => setLocal((prev) => ({ ...prev, [f.field]: e.target.value }))}
                sx={{ '& input': { fontSize: '12px' } }}
              />
            )}
          </Box>
        ))}
      </Stack>

      {/* Footer */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: '12px' }}>
        <Button
          variant="text"
          size="small"
          onClick={handleReset}
          sx={{ fontSize: '12px', color: 'error.main' }}
        >
          Reset
        </Button>
        <Button variant="contained" size="small" onClick={handleApply} sx={{ fontSize: '12px' }}>
          Apply
        </Button>
      </Stack>
    </Popover>
  )
}

// ─── Columns Popover ──────────────────────────────────────────────────────────

interface ColumnsPopoverProps {
  anchor: HTMLElement | null
  onClose: () => void
  columns: ColumnItem[]
  onColumnVisibilityChange: (field: string, visible: boolean) => void
}

function ColumnsPopover({ anchor, onClose, columns, onColumnVisibilityChange }: ColumnsPopoverProps) {
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ sx: { width: 200, py: '8px', mt: '4px' } }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', px: '12px', pt: '4px', pb: '4px' }}
      >
        Toggle Columns
      </Typography>
      <Divider />
      {columns.map((col) => (
        <MenuItem
          key={col.field}
          onClick={() => onColumnVisibilityChange(col.field, !col.visible)}
          sx={{ height: '36px', gap: '6px', px: '12px' }}
        >
          <Checkbox
            size="small"
            checked={col.visible}
            disableRipple
            sx={{ p: 0 }}
          />
          <Typography variant="body2" sx={{ fontSize: '12px' }}>{col.label}</Typography>
        </MenuItem>
      ))}
      <Divider />
      <Box sx={{ px: '12px', pt: '6px' }}>
        <Button
          variant="text"
          size="small"
          sx={{ fontSize: '11px' }}
          onClick={() => {
            columns.forEach((col) => {
              if (!col.visible) onColumnVisibilityChange(col.field, true)
            })
          }}
        >
          Reset
        </Button>
      </Box>
    </Popover>
  )
}

// ─── ListingTemplate ──────────────────────────────────────────────────────────

export function ListingTemplate({
  icon,
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  statCards,
  customSummary,
  tabs,
  activeTab,
  onTabChange,
  searchPlaceholder = 'Search...',
  searchValue: searchValueProp,
  onSearchChange,
  hideSearch = false,
  toolbarAfterSearch,
  onResetAll,
  filterConfig,
  activeFilters = {},
  onFilterChange,
  onFilterReset,
  onFilterClick,
  filterCount = 0,
  columns,
  onColumnVisibilityChange,
  showViewToggle = false,
  showExport = false,
  onExport,
  pageSize = 10,
  onPageSizeChange,
  page = 0,
  totalCount,
  onPageChange,
  children,
  onViewModeChange,
  hideToolbar = false,
  headerRight,
  clipCardContent = true,
}: ListingTemplateProps) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [internalSearch, setInternalSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null)

  const searchValue = searchValueProp !== undefined ? searchValueProp : internalSearch

  function handleViewModeChange(mode: 'grid' | 'list') {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (searchValueProp === undefined) setInternalSearch(e.target.value)
    onSearchChange?.(e.target.value)
  }

  function handleTabChange(_: React.SyntheticEvent, newValue: string) {
    onTabChange?.(newValue)
  }

  // Count active filters
  const activeFilterCount = filterConfig
    ? Object.values(activeFilters).filter((v) => v !== '' && v !== undefined && v !== null).length
    : filterCount

  function handleFilterButtonClick(e: React.MouseEvent<HTMLElement>) {
    if (filterConfig) {
      setFilterAnchor(e.currentTarget)
    } else {
      onFilterClick?.()
    }
  }

  return (
    <Box>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: '20px' }}
      >
        <Stack direction="row" alignItems="center">
          {icon && (
            <Box sx={{ color: 'primary.main', mr: '10px', display: 'flex', alignItems: 'center' }}>
              {icon}
            </Box>
          )}
          <Box>
            <Typography variant="h5" fontWeight={700}>{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
          {headerRight}
          {secondaryActions?.map((action, i) => (
            <Button
              key={i}
              variant="outlined"
              size="small"
              startIcon={action.startIcon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
          {primaryAction && (
            <Button
              variant="contained"
              size="small"
              startIcon={primaryAction.startIcon}
              onClick={primaryAction.onClick}
              color="primary"
            >
              {primaryAction.label}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      {customSummary != null && customSummary !== false && (
        <Box sx={{ mb: 2 }}>{customSummary}</Box>
      )}
      {!customSummary && statCards && statCards.length > 0 && (
        <Grid
          container
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              lg: `repeat(${Math.min(statCards.length, 5)}, 1fr)`,
            },
            gap: '12px',
            mb: 2,
          }}
        >
          {statCards.map((card, i) => (
            <KpiStatCard
              key={i}
              label={card.label}
              value={card.value}
              variant={statCardVariant(card)}
              icon={card.icon}
            />
          ))}
        </Grid>
      )}

      {/* ── Toolbar + Content Card (tabs inside) ────────────────────────── */}
      <Card
        elevation={0}
        sx={{ borderRadius: '12px', overflow: clipCardContent ? 'hidden' : 'visible' }}
      >
        {/* Tabs inside card top */}
        {tabs && tabs.length > 0 && (
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, pt: 0.5 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons={false}
              sx={{
                minHeight: '44px',
                '& .MuiTab-root': {
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: '44px',
                  padding: '8px 14px',
                  color: 'text.secondary',
                },
                '& .MuiTab-root.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 600,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.primary.main,
                  height: '2px',
                  borderRadius: '2px',
                },
              }}
            >
              {tabs.map((tab) => (
                <Tab
                  key={tab.value}
                  value={tab.value}
                  label={
                    tab.count !== undefined ? (
                      <Box display="flex" alignItems="center" gap={0.75}>
                        {tab.label}
                        <Box
                          sx={{
                            bgcolor: activeTab === tab.value ? alpha(theme.palette.primary.main, 0.12) : 'action.hover',
                            color: activeTab === tab.value ? 'primary.main' : 'text.secondary',
                            borderRadius: '999px',
                            fontSize: 10,
                            fontWeight: 600,
                            px: '6px',
                            py: '1px',
                            lineHeight: 1.6,
                            minWidth: 20,
                            textAlign: 'center',
                          }}
                        >
                          {tab.count}
                        </Box>
                      </Box>
                    ) : (
                      tab.label
                    )
                  }
                />
              ))}
            </Tabs>
          </Box>
        )}

        {/* Toolbar */}
        {!hideToolbar && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            flexWrap="wrap"
            sx={{ p: '10px 14px', borderBottom: `1px solid ${tokens.color.neutral[100]}` }}
          >
            {/* Search + optional inline toolbar (e.g. Project / Status selects) */}
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              flexWrap="wrap"
              sx={{ flex: { xs: 1, md: 1 }, minWidth: 0 }}
            >
              {!hideSearch && (
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{
                    width: { xs: undefined, lg: '260px' },
                    flex: { xs: 1, lg: 'none' },
                    minWidth: { lg: '200px' },
                    height: '32px',
                    bgcolor: searchFocused ? 'action.selected' : 'action.hover',
                    border: `1px solid ${searchFocused ? theme.palette.primary.main : 'transparent'}`,
                    borderRadius: '6px',
                    px: '10px',
                    transition: 'background-color 0.15s, border-color 0.15s',
                  }}
                >
                  <SearchIcon sx={{ fontSize: '14px', color: tokens.color.neutral[400] }} />
                  <InputBase
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    sx={{ fontSize: '12px', flex: 1, '& input': { p: 0 } }}
                  />
                </Stack>
              )}
              {onResetAll && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onResetAll}
                  sx={{ height: '32px', fontSize: '12px', flexShrink: 0 }}
                >
                  Reset
                </Button>
              )}
              {toolbarAfterSearch}
            </Stack>

            {/* Right actions */}
            <Stack direction="row" alignItems="center" gap="6px">
              {/* Filters button */}
              {(filterConfig || onFilterClick) && (
                <Badge
                  badgeContent={activeFilterCount > 0 ? activeFilterCount : undefined}
                  color="primary"
                >
                  {isDesktop ? (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FilterListIcon fontSize="small" />}
                      onClick={handleFilterButtonClick}
                      sx={{ height: '32px', fontSize: '12px' }}
                    >
                      Filters
                    </Button>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={handleFilterButtonClick}
                      sx={{
                        height: '32px',
                        width: '32px',
                        border: `1px solid ${tokens.color.neutral[200]}`,
                        borderRadius: '6px',
                      }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  )}
                </Badge>
              )}

              {/* Columns button */}
              {columns && onColumnVisibilityChange && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewColumnIcon fontSize="small" />}
                  onClick={(e) => setColumnsAnchor(e.currentTarget)}
                  sx={{ height: '32px', fontSize: '12px' }}
                >
                  Columns
                </Button>
              )}

              {/* Export button */}
              {showExport && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                  onClick={onExport}
                  sx={{ height: '32px', fontSize: '12px' }}
                >
                  Export
                </Button>
              )}

              {/* View toggle */}
              {showViewToggle && (
                <>
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ height: '20px', mx: '4px', alignSelf: 'center' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleViewModeChange('grid')}
                    sx={{
                      p: '5px',
                      borderRadius: '4px',
                      color: viewMode === 'grid' ? 'primary.main' : tokens.color.neutral[400],
                      bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    }}
                  >
                    <GridViewIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleViewModeChange('list')}
                    sx={{
                      p: '5px',
                      borderRadius: '4px',
                      color: viewMode === 'list' ? 'primary.main' : tokens.color.neutral[400],
                      bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    }}
                  >
                    <ViewListIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Stack>
          </Stack>
        )}

        {/* Content */}
        {children}

        {/* Pagination row */}
        {(totalCount !== undefined || onPageSizeChange) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: '10px 16px',
              borderTop: `1px solid ${tokens.color.neutral[100]}`,
            }}
          >
            {/* Left: showing text */}
            <Typography variant="caption" color="text.secondary">
              {totalCount !== undefined
                ? formatListingShowingLabel(page, pageSize, totalCount)
                : ''}
            </Typography>

            {/* Right: rows per page + pagination */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {onPageSizeChange && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Rows per page:
                  </Typography>
                  <Select
                    size="small"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    sx={{
                      fontSize: 12,
                      height: 28,
                      bgcolor: tokens.color.neutral[50],
                      borderRadius: '4px',
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    }}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </Box>
              )}

              {onPageChange && totalCount !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" color="text.secondary">
                    {page + 1} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={(page + 1) * pageSize >= totalCount}
                    onClick={() => onPageChange(page + 1)}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Card>

      {/* Filters Popover */}
      {filterConfig && onFilterChange && onFilterReset && (
        <FiltersPopover
          anchor={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          filterConfig={filterConfig}
          activeFilters={activeFilters}
          onFilterChange={onFilterChange}
          onFilterReset={onFilterReset}
        />
      )}

      {/* Columns Popover */}
      {columns && onColumnVisibilityChange && (
        <ColumnsPopover
          anchor={columnsAnchor}
          onClose={() => setColumnsAnchor(null)}
          columns={columns}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      )}
    </Box>
  )
}

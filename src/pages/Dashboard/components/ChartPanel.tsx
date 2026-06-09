import { useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import FilterListIcon from '@mui/icons-material/FilterList'
import type { ReactNode } from 'react'
import { FiltersPopover } from '@/components/templates/ListingTemplate'
import { tokens } from '@/design-system/tokens'
import type { ChartScopeData } from '../chartScopeUtils'
import type { MonthBucket } from '../types'
import type { ChartFilters } from '../chartFilterTypes'
import type { DashboardFilters } from '../types'
import {
  buildChartFilterConfig,
  chartFiltersToRecord,
  countActiveChartFilters,
  recordToChartFilters,
} from '../chartFilterConfig'
import type { ChartFilterOptions } from '../chartFilterConfig'
import { ChartLoadingState } from './ChartLoadingState'
import { PANEL_SX } from './chartLayout'

interface ChartPanelProps {
  title: string
  subtitle?: string
  chartHeight: number
  loading?: boolean
  showStatus?: boolean
  globalFilters: DashboardFilters
  chartFilters: ChartFilters
  onApplyFilters: (filters: ChartFilters) => void
  onResetFilters: () => void
  filterOptions: ChartFilterOptions
  children: ReactNode
  footer?: ReactNode
}

export function ChartPanel({
  title,
  subtitle,
  chartHeight,
  loading = false,
  showStatus = true,
  globalFilters,
  chartFilters,
  onApplyFilters,
  onResetFilters,
  filterOptions,
  children,
  footer,
}: ChartPanelProps) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)

  const filterConfig = useMemo(
    () => buildChartFilterConfig(filterOptions, showStatus),
    [filterOptions, showStatus],
  )

  const activeFilterCount = countActiveChartFilters(chartFilters, globalFilters)

  function handleFilterApply(record: Record<string, unknown>) {
    onApplyFilters(recordToChartFilters(record, globalFilters))
  }

  function handleFilterReset() {
    onResetFilters()
    setFilterAnchor(null)
  }

  return (
    <Paper elevation={0} sx={PANEL_SX}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        sx={{ mb: 1, flexShrink: 0 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Badge
          badgeContent={activeFilterCount > 0 ? activeFilterCount : undefined}
          color="primary"
          sx={{ flexShrink: 0 }}
        >
          {isDesktop ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterListIcon fontSize="small" />}
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              sx={{ height: '32px', fontSize: '12px' }}
            >
              Filters
            </Button>
          ) : (
            <IconButton
              size="small"
              onClick={(e) => setFilterAnchor(e.currentTarget)}
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
      </Stack>

      <FiltersPopover
        anchor={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        filterConfig={filterConfig}
        activeFilters={chartFiltersToRecord(chartFilters)}
        onFilterChange={handleFilterApply}
        onFilterReset={handleFilterReset}
      />

      <Box
        sx={{
          flex: 1,
          minHeight: chartHeight,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? <ChartLoadingState height={chartHeight} /> : children}
      </Box>
      {footer}
    </Paper>
  )
}

export type ChartPanelRenderProps = {
  scope: ChartScopeData
  monthBuckets: MonthBucket[]
  chartHeight: number
}

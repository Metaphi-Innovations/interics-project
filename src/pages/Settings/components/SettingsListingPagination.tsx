import { Box, IconButton, MenuItem, Select, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { tokens } from '@/design-system/tokens'
import {
  formatListingShowingLabel,
  LISTING_PAGE_SIZE_OPTIONS,
} from '@/components/listing/listingStandards'

export type SettingsListingPaginationProps = {
  /** 0-based page index */
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function SettingsListingPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: SettingsListingPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: '10px 16px',
        borderTop: `1px solid ${tokens.color.neutral[100]}`,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {formatListingShowingLabel(page, pageSize, totalCount)}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            {LISTING_PAGE_SIZE_OPTIONS.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {page + 1} / {totalPages}
          </Typography>
          <IconButton
            size="small"
            disabled={(page + 1) * pageSize >= totalCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  )
}

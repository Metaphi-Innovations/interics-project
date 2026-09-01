import { Box, Typography } from '@mui/material'
import { DatePicker } from '@/design-system/components'
import type { DashboardDateRange } from './dashboardDateRange'

const DATE_FIELD_SX = {
  '& .MuiInputBase-root': {
    height: 32,
    bgcolor: 'background.paper',
  },
  '& .MuiInputLabel-root': {
    fontSize: 12,
    transform: 'translate(14px, 7px) scale(1)',
  },
  '& .MuiInputLabel-shrink': {
    transform: 'translate(14px, -8px) scale(0.75)',
  },
  '& .MuiInputBase-input': {
    fontSize: 12,
    py: 0.5,
  },
} as const

export function DashboardDateRangeFilter({
  value,
  onChange,
}: {
  value: DashboardDateRange
  onChange: (range: DashboardDateRange) => void
}) {
  const [from, to] = value

  return (
    <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        sx={{
          display: 'block',
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          mb: 0.5,
        }}
      >
        Time Period
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: { xs: '100%', sm: 'auto' },
        }}
      >
        <DatePicker
          label="From"
          value={from}
          onChange={(date) => onChange([date, to])}
          maxDate={to ?? undefined}
          size="sm"
          sx={{ ...DATE_FIELD_SX, width: { xs: '100%', sm: 210 } }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ flexShrink: 0, fontSize: 12 }}
        >
          -
        </Typography>
        <DatePicker
          label="To"
          value={to}
          onChange={(date) => onChange([from, date])}
          minDate={from ?? undefined}
          size="sm"
          sx={{ ...DATE_FIELD_SX, width: { xs: '100%', sm: 210 } }}
        />
      </Box>
    </Box>
  )
}

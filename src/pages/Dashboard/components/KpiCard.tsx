import { Box, Paper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import type { TrendVariant } from '../types'

export interface KpiCardProps {
  label: string
  value: string
  subtext: string
  trendVariant: TrendVariant
  trendText: string
  trendArrow?: 'up' | 'down'
  valueColor?: string
  onClick: () => void
  theme: Theme
}

export function KpiCard({
  label,
  value,
  subtext,
  trendVariant,
  trendText,
  trendArrow,
  valueColor,
  onClick,
  theme,
}: KpiCardProps) {
  const trendBg =
    trendVariant === 'positive'
      ? alpha(theme.palette.success.main, 0.12)
      : trendVariant === 'negative'
        ? alpha(theme.palette.error.main, 0.12)
        : theme.palette.action.hover
  const trendFg =
    trendVariant === 'positive'
      ? theme.palette.success.main
      : trendVariant === 'negative'
        ? theme.palette.error.main
        : theme.palette.text.secondary

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: theme.shadows[2],
          borderColor: 'primary.main',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={500}
          sx={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
            bgcolor: trendBg,
            color: trendFg,
          }}
        >
          <Typography sx={{ fontSize: 10, fontWeight: 700 }}>
            {trendVariant === 'neutral'
              ? trendText
              : trendVariant === 'positive'
                ? `↑ ${trendText}`
                : trendArrow === 'up'
                  ? `↑ ${trendText}`
                  : `↓ ${trendText}`}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ lineHeight: 1.1, mb: 0.5, color: valueColor ?? 'text.primary' }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
        {subtext}
      </Typography>
    </Paper>
  )
}

import { Box, Typography, Skeleton } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import RemoveIcon from '@mui/icons-material/Remove'
import type { SxProps } from '@mui/material'
import type { ReactNode } from 'react'
import BaseCard from '../BaseCard'
import SparkLine from '../../charts/SparkLine'

export interface StatCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  icon?: ReactNode
  iconColor?: string
  headerColor?: string
  sparklineData?: number[]
  loading?: boolean
  hoverable?: boolean
  onClick?: () => void
  sx?: SxProps
}

function DeltaBadge({ delta, deltaLabel }: { delta: number; deltaLabel?: string }) {
  const isPositive = delta > 0
  const isNegative = delta < 0
  const color = isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary'
  const Icon = isPositive ? TrendingUpIcon : isNegative ? TrendingDownIcon : RemoveIcon
  const formatted = isPositive ? `+${delta.toFixed(1)}%` : isNegative ? `${delta.toFixed(1)}%` : '0%'

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color }}>
        <Icon sx={{ fontSize: 16 }} />
        <Typography variant="caption" fontWeight={600} color={color}>
          {formatted}
        </Typography>
      </Box>
      {deltaLabel && (
        <Typography variant="caption" color="text.secondary">
          {deltaLabel}
        </Typography>
      )}
    </Box>
  )
}

export default function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  iconColor,
  headerColor,
  sparklineData,
  loading = false,
  hoverable,
  onClick,
  sx,
}: StatCardProps) {
  const theme = useTheme()
  const iconBg = iconColor ?? alpha(theme.palette.primary.main, 0.1)
  const iconFg = iconColor ? '#fff' : theme.palette.primary.main

  if (loading) {
    return (
      <BaseCard headerColor={headerColor} sx={sx}>
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Skeleton variant="circular" width={theme.spacing(8)} height={theme.spacing(8)} />
            <Skeleton variant="text" width="50%" height={20} />
          </Box>
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="text" width="55%" height={18} />
          <Skeleton variant="rounded" width="100%" height={40} />
        </Box>
      </BaseCard>
    )
  }

  return (
    <BaseCard
      headerColor={headerColor}
      hoverable={hoverable}
      onClick={onClick}
      sx={sx}
    >
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Icon + Label row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {icon && (
            <Box
              sx={{
                width: theme.spacing(8),
                height: theme.spacing(8),
                minWidth: theme.spacing(8),
                borderRadius: '50%',
                bgcolor: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconFg,
                flexShrink: 0,
                '& svg': {
                  width: theme.spacing(5),
                  height: theme.spacing(5),
                  fontSize: theme.spacing(5),
                },
              }}
            >
              {icon}
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {label}
          </Typography>
        </Box>

        {/* Value */}
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, lineHeight: 1.2 }}
        >
          {value}
        </Typography>

        {/* Delta */}
        {delta !== undefined && (
          <DeltaBadge delta={delta} deltaLabel={deltaLabel} />
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <Box sx={{ mt: 0.5, display: { xs: 'none', sm: 'block' } }}>
            <SparkLine
              data={sparklineData}
              height={40}
              positive={delta !== undefined ? delta >= 0 : undefined}
            />
          </Box>
        )}
      </Box>
    </BaseCard>
  )
}

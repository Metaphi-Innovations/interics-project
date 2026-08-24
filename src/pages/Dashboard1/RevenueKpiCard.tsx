/**
 * Dashboard 1 — Revenue KPI card with icon, value, and subtitle.
 */
import type { ReactNode } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Banknote,
  CircleDollarSign,
  HandCoins,
  IndianRupee,
  PlayCircle,
  Timer,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import type { RevenueKpi } from './dashboard1Data'

const ICON_MAP: Record<RevenueKpi['icon'], { node: ReactNode; color: string }> = {
  po: {
    node: <IndianRupee size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  live: {
    node: <PlayCircle size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
  received: {
    node: <CircleDollarSign size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
  pending: {
    node: <Timer size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.amber,
  },
  paid: {
    node: <HandCoins size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.purple,
  },
  payable: {
    node: <Banknote size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.red,
  },
  cash: {
    node: <Wallet size={18} strokeWidth={1.75} />,
    color: tokens.color.primary[600],
  },
  profit: {
    node: <TrendingUp size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
}

interface RevenueKpiCardProps {
  kpi: RevenueKpi
  onClick?: () => void
}

export function RevenueKpiCard({ kpi, onClick }: RevenueKpiCardProps) {
  const theme = useTheme()
  const iconMeta = ICON_MAP[kpi.icon]

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        p: 2,
        borderRadius: '10px',
        border: `1px solid ${tokens.color.neutral[200]}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        bgcolor: 'background.paper',
        ...(onClick && {
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          '&:hover': {
            borderColor: tokens.color.primary[300],
            boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
          },
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{
            fontSize: 11,
            letterSpacing: 0.3,
            lineHeight: 1.35,
            pr: 0.5,
          }}
        >
          {kpi.title}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(iconMeta.color, theme.palette.mode === 'dark' ? 0.2 : 0.1),
            color: iconMeta.color,
          }}
        >
          {iconMeta.node}
        </Box>
      </Box>

      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ fontSize: { xs: 20, md: 22 }, lineHeight: 1.2, letterSpacing: -0.3 }}
      >
        ₹{formatCurrency(kpi.value)}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mt: 'auto' }}>
        {kpi.subtitle}
      </Typography>
    </Paper>
  )
}

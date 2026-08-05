/**
 * Dashboard 1 — Larger Meta Data
 * Company-wide achievement KPIs and project highlight cards
 */
import type { ReactNode } from 'react'
import { Box, Grid, Paper, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Building2,
  CircleDollarSign,
  Clock3,
  FolderCheck,
  Maximize2,
  Minimize2,
  Ruler,
  Timer,
} from 'lucide-react'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import {
  LARGER_META_KPIS,
  PROJECT_HIGHLIGHTS,
  type MetaKpi,
  type ProjectHighlight,
} from './largerMetaData'

const KPI_ICON_MAP: Record<MetaKpi['icon'], { node: ReactNode; color: string }> = {
  projects: {
    node: <FolderCheck size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  area: {
    node: <Ruler size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
  revenue: {
    node: <CircleDollarSign size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
  fee: {
    node: <Building2 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.amber,
  },
}

const HIGHLIGHT_ICON_MAP: Record<
  ProjectHighlight['icon'],
  { node: ReactNode; color: string }
> = {
  largest: {
    node: <Maximize2 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  smallest: {
    node: <Minimize2 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
  fastest: {
    node: <Timer size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
  slowest: {
    node: <Clock3 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.amber,
  },
}

function MetaKpiCard({ kpi }: { kpi: MetaKpi }) {
  const theme = useTheme()
  const iconMeta = KPI_ICON_MAP[kpi.icon]

  return (
    <Paper
      elevation={0}
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
          sx={{ fontSize: 11, letterSpacing: 0.3, lineHeight: 1.35, pr: 0.5 }}
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
        sx={{ fontSize: { xs: 18, md: 20 }, lineHeight: 1.2, letterSpacing: -0.3 }}
      >
        {kpi.value}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mt: 'auto' }}>
        {kpi.subtitle}
      </Typography>
    </Paper>
  )
}

function ProjectHighlightCard({ highlight }: { highlight: ProjectHighlight }) {
  const theme = useTheme()
  const iconMeta = HIGHLIGHT_ICON_MAP[highlight.icon]

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: 2,
        borderRadius: '10px',
        border: `1px solid ${tokens.color.neutral[200]}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        bgcolor: 'background.paper',
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
          sx={{ fontSize: 11, letterSpacing: 0.3, lineHeight: 1.35, pr: 0.5 }}
        >
          {highlight.title}
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
        variant="subtitle1"
        fontWeight={700}
        sx={{ fontSize: 15, lineHeight: 1.35, letterSpacing: -0.2 }}
      >
        {highlight.projectName}
      </Typography>

      <Box sx={{ mt: 'auto' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}
        >
          {highlight.detailLabel}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ fontSize: 13, color: 'text.primary', mt: 0.25 }}
        >
          {highlight.detailValue}
        </Typography>
      </Box>
    </Paper>
  )
}

export function LargerMetaDataSection() {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Larger Meta Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Overall company achievements and standout project records.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {LARGER_META_KPIS.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <MetaKpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1.5 }}
      >
        Project Highlights
      </Typography>

      <Grid container spacing={2}>
        {PROJECT_HIGHLIGHTS.map((highlight) => (
          <Grid key={highlight.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <ProjectHighlightCard highlight={highlight} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

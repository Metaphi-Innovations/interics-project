/**
 * Dashboard 1 — Project Analytics
 * Duration comparison, size by year, repeat clients, completions, conversion KPI
 */
import type { ReactNode } from 'react'
import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Clock3, RefreshCw } from 'lucide-react'
import {
  BarChart,
  ChartCard,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import {
  AVG_PROJECT_DURATION,
  AVG_PROJECT_SIZE_BY_YEAR,
  PITCH_TO_LIVE_CONVERSION,
  PROJECTS_COMPLETED_BY_YEAR,
  REPEAT_CLIENTS_KPI,
} from './projectAnalyticsData'

function formatDays(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${n}d`
}

function formatSqft(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${n.toLocaleString('en-IN')} sqft`
}

function MetricKpiCard({
  icon,
  iconColor,
  title,
  value,
  subtitle,
  footer,
}: {
  icon: ReactNode
  iconColor: string
  title: string
  value: string
  subtitle: string
  footer?: ReactNode
}) {
  const theme = useTheme()

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
          {title}
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
            bgcolor: alpha(iconColor, theme.palette.mode === 'dark' ? 0.2 : 0.1),
            color: iconColor,
          }}
        >
          {icon}
        </Box>
      </Box>

      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ fontSize: { xs: 22, md: 26 }, lineHeight: 1.15, letterSpacing: -0.3 }}
      >
        {value}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {subtitle}
      </Typography>

      {footer != null ? <Box sx={{ mt: 'auto', pt: 0.5 }}>{footer}</Box> : null}
    </Paper>
  )
}

export function ProjectAnalyticsSection() {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Project Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Overall project performance across duration, size, and conversion.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Average Project Duration"
            subtitle="Planned vs actual duration (days)"
          >
            <BarChart
              data={[...AVG_PROJECT_DURATION]}
              xKey="year"
              height={280}
              bars={[
                { key: 'planned', label: 'Planned Duration', color: CHART_COLORS.blue },
                { key: 'actual', label: 'Actual Duration', color: CHART_COLORS.teal },
              ]}
              formatY={formatDays}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Average Project Size"
            subtitle="Average carpet area by year"
          >
            <BarChart
              data={[...AVG_PROJECT_SIZE_BY_YEAR]}
              xKey="year"
              height={280}
              bars={[{ key: 'avgSqft', label: 'Avg Size', color: CHART_COLORS.amber }]}
              showLegend={false}
              formatY={formatSqft}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <MetricKpiCard
                icon={<RefreshCw size={18} strokeWidth={1.75} />}
                iconColor={CHART_COLORS.purple}
                title="Repeat Clients"
                value={String(REPEAT_CLIENTS_KPI.total)}
                subtitle="Clients with more than one project."
                footer={
                  <Stack direction="row" alignItems="baseline" gap={0.75}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ fontSize: 16, color: CHART_COLORS.purple }}
                    >
                      {REPEAT_CLIENTS_KPI.percentage}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      of all clients
                    </Typography>
                  </Stack>
                }
              />
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <MetricKpiCard
                icon={<Clock3 size={18} strokeWidth={1.75} />}
                iconColor={CHART_COLORS.teal}
                title="Average Pitch to Live Conversion Time"
                value={`${PITCH_TO_LIVE_CONVERSION.avgDays} days`}
                subtitle={PITCH_TO_LIVE_CONVERSION.subtitle}
              />
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard
            title="Projects Completed by Year"
            subtitle="Yearly completed project count"
          >
            <BarChart
              data={[...PROJECTS_COMPLETED_BY_YEAR]}
              xKey="year"
              height={260}
              bars={[{ key: 'completed', label: 'Completed', color: CHART_COLORS.green }]}
              showLegend={false}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

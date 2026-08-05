/**
 * Dashboard 1 — Vendors section
 * Vendor summary KPIs + billing / projects charts (client dashboard document)
 */
import type { ReactNode } from 'react'
import { Box, Grid, Paper, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { CircleDollarSign, FolderKanban } from 'lucide-react'
import {
  BarChart,
  ChartCard,
  LineChart,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import {
  PROJECTS_COMPLETED_TOGETHER,
  VENDOR_BILLING_ACROSS_YEARS,
  VENDOR_BILLING_CURRENT_YEAR,
  VENDOR_BILLING_YEAR_LINES,
  VENDOR_SUMMARY_KPIS,
  type VendorKpi,
} from './vendorsAnalyticsData'

const ICON_MAP: Record<VendorKpi['icon'], { node: ReactNode; color: string }> = {
  billing: {
    node: <CircleDollarSign size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  projects: {
    node: <FolderKanban size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
}

const YEAR_LINE_COLORS = [
  CHART_COLORS.teal,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.purple,
  CHART_COLORS.green,
]

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function VendorKpiCard({ kpi }: { kpi: VendorKpi }) {
  const theme = useTheme()
  const iconMeta = ICON_MAP[kpi.icon]

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

export function VendorsSection() {
  const yearLines = VENDOR_BILLING_YEAR_LINES.map((line, i) => ({
    key: line.key,
    label: line.label,
    color: YEAR_LINE_COLORS[i % YEAR_LINE_COLORS.length],
  }))

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Vendors
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Vendor billing and completed-project partnership overview.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {VENDOR_SUMMARY_KPIS.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6 }}>
            <VendorKpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Vendor Billing (Current Year)"
            subtitle="Compare vendor billing for the selected financial year"
          >
            <BarChart
              data={[...VENDOR_BILLING_CURRENT_YEAR]}
              xKey="vendor"
              height={300}
              orientation="horizontal"
              bars={[{ key: 'billing', label: 'Billing', color: CHART_COLORS.teal }]}
              showLegend={false}
              barSize={18}
              formatX={formatAxisAmount}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Vendor Billing Across Years"
            subtitle="How vendor billing has changed over the years"
            action={
              <ChartSeriesLegend
                items={yearLines.map((l) => ({ label: l.label, color: l.color }))}
              />
            }
          >
            <LineChart
              data={[...VENDOR_BILLING_ACROSS_YEARS]}
              xKey="year"
              height={300}
              lines={yearLines}
              showLegend={false}
              formatY={formatAxisAmount}
              formatTooltip={formatAxisAmount}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Projects Completed Together"
            subtitle="Vendors with the highest number of completed projects"
          >
            <BarChart
              data={[...PROJECTS_COMPLETED_TOGETHER]}
              xKey="vendor"
              height={300}
              orientation="horizontal"
              bars={[{ key: 'projects', label: 'Projects', color: CHART_COLORS.blue }]}
              showLegend={false}
              barSize={18}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

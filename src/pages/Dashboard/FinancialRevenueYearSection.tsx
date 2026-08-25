/**
 * Dashboard — Financial Revenue Year
 * Grouped monthly comparison of PO Value, Invoice Value, and Amount Received.
 */
import { useMemo } from 'react'
import { Grid, Paper, Typography } from '@mui/material'
import { BarChart, ChartCard } from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import {
  getFinancialRevenueYearAnalytics,
  type RevenueTimePeriod,
} from './dashboardData'

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function SummaryStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: '10px',
        border: `1px solid ${tokens.color.neutral[200]}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        sx={{ fontSize: 11, letterSpacing: 0.3, display: 'block', mb: 0.75 }}
      >
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 18, md: 20 } }}>
        ₹{formatCurrency(value)}
      </Typography>
    </Paper>
  )
}

export interface FinancialRevenueYearSectionProps {
  period?: RevenueTimePeriod
  customRange?: [Date | null, Date | null]
}

export function FinancialRevenueYearSection({
  period = 'This Financial Year',
  customRange = [null, null],
}: FinancialRevenueYearSectionProps) {
  const analytics = useMemo(
    () => getFinancialRevenueYearAnalytics(period, customRange),
    [period, customRange],
  )

  return (
    <ChartCard
      title="Financial Revenue Year"
      subtitle="Monthly comparison of PO Value, Invoice Value & Amount Received"
      action={
        <ChartSeriesLegend
          items={[
            { label: 'PO Value', color: CHART_COLORS.teal },
            { label: 'Invoice Value', color: CHART_COLORS.blue },
            { label: 'Amount Received', color: CHART_COLORS.green },
          ]}
        />
      }
    >
      <BarChart
        data={[...analytics.chartData]}
        xKey="month"
        height={280}
        showLegend={false}
        bars={[
          { key: 'poValue', label: 'PO Value', color: CHART_COLORS.teal },
          { key: 'invoiceValue', label: 'Invoice Value', color: CHART_COLORS.blue },
          { key: 'amountReceived', label: 'Amount Received', color: CHART_COLORS.green },
        ]}
        formatY={formatAxisAmount}
      />

      <Grid container spacing={2} sx={{ mt: 2.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryStat label="Total PO Value" value={analytics.totals.poValue} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryStat label="Total Invoice Value" value={analytics.totals.invoiceValue} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryStat label="Total Amount Received" value={analytics.totals.amountReceived} />
        </Grid>
      </Grid>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 11, lineHeight: 1.5, display: 'block', mt: 2 }}
      >
        {analytics.infoText}
      </Typography>
    </ChartCard>
  )
}

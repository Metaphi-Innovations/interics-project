import { Box } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { collectionsTrend, receivablesTrend } from '../dashboardMetrics'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { DashboardSection } from '../components/DashboardSection'
import { DashboardMiniCard } from '../components/DashboardMiniCard'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import { CHART_MARGIN, SECTION_CHART_ROW_SX } from '../components/chartLayout'
import { yAxisCurrencyTick } from '../components/charts/chartFormatters'

interface BillingCashflowProps {
  theme: Theme
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  amountBilled: number
  amountCollected: number
  outstandingInvoices: number
  poValue: number
  ru: (n: number) => string
}

export function BillingCashflow({
  theme,
  chartHeight,
  loading,
  globalFilters,
  chartData,
  amountBilled,
  amountCollected,
  outstandingInvoices,
  poValue,
  ru,
}: BillingCashflowProps) {
  const { ct } = useDashboardChartTheme()

  return (
    <DashboardSection title="Billing & Cashflow">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard label="Amount Billed" value={ru(amountBilled)} />
        <DashboardMiniCard label="Amount Collected" value={ru(amountCollected)} />
        <DashboardMiniCard label="Outstanding Invoices" value={ru(outstandingInvoices)} />
        <DashboardMiniCard label="PO Value" value={ru(poValue)} />
      </Box>

      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        }}
      >
        <ScopedChartPanel
          title="Receivables Trend"
          subtitle="Outstanding balance by month"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, monthBuckets }) => (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={receivablesTrend(monthBuckets, scope.scopedInvoices)} margin={CHART_MARGIN}>
                <CartesianGrid {...ct.gridProps} vertical={false} />
                <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tick={ct.axisStyle}
                  tickFormatter={yAxisCurrencyTick}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Outstanding']} />
                <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke={theme.palette.warning.main} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Collections Trend"
          subtitle="Cash collected by month"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, monthBuckets }) => (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionsTrend(monthBuckets, scope.scopedInvoices)} margin={CHART_MARGIN}>
                <CartesianGrid {...ct.gridProps} vertical={false} />
                <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tick={ct.axisStyle}
                  tickFormatter={yAxisCurrencyTick}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Collected']} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke={theme.palette.success.main} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ScopedChartPanel>
      </Box>
    </DashboardSection>
  )
}

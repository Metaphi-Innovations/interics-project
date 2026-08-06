/**
 * Dashboard 1 — new Revenue-focused dashboard (sample data UI).
 * Existing `/dashboard` page is unchanged.
 */
import { useCallback, useMemo, useState } from 'react'
import {
  Box,
  Grid,
  MenuItem,
  Paper,
  Select as MuiSelect,
  Typography,
} from '@mui/material'
import {
  BarChart,
  Button,
  ChartCard,
  DateRangePicker,
  LineChart,
  Tabs,
} from '@/design-system/components'
import { CHART_COLORS } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import {
  DASHBOARD1_FILTER_OPTIONS,
  getRevenueAnalytics,
  REVENUE_TIME_PERIOD_OPTIONS,
  type RevenueTimePeriod,
} from './dashboard1Data'
import { RevenueKpiCard } from './RevenueKpiCard'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import { ProjectsOverviewSection } from './ProjectsOverviewSection'
import { ProjectAnalyticsSection } from './ProjectAnalyticsSection'
import { SectorAnalyticsSection } from './SectorAnalyticsSection'
import { ProjectDesignAnalyticsSection } from './ProjectDesignAnalyticsSection'
import { TeamSection } from './TeamSection'
import { VendorsSection } from './VendorsSection'

type DateRangePreset = 'This Month' | 'This Quarter' | 'This Year' | 'All Time'
type StatusFilter =
  | 'All Status'
  | 'Pitch'
  | 'Live'
  | 'Completed'
  | 'On Hold'
  | 'Cancelled'
type DashboardTab = 'revenue' | 'projects' | 'team' | 'vendors'

const DASHBOARD_TABS = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Projects', value: 'projects' },
  { label: 'Team', value: 'team' },
  { label: 'Vendors', value: 'vendors' },
] as const

const DATE_RANGE_OPTIONS: DateRangePreset[] = [
  'This Month',
  'This Quarter',
  'This Year',
  'All Time',
]

const STATUS_OPTIONS: StatusFilter[] = [
  'All Status',
  'Pitch',
  'Live',
  'Completed',
  'On Hold',
  'Cancelled',
]

const SELECT_SX = { minWidth: 130, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const
const REVENUE_PERIOD_SELECT_SX = { minWidth: 180, fontSize: 12, height: 32 } as const

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function chartSubtitle(granularity: 'daily' | 'monthly' | 'yearly', base: string): string {
  if (granularity === 'daily') {
    return base.replace('month-wise', 'day-wise').replace('Monthly', 'Daily')
  }
  if (granularity === 'yearly') {
    return base.replace('month-wise', 'year-wise').replace('Monthly', 'Yearly')
  }
  return base
}

export default function Dashboard1Page() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('This Year')
  const [clientFilter, setClientFilter] = useState('All Clients')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All Status')
  const [pmFilter, setPmFilter] = useState('All Managers')
  const [activeTab, setActiveTab] = useState<DashboardTab>('revenue')
  const [revenuePeriod, setRevenuePeriod] = useState<RevenueTimePeriod>('This Financial Year')
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([null, null])

  const revenueAnalytics = useMemo(
    () => getRevenueAnalytics(revenuePeriod, customRange),
    [revenuePeriod, customRange],
  )

  const handleReset = useCallback(() => {
    setDateRange('This Year')
    setClientFilter('All Clients')
    setStatusFilter('All Status')
    setPmFilter('All Managers')
  }, [])

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>
          Dashboard 1
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Revenue overview across purchase orders, collections, and vendor payments.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 1.5,
          mb: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mr: 0.5 }}
          >
            Filters
          </Typography>

          <MuiSelect
            size="small"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
            sx={SELECT_SX}
          >
            {DATE_RANGE_OPTIONS.map((v) => (
              <MenuItem key={v} value={v} sx={MENU_ITEM_SX}>
                {v}
              </MenuItem>
            ))}
          </MuiSelect>

          <MuiSelect
            size="small"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            sx={SELECT_SX}
          >
            <MenuItem value="All Clients" sx={MENU_ITEM_SX}>
              All Clients
            </MenuItem>
            {DASHBOARD1_FILTER_OPTIONS.clients
              .filter((c) => c.value !== 'all')
              .map((c) => (
                <MenuItem key={c.value} value={c.label} sx={MENU_ITEM_SX}>
                  {c.label}
                </MenuItem>
              ))}
          </MuiSelect>

          <MuiSelect
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            sx={{ ...SELECT_SX, minWidth: 110 }}
          >
            {STATUS_OPTIONS.map((v) => (
              <MenuItem key={v} value={v} sx={MENU_ITEM_SX}>
                {v}
              </MenuItem>
            ))}
          </MuiSelect>

          <MuiSelect
            size="small"
            value={pmFilter}
            onChange={(e) => setPmFilter(e.target.value)}
            sx={{ ...SELECT_SX, minWidth: 160 }}
          >
            <MenuItem value="All Managers" sx={MENU_ITEM_SX}>
              All Project Leads
            </MenuItem>
            {DASHBOARD1_FILTER_OPTIONS.projectManagers
              .filter((pm) => pm.value !== 'all')
              .map((pm) => (
                <MenuItem key={pm.value} value={pm.label} sx={MENU_ITEM_SX}>
                  {pm.label}
                </MenuItem>
              ))}
          </MuiSelect>

          <Button
            variant="text"
            size="sm"
            onClick={handleReset}
            sx={{ fontSize: 12, color: 'text.secondary', height: 32, minWidth: 'auto' }}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Tabs
          items={[...DASHBOARD_TABS]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as DashboardTab)}
          variant="underline"
          scrollable
          size="sm"
          sx={{ px: 2, width: '100%' }}
        />

        <Box sx={{ p: 2 }}>
          {activeTab === 'revenue' && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  mb: 1,
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
                    Revenue
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: 12, mt: 0.25 }}
                  >
                    Key commercial metrics for the selected period.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    alignItems: 'flex-end',
                  }}
                >
                  <Box>
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
                    <MuiSelect
                      size="small"
                      value={revenuePeriod}
                      onChange={(e) =>
                        setRevenuePeriod(e.target.value as RevenueTimePeriod)
                      }
                      sx={REVENUE_PERIOD_SELECT_SX}
                    >
                      {REVENUE_TIME_PERIOD_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                          {opt}
                        </MenuItem>
                      ))}
                    </MuiSelect>
                  </Box>

                  {revenuePeriod === 'Custom Range' ? (
                    <DateRangePicker
                      size="sm"
                      value={customRange}
                      onChange={setCustomRange}
                      startLabel="From"
                      endLabel="To"
                    />
                  ) : null}
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {revenueAnalytics.kpis.map((kpi) => (
                  <Grid key={kpi.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <RevenueKpiCard kpi={kpi} />
                  </Grid>
                ))}
              </Grid>

              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight={600}
                sx={{ fontSize: 10, letterSpacing: 1, display: 'block', mb: 1.5 }}
              >
                Revenue Analytics
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <ChartCard
                    title="Monthly Revenue Trend"
                    subtitle={chartSubtitle(
                      revenueAnalytics.granularity,
                      'Revenue growth month-wise',
                    )}
                  >
                    <LineChart
                      data={[...revenueAnalytics.revenueTrend]}
                      xKey="month"
                      height={280}
                      lines={[
                        { key: 'revenue', label: 'Revenue', color: CHART_COLORS.teal },
                      ]}
                      showLegend={false}
                      formatY={formatAxisAmount}
                      formatTooltip={formatAxisAmount}
                    />
                  </ChartCard>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <ChartCard
                    title="Received vs Pending"
                    subtitle="Collected payments vs pending receivables"
                    action={
                      <ChartSeriesLegend
                        items={[
                          { label: 'Amount Received', color: CHART_COLORS.green },
                          { label: 'Amount Pending', color: CHART_COLORS.amber },
                        ]}
                      />
                    }
                  >
                    <BarChart
                      data={[...revenueAnalytics.receivedVsPending]}
                      xKey="month"
                      height={280}
                      stacked
                      showLegend={false}
                      bars={[
                        {
                          key: 'received',
                          label: 'Amount Received',
                          color: CHART_COLORS.green,
                        },
                        {
                          key: 'pending',
                          label: 'Amount Pending',
                          color: CHART_COLORS.amber,
                        },
                      ]}
                      formatY={formatAxisAmount}
                    />
                  </ChartCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <ChartCard
                    title="Vendor Payments"
                    subtitle={chartSubtitle(
                      revenueAnalytics.granularity,
                      'Monthly payments made to vendors',
                    )}
                  >
                    <BarChart
                      data={[...revenueAnalytics.vendorPayments]}
                      xKey="month"
                      height={280}
                      bars={[
                        { key: 'paid', label: 'Amount Paid', color: CHART_COLORS.blue },
                      ]}
                      showLegend={false}
                      formatY={formatAxisAmount}
                    />
                  </ChartCard>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 'projects' && (
            <Box>
              <ProjectsOverviewSection
                dateRange={dateRange}
                clientFilter={clientFilter}
                statusFilter={statusFilter}
                pmFilter={pmFilter}
              />

              <ProjectAnalyticsSection />

              <SectorAnalyticsSection />

              <ProjectDesignAnalyticsSection />
            </Box>
          )}

          {activeTab === 'team' && <TeamSection />}

          {activeTab === 'vendors' && <VendorsSection />}
        </Box>
      </Paper>
    </Box>
  )
}

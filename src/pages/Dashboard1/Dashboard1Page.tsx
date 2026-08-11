/**
 * Dashboard 1 — new Revenue-focused dashboard (sample data UI).
 * Existing `/dashboard` page is unchanged.
 */
import { useMemo, useState } from 'react'
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
  ChartCard,
  DateRangePicker,
  LineChart,
  Tabs,
} from '@/design-system/components'
import { CHART_COLORS } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import {
  getRevenueAnalytics,
  REVENUE_DATE_TYPE_OPTIONS,
  REVENUE_TIME_PERIOD_OPTIONS,
  type RevenueDateType,
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

type DashboardTab = 'revenue' | 'projects' | 'team' | 'vendors'

const DASHBOARD_TABS = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Projects', value: 'projects' },
  { label: 'Team', value: 'team' },
  { label: 'Vendors', value: 'vendors' },
] as const

const MENU_ITEM_SX = { fontSize: 12 } as const
const REVENUE_PERIOD_SELECT_SX = { minWidth: 180, fontSize: 12, height: 32 } as const
const REVENUE_DATE_TYPE_SELECT_SX = { minWidth: 190, fontSize: 12, height: 32 } as const

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
  const [activeTab, setActiveTab] = useState<DashboardTab>('revenue')
  const [revenuePeriod, setRevenuePeriod] = useState<RevenueTimePeriod>('This Financial Year')
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([null, null])
  const [revenueDateType, setRevenueDateType] = useState<RevenueDateType>('PO Date')

  const revenueAnalytics = useMemo(
    () => getRevenueAnalytics(revenuePeriod, customRange, revenueDateType),
    [revenuePeriod, customRange, revenueDateType],
  )

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>
          Dashboard
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
                <Grid size={{ xs: 12 }}>
                  <ChartCard
                    title="Monthly Revenue Trend"
                    subtitle={chartSubtitle(
                      revenueAnalytics.granularity,
                      'Revenue growth month-wise',
                    )}
                    action={
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
                          Date Type
                        </Typography>
                        <MuiSelect
                          size="small"
                          value={revenueDateType}
                          onChange={(e) =>
                            setRevenueDateType(e.target.value as RevenueDateType)
                          }
                          sx={REVENUE_DATE_TYPE_SELECT_SX}
                        >
                          {REVENUE_DATE_TYPE_OPTIONS.map((opt) => (
                            <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                              {opt}
                            </MenuItem>
                          ))}
                        </MuiSelect>
                      </Box>
                    }
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

                <Grid size={{ xs: 12 }}>
                  <ChartCard
                    title="Client Revenue Received vs Vendor Payments"
                    subtitle={chartSubtitle(
                      revenueAnalytics.granularity,
                      'Client collections vs vendor payments month-wise',
                    )}
                    action={
                      <ChartSeriesLegend
                        items={[
                          {
                            label: 'Client Revenue Received',
                            color: CHART_COLORS.green,
                          },
                          {
                            label: 'Vendor Payments',
                            color: CHART_COLORS.blue,
                          },
                        ]}
                      />
                    }
                  >
                    <BarChart
                      data={[...revenueAnalytics.clientReceivedVsVendorPayments]}
                      xKey="month"
                      height={280}
                      showLegend={false}
                      bars={[
                        {
                          key: 'clientReceived',
                          label: 'Client Revenue Received',
                          color: CHART_COLORS.green,
                        },
                        {
                          key: 'vendorPaid',
                          label: 'Vendor Payments',
                          color: CHART_COLORS.blue,
                        },
                      ]}
                      formatY={formatAxisAmount}
                    />
                  </ChartCard>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 'projects' && (
            <Box>
              <ProjectsOverviewSection />

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

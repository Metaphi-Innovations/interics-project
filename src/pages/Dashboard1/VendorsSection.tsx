/**
 * Dashboard 1 — Vendors section
 * Vendor summary KPIs + billing / projects charts (client dashboard document)
 */
import { useMemo, useState, type ReactNode } from 'react'
import {
  Autocomplete,
  Box,
  Grid,
  MenuItem,
  Paper,
  Select as MuiSelect,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { CircleDollarSign, FolderKanban } from 'lucide-react'
import type { TooltipContentProps } from 'recharts'
import {
  BarChart,
  ChartCard,
  DateRangePicker,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import { LargerMetaDataSection } from './LargerMetaDataSection'
import { VendorBillingAcrossYearsChart } from './VendorBillingAcrossYearsChart'
import {
  getVendorAnalytics,
  VENDOR_FILTER_OPTIONS,
  VENDOR_TIME_PERIOD_OPTIONS,
  type ProjectsCompletedTogetherPoint,
  type VendorBillingCurrentYearPoint,
  type VendorFilterId,
  type VendorFilterOption,
  type VendorKpi,
  type VendorTimePeriod,
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

const SELECT_SX = { minWidth: 180, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const
const AUTOCOMPLETE_SX = {
  minWidth: { xs: '100%', sm: 180 },
  maxWidth: { xs: '100%', sm: 220 },
  '& .MuiOutlinedInput-root': {
    height: 32,
    fontSize: 12,
    bgcolor: 'background.paper',
    '& fieldset': {
      borderColor: tokens.color.neutral[200],
    },
  },
  '& .MuiInputBase-input': {
    fontSize: 12,
    py: 0,
  },
} as const

const FILTER_LABEL_SX = {
  display: 'block',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  mb: 0.5,
} as const

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

function ChartTooltipShell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${tokens.color.neutral[200]}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        px: 1.5,
        py: 1,
        minWidth: 160,
        maxWidth: 260,
      }}
    >
      {children}
    </Box>
  )
}

function TooltipTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
      {children}
    </Typography>
  )
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontSize: 11, display: 'block', mt: 0.25 }}
    >
      {label}: {value}
    </Typography>
  )
}

function VendorBillingCurrentYearTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as VendorBillingCurrentYearPoint | undefined
  if (!point) return null

  return (
    <ChartTooltipShell>
      <TooltipTitle>{point.vendor}</TooltipTitle>
      <TooltipRow label="Billing Amount" value={formatAxisAmount(point.billing)} />
      <TooltipRow
        label="Projects Completed Together"
        value={String(point.projectsCompleted)}
      />
      <TooltipRow
        label="Average Fee / Sq.ft"
        value={`₹${point.avgFeePerSqFt} / Sq.ft`}
      />
    </ChartTooltipShell>
  )
}

function ProjectsCompletedTogetherTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as ProjectsCompletedTogetherPoint | undefined
  if (!point) return null

  return (
    <ChartTooltipShell>
      <TooltipTitle>{point.vendor}</TooltipTitle>
      <TooltipRow
        label="Projects Completed Together"
        value={String(point.projects)}
      />
    </ChartTooltipShell>
  )
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
  const [timePeriod, setTimePeriod] = useState<VendorTimePeriod>('This Financial Year')
  const [vendorId, setVendorId] = useState<VendorFilterId>('all')
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([null, null])

  const analytics = useMemo(
    () => getVendorAnalytics(timePeriod, vendorId, customRange),
    [timePeriod, vendorId, customRange],
  )

  const selectedVendor =
    VENDOR_FILTER_OPTIONS.find((opt) => opt.value === vendorId) ?? VENDOR_FILTER_OPTIONS[0]

  const yearLines = analytics.yearLines.map((line, i) => ({
    key: line.key,
    label: line.label,
    color: YEAR_LINE_COLORS[i % YEAR_LINE_COLORS.length],
  }))

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
            Vendors
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
            Vendor billing and completed-project partnership overview.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'flex-end',
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          <Box sx={{ minWidth: { xs: '100%', sm: 'auto' } }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={FILTER_LABEL_SX}
            >
              Time Period
            </Typography>
            <MuiSelect
              size="small"
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as VendorTimePeriod)}
              sx={{ ...SELECT_SX, width: { xs: '100%', sm: 'auto' } }}
            >
              {VENDOR_TIME_PERIOD_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                  {opt}
                </MenuItem>
              ))}
            </MuiSelect>
          </Box>

          {timePeriod === 'Custom Range' ? (
            <DateRangePicker
              size="sm"
              value={customRange}
              onChange={setCustomRange}
              startLabel="From"
              endLabel="To"
            />
          ) : null}

          <Box sx={{ minWidth: { xs: '100%', sm: 'auto' }, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={FILTER_LABEL_SX}
            >
              Vendor
            </Typography>
            <Autocomplete
              size="small"
              disableClearable
              options={[...VENDOR_FILTER_OPTIONS]}
              value={selectedVendor}
              onChange={(_, option: VendorFilterOption) => setVendorId(option.value)}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.value === value.value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search vendor"
                  inputProps={{
                    ...params.inputProps,
                    'aria-label': 'Search and select vendor',
                  }}
                />
              )}
              slotProps={{
                paper: {
                  sx: {
                    fontSize: 12,
                    '& .MuiAutocomplete-option': { fontSize: 12, minHeight: 36 },
                  },
                },
              }}
              sx={AUTOCOMPLETE_SX}
            />
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {analytics.kpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6 }}>
            <VendorKpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <LargerMetaDataSection
        kpis={analytics.largerMetaKpis}
        highlights={analytics.projectHighlights}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Vendor Billing (Current Year)"
            subtitle="Compare vendor billing for the selected financial year"
          >
            <BarChart
              data={[...analytics.billingCurrentYear]}
              xKey="vendor"
              height={300}
              orientation="horizontal"
              bars={[{ key: 'billing', label: 'Billing', color: CHART_COLORS.teal }]}
              showLegend={false}
              barSize={18}
              formatX={formatAxisAmount}
              tooltipContent={VendorBillingCurrentYearTooltip}
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
            <VendorBillingAcrossYearsChart
              data={[...analytics.billingAcrossYears]}
              lines={yearLines}
              height={300}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Projects Completed Together"
            subtitle="Vendors with the highest number of completed projects"
          >
            <BarChart
              data={[...analytics.projectsCompleted]}
              xKey="vendor"
              height={300}
              orientation="horizontal"
              bars={[{ key: 'projects', label: 'Projects', color: CHART_COLORS.blue }]}
              showLegend={false}
              barSize={18}
              tooltipContent={ProjectsCompletedTogetherTooltip}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

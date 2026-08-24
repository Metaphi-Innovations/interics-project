/**
 * Dashboard 1 — Vendors section
 * Vendor summary KPIs + billing charts + Vendor Project Performance
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Autocomplete,
  Box,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Select as MuiSelect,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { CircleDollarSign, FolderKanban } from 'lucide-react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import {
  ChartCard,
  Modal,
} from '@/design-system/components'
import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchVendors } from '@/slices/vendors/thunk'
import type { VendorInvoice } from '@/slices/live/types'
import {
  formatBillingValue,
  getVendorAnalytics,
  getVendorProjectPerformanceAnalytics,
  VENDOR_PROJECT_PERFORMANCE_METRIC_OPTIONS,
  type TotalVendorBillingYearPoint,
  type VendorKpi,
  type VendorProjectPerformanceMetric,
  type VendorProjectPerformanceOption,
  type VendorProjectPerformanceRow,
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

const METRIC_SELECT_SX = { minWidth: 240, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const

/** Match Metric Select theme fill (action.hover, no outline) — do not override bgcolor/border. */
const PERF_VENDOR_MULTI_SX = {
  minWidth: { xs: '100%', sm: 260 },
  maxWidth: { xs: '100%', sm: 360 },
  '& .MuiOutlinedInput-root': {
    minHeight: 32,
    height: 'auto',
    py: 0.25,
    fontSize: 12,
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

async function fetchJsonArray(url: string): Promise<unknown[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (Array.isArray(data)) return data
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as { items?: unknown[] }).items)
    ) {
      return (data as { items: unknown[] }).items
    }
    return []
  } catch {
    return []
  }
}

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

function formatExactBillingAmount(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

function VendorProjectPerformanceTooltip({
  active,
  payload,
  metric,
}: TooltipContentProps & { metric: VendorProjectPerformanceMetric }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as VendorProjectPerformanceRow | undefined
  if (!point) return null

  if (metric === 'Total Billing for the Year') {
    return (
      <ChartTooltipShell>
        <TooltipTitle>{point.vendor}</TooltipTitle>
        <TooltipRow
          label="Total Billing for the Year"
          value={formatExactBillingAmount(point.totalBilling)}
        />
      </ChartTooltipShell>
    )
  }

  const countLabel =
    point.projectCount === 1 ? '1 Project' : `${point.projectCount} Projects`
  return (
    <ChartTooltipShell>
      <TooltipTitle>{point.vendor}</TooltipTitle>
      <TooltipRow
        label={metric === 'No. of Projects' ? 'Live Projects' : 'Completed Projects'}
        value={countLabel}
      />
      <TooltipRow label="Total Project Value" value={formatBillingValue(point.totalValue)} />
    </ChartTooltipShell>
  )
}

function VendorProjectPerformanceChart({
  data,
  metric,
  height = 300,
}: {
  data: VendorProjectPerformanceRow[]
  metric: VendorProjectPerformanceMetric
  height?: number
}) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.85) : height
  const isBilling = metric === 'Total Billing for the Year'
  const barFill =
    metric === 'No. of Projects'
      ? CHART_COLORS.teal
      : metric === 'Projects Completed by Vendors'
        ? CHART_COLORS.blue
        : CHART_COLORS.amber

  return (
    <Box sx={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={h}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          barCategoryGap="28%"
          margin={{
            top: 8,
            right: ct.isMobile ? 16 : 24,
            left: 0,
            bottom: 8,
          }}
        >
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
            horizontal={false}
            vertical
          />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[0, 'dataMax']}
            padding={{ left: 0, right: 8 }}
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            tickFormatter={isBilling ? (v) => formatBillingValue(Number(v)) : undefined}
          />
          <YAxis
            type="category"
            dataKey="vendor"
            tick={{ ...ct.axisStyle, textAnchor: 'end' }}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
            width={ct.isMobile ? 78 : 100}
            tickMargin={2}
            interval={0}
          />
          <Tooltip
            isAnimationActive={false}
            animationDuration={0}
            content={(props) => (
              <VendorProjectPerformanceTooltip {...props} metric={metric} />
            )}
            cursor={{
              fill: ct.theme.palette.action.hover,
              stroke: 'none',
              fillOpacity: 0.45,
            }}
          />
          <Bar
            dataKey={isBilling ? 'totalBilling' : 'projectCount'}
            name={isBilling ? 'Total Billing' : 'Projects'}
            fill={barFill}
            radius={[0, 6, 6, 0]}
            maxBarSize={22}
            isAnimationActive={false}
            activeBar={false}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  )
}

function TotalVendorBillingYearTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as TotalVendorBillingYearPoint | undefined
  if (!point) return null
  return (
    <ChartTooltipShell>
      <TooltipTitle>{point.year}</TooltipTitle>
      <TooltipRow label="Total Vendor Billing" value={formatBillingValue(point.total)} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 10, display: 'block', mt: 0.5, fontStyle: 'italic' }}
      >
        Click bar for vendor breakdown
      </Typography>
    </ChartTooltipShell>
  )
}

function TotalVendorBillingOverYearsChart({
  data,
  selectedYear,
  onYearClick,
  height = 320,
}: {
  data: TotalVendorBillingYearPoint[]
  selectedYear: string | null
  onYearClick: (year: string) => void
  height?: number
}) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.85) : height

  return (
    <Box sx={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={h}>
        <RechartsBarChart
          data={data}
          margin={{ top: 28, right: 12, left: 8, bottom: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            stroke={ct.gridProps.stroke}
            strokeDasharray={ct.gridProps.strokeDasharray}
            strokeOpacity={ct.gridProps.strokeOpacity}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={{ stroke: ct.gridProps.stroke }}
          />
          <YAxis
            tick={ct.axisStyle}
            tickLine={false}
            axisLine={false}
            width={ct.isMobile ? 52 : 64}
            tickFormatter={(v) => formatAxisAmount(v)}
          />
          <Tooltip
            isAnimationActive={false}
            animationDuration={0}
            content={TotalVendorBillingYearTooltip}
            cursor={{ fill: ct.theme.palette.action.hover, fillOpacity: 0.35 }}
          />
          <Bar
            dataKey="total"
            name="Total Vendor Billing"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
            cursor="pointer"
            onClick={(entry) => {
              const payload = (entry as { payload?: TotalVendorBillingYearPoint }).payload
              const year = payload?.year
              if (year) onYearClick(year)
            }}
          >
            {data.map((row) => (
              <Cell
                key={row.year}
                fill={
                  selectedYear === row.year
                    ? CHART_COLORS.blue
                    : CHART_COLORS.teal
                }
                fillOpacity={selectedYear == null || selectedYear === row.year ? 1 : 0.45}
                stroke={selectedYear === row.year ? CHART_COLORS.blue : 'none'}
                strokeWidth={selectedYear === row.year ? 2 : 0}
              />
            ))}
            <LabelList
              dataKey="total"
              position="top"
              formatter={(value) => formatBillingValue(Number(value))}
              style={{
                fill: tokens.color.neutral[700],
                fontSize: 11,
                fontWeight: 600,
                fontFamily: ct.fontFamily,
              }}
            />
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  )
}

function VendorBillingYearModal({
  open,
  yearPoint,
  onClose,
}: {
  open: boolean
  yearPoint: TotalVendorBillingYearPoint | null
  onClose: () => void
}) {
  const rows = useMemo(
    () =>
      yearPoint
        ? [...yearPoint.vendors].sort((a, b) => b.amount - a.amount || a.vendor.localeCompare(b.vendor))
        : [],
    [yearPoint],
  )

  const vendorCount = rows.length
  const modalSize = vendorCount > 30 ? 'xl' : vendorCount > 18 ? 'lg' : vendorCount > 8 ? 'md' : 'sm'
  /** Only the vendor list scrolls; compact when few rows. */
  const listMaxHeight =
    vendorCount <= 8
      ? undefined
      : vendorCount <= 18
        ? 'min(36vh, 280px)'
        : vendorCount <= 30
          ? 'min(48vh, 400px)'
          : 'min(56vh, 520px)'

  if (!yearPoint) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Vendor Billing – ${yearPoint.year}`}
      size={modalSize}
      sx={{
        maxHeight: 'min(100vh - 64px, 90vh)',
        width: {
          xs: undefined,
          sm: modalSize === 'sm' ? 500 : modalSize === 'md' ? 600 : modalSize === 'lg' ? 800 : 1000,
        },
      }}
      footer={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
            Total Vendor Billing ({yearPoint.year})
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: 14 }}>
            {formatBillingValue(yearPoint.total)}
          </Typography>
        </Box>
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1.5 }}>
        Year: {yearPoint.year}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          columnGap: 3,
          pb: 1,
          mb: 0.5,
          borderBottom: `1px solid ${tokens.color.neutral[200]}`,
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' }}
        >
          Vendor
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            textAlign: 'right',
          }}
        >
          Amount Paid
        </Typography>
      </Box>

      <Box
        sx={{
          maxHeight: listMaxHeight,
          overflowY: listMaxHeight ? 'auto' : 'visible',
          pr: listMaxHeight ? 0.5 : 0,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            columnGap: 3,
            rowGap: 1,
            py: 1,
          }}
        >
          {rows.map((row) => (
            <Box key={row.vendor} sx={{ display: 'contents' }}>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>
                {row.vendor}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}
              >
                {formatBillingValue(row.amount)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Modal>
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
  const dispatch = useAppDispatch()
  const vendors = useAppSelector((s) => s.vendors.items ?? [])
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const vendorsLoading = useAppSelector((s) => s.vendors.loading)
  const projectsLoading = useAppSelector((s) => s.projects.loading)

  const [projectPerfMetric, setProjectPerfMetric] =
    useState<VendorProjectPerformanceMetric>('No. of Projects')
  const [projectPerfVendorIds, setProjectPerfVendorIds] = useState<string[]>([])
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedBillingYear, setSelectedBillingYear] = useState<string | null>(null)

  const analytics = useMemo(
    () => getVendorAnalytics('This Financial Year', 'all', [null, null]),
    [],
  )

  const projectPerformance = useMemo(
    () =>
      getVendorProjectPerformanceAnalytics(
        vendors,
        projects,
        vendorInvoices,
        projectPerfMetric,
        projectPerfVendorIds,
      ),
    [vendors, projects, vendorInvoices, projectPerfMetric, projectPerfVendorIds],
  )

  const selectedProjectPerfVendors = useMemo(() => {
    if (projectPerfVendorIds.length === 0) return []
    const byId = new Map(
      projectPerformance.vendorOptions.map((o) => [o.value, o] as const),
    )
    return projectPerfVendorIds
      .map((id) => byId.get(id))
      .filter((o): o is VendorProjectPerformanceOption => Boolean(o))
  }, [projectPerformance.vendorOptions, projectPerfVendorIds])

  const selectedYearPoint = useMemo(
    () =>
      analytics.totalBillingOverYears.find((row) => row.year === selectedBillingYear) ?? null,
    [analytics.totalBillingOverYears, selectedBillingYear],
  )

  const projectPerfLoading = vendorsLoading || projectsLoading || invoicesLoading
  const projectPerfRows = projectPerformance.rows
  const projectPerfHeight = Math.max(
    280,
    Math.min(520, Math.max(projectPerfRows.length, 1) * 44 + 80),
  )

  useEffect(() => {
    void dispatch(fetchVendors({ page: 1, pageSize: 500 }))
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
  }, [dispatch])

  useEffect(() => {
    const valid = new Set(projectPerformance.vendorOptions.map((o) => o.value))
    setProjectPerfVendorIds((prev) => {
      const next = prev.filter((id) => valid.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [projectPerformance.vendorOptions])

  useEffect(() => {
    if (projects.length === 0) {
      setVendorInvoices([])
      return
    }
    let cancelled = false
    setInvoicesLoading(true)
    void (async () => {
      const results = await Promise.all(
        projects.map(async (p) => {
          const rows = await fetchJsonArray(`/api/projects/${p.id}/vendor-invoices`)
          return rows as VendorInvoice[]
        }),
      )
      if (cancelled) return
      const merged: VendorInvoice[] = []
      for (const rows of results) {
        if (Array.isArray(rows)) merged.push(...rows)
      }
      setVendorInvoices(merged)
      setInvoicesLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projects])

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
        {analytics.kpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6 }}>
            <VendorKpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2 }}>
        <ChartCard
          title="Vendor Project Performance"
          subtitle="Compare live and completed projects and their total project value by vendor."
          action={
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
              }}
            >
              <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Vendor
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  options={projectPerformance.vendorOptions}
                  value={selectedProjectPerfVendors}
                  onChange={(_, options) => {
                    setProjectPerfVendorIds(options.map((o) => o.value))
                  }}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  filterSelectedOptions
                  limitTags={2}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter((opt) => opt.label.toLowerCase().includes(query))
                  }}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index })
                      return (
                        <Chip
                          key={key}
                          size="small"
                          label={option.label}
                          {...tagProps}
                          sx={{ height: 22, fontSize: 11 }}
                        />
                      )
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={
                        selectedProjectPerfVendors.length === 0
                          ? 'All Vendors'
                          : 'Search vendors...'
                      }
                      inputProps={{
                        ...params.inputProps,
                        'aria-label': 'Search and select vendors',
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
                  sx={PERF_VENDOR_MULTI_SX}
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={FILTER_LABEL_SX}
                >
                  Metric
                </Typography>
                <MuiSelect
                  size="small"
                  value={projectPerfMetric}
                  onChange={(e) =>
                    setProjectPerfMetric(e.target.value as VendorProjectPerformanceMetric)
                  }
                  sx={METRIC_SELECT_SX}
                >
                  {VENDOR_PROJECT_PERFORMANCE_METRIC_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt} sx={MENU_ITEM_SX}>
                      {opt}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>
            </Box>
          }
        >
          {projectPerfLoading && projectPerfRows.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              Loading vendor project performance…
            </Typography>
          ) : projectPerfRows.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 12, py: 6, textAlign: 'center' }}
            >
              {projectPerfMetric === 'Total Billing for the Year'
                ? 'No vendor billing for the selected financial year.'
                : 'No vendor project data for the selected filters.'}
            </Typography>
          ) : (
            <VendorProjectPerformanceChart
              data={projectPerfRows}
              metric={projectPerfMetric}
              height={projectPerfHeight}
            />
          )}
        </ChartCard>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="Total Vendor Billing – Over the Years"
            subtitle="Total amount paid to all vendors each year. Click a bar for vendor breakdown."
          >
            <TotalVendorBillingOverYearsChart
              data={analytics.totalBillingOverYears}
              selectedYear={selectedBillingYear}
              onYearClick={(year) => setSelectedBillingYear(year)}
              height={320}
            />
          </ChartCard>
        </Grid>
      </Grid>

      <VendorBillingYearModal
        open={selectedBillingYear != null && selectedYearPoint != null}
        yearPoint={selectedYearPoint}
        onClose={() => setSelectedBillingYear(null)}
      />
    </Box>
  )
}

/**
 * Dashboard 1 — Project Design Analytics
 * Project selector + details, financial summary, fee/sqft, duration
 */
import { useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from 'react'
import {
  Autocomplete,
  Box,
  Fade,
  Grid,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Banknote,
  IndianRupee,
  Percent,
  Wallet,
} from 'lucide-react'
import {
  BarChart,
  ChartCard,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import {
  DEFAULT_DESIGN_PROJECT_ID,
  DESIGN_PROJECT_ANALYTICS,
  DESIGN_PROJECT_OPTIONS,
  type DesignFinancialIcon,
  type DesignProjectId,
  type DesignProjectOption,
} from './projectDesignAnalyticsData'

const FINANCIAL_ICON_MAP: Record<DesignFinancialIcon, { node: ReactNode; color: string }> = {
  value: {
    node: <Wallet size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  payable: {
    node: <Banknote size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.amber,
  },
  profit: {
    node: <Percent size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
  fee: {
    node: <IndianRupee size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
}

const PROJECT_SWITCH_DELAY_MS = 320

const AUTOCOMPLETE_SX = {
  minWidth: { xs: '100%', sm: 240 },
  maxWidth: { xs: '100%', sm: 280 },
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

function formatFeePerSqft(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${n}`
}

function formatDays(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${n}d`
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Typography
      variant="subtitle2"
      fontWeight={600}
      sx={{ fontSize: 13, mb: 1.5 }}
    >
      {title}
    </Typography>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}
        title={value}
      >
        {value}
      </Typography>
    </Box>
  )
}

function DesignKpiCard({
  icon,
  iconColor,
  title,
  value,
  subtitle,
}: {
  icon: ReactNode
  iconColor: string
  title: string
  value: string
  subtitle?: string
}) {
  const theme = useTheme()

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: 2.5,
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
          width: '100%',
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
        sx={{
          fontSize: { xs: 22, md: 26 },
          lineHeight: 1.15,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Typography>

      {subtitle != null && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: 11, mt: 'auto' }}
        >
          {subtitle}
        </Typography>
      )}
    </Paper>
  )
}

function ProjectDetailsSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        columnGap: 3,
        rowGap: 2,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i}>
          <Skeleton width={72} height={12} sx={{ mb: 0.75 }} />
          <Skeleton width="70%" height={18} />
        </Box>
      ))}
    </Box>
  )
}

export function ProjectDesignAnalyticsSection() {
  const [projectId, setProjectId] = useState<DesignProjectId>(DEFAULT_DESIGN_PROJECT_ID)
  const [pendingId, setPendingId] = useState<DesignProjectId | null>(null)
  const [loading, setLoading] = useState(false)
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectorId = pendingId ?? projectId

  const selectedOption = useMemo(
    () => DESIGN_PROJECT_OPTIONS.find((o) => o.id === selectorId) ?? DESIGN_PROJECT_OPTIONS[0],
    [selectorId],
  )

  const analytics = DESIGN_PROJECT_ANALYTICS[projectId]

  const detailFields = useMemo(
    () => [
      { label: 'Project Name', value: analytics.details.projectName },
      { label: 'Carpet Area', value: analytics.details.carpetArea },
      { label: 'Headcount', value: analytics.details.headcount },
      { label: 'Building', value: analytics.details.building },
      { label: 'Client Sector', value: analytics.details.clientSector },
      { label: 'Project Manager', value: analytics.details.projectManager },
    ],
    [analytics],
  )

  useEffect(() => {
    return () => {
      if (switchTimerRef.current != null) {
        clearTimeout(switchTimerRef.current)
      }
    }
  }, [])

  const handleProjectChange = (
    _event: SyntheticEvent,
    value: DesignProjectOption | null,
  ) => {
    if (value == null || value.id === selectorId) return

    if (switchTimerRef.current != null) {
      clearTimeout(switchTimerRef.current)
    }

    setPendingId(value.id)
    setLoading(true)
    switchTimerRef.current = setTimeout(() => {
      setProjectId(value.id)
      setPendingId(null)
      setLoading(false)
      switchTimerRef.current = null
    }, PROJECT_SWITCH_DELAY_MS)
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'flex-end' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
            Project Design Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
            Detailed design metrics for an individual project.
          </Typography>
        </Box>

        <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
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
            Project
          </Typography>
          <Autocomplete
            size="small"
            disableClearable
            options={DESIGN_PROJECT_OPTIONS}
            value={selectedOption}
            onChange={handleProjectChange}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search project"
                inputProps={{
                  ...params.inputProps,
                  'aria-label': 'Search and select project',
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

      <Fade in key={projectId} timeout={280}>
        <Stack
          spacing={2}
          sx={{
            opacity: loading ? 0.55 : 1,
            transition: 'opacity 0.2s ease',
            pointerEvents: loading ? 'none' : 'auto',
          }}
        >
          {/* Section 1 — Project Details */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '10px',
              border: `1px solid ${tokens.color.neutral[200]}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              bgcolor: 'background.paper',
            }}
          >
            <SectionLabel title="Project Details" />
            {loading ? (
              <ProjectDetailsSkeleton />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  columnGap: 3,
                  rowGap: 2,
                }}
              >
                {detailFields.map((field) => (
                  <DetailField key={field.label} label={field.label} value={field.value} />
                ))}
              </Box>
            )}
          </Paper>

          {/* Section 2 — Financial Summary (4 KPIs) */}
          <Box>
            <SectionLabel title="Financial Summary" />
            <Grid container spacing={2}>
              {analytics.financialSummary.map((kpi) => {
                const iconMeta = FINANCIAL_ICON_MAP[kpi.icon]
                return (
                  <Grid key={kpi.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                    {loading ? (
                      <Skeleton
                        variant="rounded"
                        height={120}
                        sx={{ borderRadius: '10px' }}
                      />
                    ) : (
                      <DesignKpiCard
                        icon={iconMeta.node}
                        iconColor={iconMeta.color}
                        title={kpi.title}
                        value={kpi.value}
                        subtitle={kpi.subtitle}
                      />
                    )}
                  </Grid>
                )
              })}
            </Grid>
          </Box>

          {/* Section 3 — Fee per Sq.ft */}
          <ChartCard
            title="Fee per Sq.ft"
            subtitle="Design service fees by category"
            loading={loading}
          >
            <BarChart
              data={[...analytics.feePerSqft]}
              xKey="service"
              height={300}
              orientation="horizontal"
              bars={[{ key: 'feePerSqft', label: 'Fee / sqft', color: CHART_COLORS.teal }]}
              showLegend={false}
              barSize={18}
              formatX={formatFeePerSqft}
              loading={loading}
            />
          </ChartCard>

          {/* Section 4 — Project Duration */}
          <ChartCard
            title="Project Duration (Planned vs Actual)"
            subtitle="Comparison of planned and actual project duration"
            loading={loading}
          >
            <BarChart
              data={[...analytics.duration]}
              xKey="label"
              height={180}
              orientation="horizontal"
              bars={[{ key: 'days', label: 'Days', color: CHART_COLORS.blue }]}
              showLegend={false}
              barSize={22}
              formatX={formatDays}
              loading={loading}
            />
          </ChartCard>
        </Stack>
      </Fade>
    </Box>
  )
}

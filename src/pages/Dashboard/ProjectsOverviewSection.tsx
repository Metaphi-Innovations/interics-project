/**
 * Dashboard — Projects Overview
 * KPI cards + sector tags + status / design delivery distribution
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Archive,
  Building2,
  CheckCircle2,
  Clock3,
  PlayCircle,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react'
import {
  ChartCard,
  DonutChart,
  type DonutSlice,
} from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import {
  buildProjectOverviewKpis,
  buildSectorTagsFromMaster,
  PROJECT_STATUS_DISTRIBUTION,
  type ProjectOverviewKpi,
  type SectorTag,
} from './projectsOverviewData'
import { filterProjectsForDashboard } from './projectAnalyticsData'
import { DESIGN_VS_BUILD } from './sectorAnalyticsData'
import { fetchSectors } from '@/slices/settings/thunk'
import { getSectorTagSx } from '@/utils/sectorTagStyles'
import {
  ProjectKpiDrawer,
  CLICKABLE_PROJECT_KPI_IDS,
} from './ProjectKpiDrawer'

const DESIGN_VS_BUILD_COLORS = {
  design_only: CHART_COLORS.blue,
  design_build: CHART_COLORS.teal,
} as const

const ICON_MAP: Record<ProjectOverviewKpi['icon'], { node: ReactNode; color: string }> = {
  active: {
    node: <PlayCircle size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.teal,
  },
  completed: {
    node: <CheckCircle2 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.green,
  },
  pipeline: {
    node: <Sparkles size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.blue,
  },
  cancelled: {
    node: <XCircle size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.red,
  },
  archived: {
    node: <Archive size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.grey,
  },
  repeat: {
    node: <RefreshCw size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.purple,
  },
  size: {
    node: <Building2 size={18} strokeWidth={1.75} />,
    color: CHART_COLORS.amber,
  },
  conversion: {
    node: <Clock3 size={18} strokeWidth={1.75} />,
    color: tokens.color.primary[600],
  },
}

function ProjectOverviewKpiCard({
  kpi,
  onClick,
}: {
  kpi: ProjectOverviewKpi
  onClick?: () => void
}) {
  const theme = useTheme()
  const iconMeta = ICON_MAP[kpi.icon]

  return (
    <Paper
      elevation={0}
      onClick={onClick}
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
        ...(onClick && {
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          '&:hover': {
            borderColor: tokens.color.primary[300],
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
        }),
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

      {kpi.percentage != null ? (
        <Stack direction="row" alignItems="baseline" gap={0.75} sx={{ pt: 0.5 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ fontSize: 14, color: iconMeta.color }}
          >
            {kpi.percentage}%
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            of all clients
          </Typography>
        </Stack>
      ) : null}
    </Paper>
  )
}

function StatusLegendItem({ slice }: { slice: DonutSlice }) {
  const projectLabel = slice.value === 1 ? 'Project' : 'Projects'

  return (
    <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '2px',
          flexShrink: 0,
          bgcolor: slice.color ?? tokens.color.neutral[400],
        }}
      />
      <Typography
        variant="body2"
        sx={{ fontSize: 12, lineHeight: 1.4, color: 'text.primary' }}
      >
        {slice.label} — {slice.value} {projectLabel}
      </Typography>
    </Stack>
  )
}

function SectorTagChip({ tag }: { tag: SectorTag }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const colors = getSectorTagSx(tag.name, isDark ? 'dark' : 'light')

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.75,
        borderRadius: '9999px',
        bgcolor: colors.bg,
        color: colors.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {tag.name}
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          opacity: 0.9,
        }}
      >
        ({tag.count})
      </Box>
    </Box>
  )
}

export interface ProjectsOverviewSectionProps {
  dateRange?: string
  clientFilter?: string
  statusFilter?: string
  pmFilter?: string
}

export function ProjectsOverviewSection({
  dateRange = 'This Year',
  clientFilter = 'All Clients',
  statusFilter = 'All Status',
  pmFilter = 'All Managers',
}: ProjectsOverviewSectionProps) {
  const dispatch = useAppDispatch()
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const sectors = useAppSelector((s) => s.settings.sectors)

  const [drawerKpi, setDrawerKpi] = useState<ProjectOverviewKpi | null>(null)

  useEffect(() => {
    void dispatch(fetchProjects({ page: 1, pageSize: 500 }))
    void dispatch(fetchSectors())
  }, [dispatch])

  const filteredProjects = useMemo(
    () =>
      filterProjectsForDashboard(projects, {
        dateRange,
        clientFilter,
        statusFilter,
        pmFilter,
      }),
    [projects, dateRange, clientFilter, statusFilter, pmFilter],
  )

  const overviewKpis = useMemo(() => buildProjectOverviewKpis(projects), [projects])

  const totalProjects = PROJECT_STATUS_DISTRIBUTION.reduce((sum, s) => sum + s.value, 0)
  const designBuildTotal = DESIGN_VS_BUILD.reduce((sum, s) => sum + s.value, 0)
  const designBuildDonutData = DESIGN_VS_BUILD.map((s) => ({
    ...s,
    color: DESIGN_VS_BUILD_COLORS[s.key as keyof typeof DESIGN_VS_BUILD_COLORS],
  }))
  const sectorTags = useMemo(
    () => buildSectorTagsFromMaster(sectors, filteredProjects),
    [sectors, filteredProjects],
  )

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Projects Overview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          High-level overview of all projects across the portfolio.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {overviewKpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <ProjectOverviewKpiCard
              kpi={kpi}
              onClick={
                CLICKABLE_PROJECT_KPI_IDS.has(kpi.id)
                  ? () => setDrawerKpi(kpi)
                  : undefined
              }
            />
          </Grid>
        ))}
      </Grid>

      <ProjectKpiDrawer
        open={!!drawerKpi}
        onClose={() => setDrawerKpi(null)}
        kpi={drawerKpi}
        projects={projects}
      />

      <Box sx={{ mb: 2.5 }}>
        <ChartCard
          title="Sector Tag"
          subtitle="Projects grouped by Sector Master"
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
            }}
          >
            {sectorTags.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                No active sectors in Sector Master.
              </Typography>
            ) : (
              sectorTags.map((tag) => (
                <SectorTagChip key={tag.id} tag={tag} />
              ))
            )}
          </Box>
        </ChartCard>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Project Status Distribution"
            subtitle="Quick overview of all project statuses"
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                gap: { xs: 3, md: 6 },
              }}
            >
              <Box
                sx={{
                  flex: { xs: '1 1 auto', md: '0 0 40%' },
                  maxWidth: { md: 260 },
                  alignSelf: { md: 'flex-start' },
                  mr: { md: 1 },
                }}
              >
                <DonutChart
                  data={[...PROJECT_STATUS_DISTRIBUTION]}
                  height={300}
                  showLegend={false}
                  centerValue={String(totalProjects)}
                  centerLabel="Projects"
                />
              </Box>

              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  py: { md: 1 },
                  pl: { md: 2 },
                }}
              >
                <Stack spacing={1.25}>
                  {PROJECT_STATUS_DISTRIBUTION.map((slice) => (
                    <StatusLegendItem key={slice.key} slice={slice} />
                  ))}
                </Stack>
              </Box>
            </Box>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Design Only vs Design & Build"
            subtitle="Split of project delivery types"
          >
            <DonutChart
              data={designBuildDonutData}
              height={300}
              centerValue={String(designBuildTotal)}
              centerLabel="Projects"
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

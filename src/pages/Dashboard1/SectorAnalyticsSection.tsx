/**
 * Dashboard 1 — Sector & Project Type Analytics
 */
import { useMemo, useState } from 'react'
import { Box, Grid, MenuItem, Select as MuiSelect, Typography } from '@mui/material'
import {
  BarChart,
  ChartCard,
  DonutChart,
} from '@/design-system/components'
import { CHART_COLORS } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { ChartSeriesLegend } from './ChartSeriesLegend'
import {
  DESIGN_VS_BUILD,
  limitSectors,
  PROJECTS_BY_SECTOR,
  SECTOR_AVG_PROJECT_SIZE,
  SECTOR_FILTER_OPTIONS,
  SECTOR_WISE_FEE_AVERAGE,
  type SectorFilterValue,
} from './sectorAnalyticsData'

const SELECT_SX = { minWidth: 120, fontSize: 12, height: 32 } as const
const MENU_ITEM_SX = { fontSize: 12 } as const

function formatSqft(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${n.toLocaleString('en-IN')} sqft`
}

function formatAxisAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `₹${formatCurrency(n)}`
}

const DESIGN_VS_BUILD_COLORS = {
  design_only: CHART_COLORS.blue,
  design_build: CHART_COLORS.teal,
} as const

function SectorLimitSelect({
  value,
  onChange,
}: {
  value: SectorFilterValue
  onChange: (value: SectorFilterValue) => void
}) {
  return (
    <MuiSelect
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value as SectorFilterValue)}
      sx={SELECT_SX}
    >
      {SECTOR_FILTER_OPTIONS.map((opt) => (
        <MenuItem key={opt.value} value={opt.value} sx={MENU_ITEM_SX}>
          {opt.label}
        </MenuItem>
      ))}
    </MuiSelect>
  )
}

export function SectorAnalyticsSection() {
  const [projectsFilter, setProjectsFilter] = useState<SectorFilterValue>('top5')
  const [sizeFilter, setSizeFilter] = useState<SectorFilterValue>('top5')
  const [feeFilter, setFeeFilter] = useState<SectorFilterValue>('top5')

  const projectsBySector = useMemo(
    () => limitSectors(PROJECTS_BY_SECTOR, projectsFilter),
    [projectsFilter],
  )
  const avgProjectSize = useMemo(
    () => limitSectors(SECTOR_AVG_PROJECT_SIZE, sizeFilter),
    [sizeFilter],
  )
  const feeAverage = useMemo(
    () => limitSectors(SECTOR_WISE_FEE_AVERAGE, feeFilter),
    [feeFilter],
  )

  const designBuildTotal = DESIGN_VS_BUILD.reduce((sum, s) => sum + s.value, 0)
  const donutData = DESIGN_VS_BUILD.map((s) => ({
    ...s,
    color: DESIGN_VS_BUILD_COLORS[s.key as keyof typeof DESIGN_VS_BUILD_COLORS],
  }))

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
          Sector & Project Type Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Project distribution by sector and delivery type.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Projects by Sector"
            subtitle="Count of projects across sectors"
            action={
              <SectorLimitSelect value={projectsFilter} onChange={setProjectsFilter} />
            }
          >
            <BarChart
              data={[...projectsBySector]}
              xKey="sector"
              height={300}
              orientation="horizontal"
              bars={[{ key: 'count', label: 'Projects', color: CHART_COLORS.teal }]}
              showLegend={false}
              barSize={20}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Design Only vs Design & Build"
            subtitle="Split of project delivery types"
          >
            <DonutChart
              data={donutData}
              height={300}
              centerValue={String(designBuildTotal)}
              centerLabel="Projects"
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Sector Wise Average Project Size"
            subtitle="Average carpet area by sector"
            action={<SectorLimitSelect value={sizeFilter} onChange={setSizeFilter} />}
          >
            <BarChart
              data={[...avgProjectSize]}
              xKey="sector"
              height={300}
              bars={[{ key: 'avgSqft', label: 'Avg Size', color: CHART_COLORS.amber }]}
              showLegend={false}
              formatY={formatSqft}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="Sector Wise Fee Average"
            subtitle="Average Design, Consultancy, and Build fees by sector"
            action={<SectorLimitSelect value={feeFilter} onChange={setFeeFilter} />}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <ChartSeriesLegend
                items={[
                  { label: 'Design Fee', color: CHART_COLORS.teal },
                  { label: 'Consultancy Fee', color: CHART_COLORS.blue },
                  { label: 'Build Fee', color: CHART_COLORS.amber },
                ]}
              />
            </Box>
            <BarChart
              data={[...feeAverage]}
              xKey="sector"
              height={300}
              showLegend={false}
              bars={[
                { key: 'designFee', label: 'Design Fee', color: CHART_COLORS.teal },
                { key: 'consultancyFee', label: 'Consultancy Fee', color: CHART_COLORS.blue },
                { key: 'buildFee', label: 'Build Fee', color: CHART_COLORS.amber },
              ]}
              formatY={formatAxisAmount}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}

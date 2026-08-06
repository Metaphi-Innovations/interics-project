/**
 * Pitch Start Timeline — line chart with a vertical "Pitch Started" marker.
 * Local to Dashboard 1 so the shared LineChart API stays unchanged.
 */
import { Box, Typography } from '@mui/material'
import {
  CartesianGrid,
  Label,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import {
  PITCH_START_MARKER_MONTH,
  PITCH_START_TIMELINE,
  type PitchStartTimelinePoint,
} from './projectsOverviewData'

function PitchTimelineTooltip({
  active,
  payload,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as PitchStartTimelinePoint | undefined
  if (!point) return null

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
      }}
    >
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, display: 'block' }}>
        {point.projectName}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: 0.25 }}>
        Pitch Start Date: {point.pitchStartDate}
      </Typography>
    </Box>
  )
}

interface PitchStartTimelineChartProps {
  height?: number
}

export function PitchStartTimelineChart({ height = 300 }: PitchStartTimelineChartProps) {
  const ct = useChartTheme()
  const h = ct.isMobile ? Math.round(height * 0.75) : height

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RechartsLineChart
        data={[...PITCH_START_TIMELINE]}
        margin={{
          top: 28,
          right: ct.isMobile ? 12 : 20,
          left: ct.isMobile ? 4 : 8,
          bottom: 4,
        }}
      >
        <CartesianGrid
          stroke={ct.gridProps.stroke}
          strokeDasharray={ct.gridProps.strokeDasharray}
          strokeOpacity={ct.gridProps.strokeOpacity}
        />
        <XAxis
          dataKey="month"
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={{ stroke: ct.gridProps.stroke }}
        />
        <YAxis
          tick={ct.axisStyle}
          tickLine={false}
          axisLine={false}
          width={ct.isMobile ? 36 : 44}
          tickMargin={4}
          allowDecimals={false}
        />
        <Tooltip content={PitchTimelineTooltip} cursor={{ stroke: tokens.color.neutral[300] }} />
        <ReferenceLine
          x={PITCH_START_MARKER_MONTH}
          stroke={tokens.color.neutral[500]}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        >
          <Label
            value="Pitch Started"
            position="top"
            fill={tokens.color.neutral[600]}
            fontSize={11}
            fontWeight={600}
          />
        </ReferenceLine>
        <Line
          type="monotone"
          dataKey="projectCount"
          name="Projects"
          stroke={CHART_COLORS.teal}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.teal }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          animationDuration={800}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

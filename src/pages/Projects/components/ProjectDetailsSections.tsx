import { Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { Project } from '@/slices/projects/reducer'
import { WorkspaceSection } from '@/components/templates'
import {
  RecordDetailSectionTitle,
  getRecordDetailFlatSectionSx,
} from '@/pages/workspace/recordDetailTabUtils'
import { formatDate } from '@/utils/formatters'
import {
  PROJECT_DETAILS_GRID_SX,
  METADATA_BODY_SX,
  METADATA_PREWRAP_SX,
  formatBuildingFloor,
  formatExpectedDuration,
} from '../projectOverviewHelpers'
import { getProjectTypes } from '../projectTypes'
import { ProjectTypeTags } from './ProjectTypeTags'

function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography
        variant="overline"
        sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.6, display: 'block' }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: '2px', minWidth: 0, flex: 1 }}>{children}</Box>
    </Box>
  )
}

/** Plain-text preview for optional rich-text project detail fields. */
function formatOptionalHtml(value?: string | null): string {
  if (!value?.trim()) return '—'
  const plain = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return plain || '—'
}

interface ProjectDetailsSectionsProps {
  project: Project
}

export function ProjectDetailsSections({ project }: ProjectDetailsSectionsProps) {
  const theme = useTheme()

  return (
    <WorkspaceSection title="Project Details" noPadding>
      <Box sx={{ px: 2, py: 1.5 }}>
      <Stack gap={0}>
        <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: false })}>
          <RecordDetailSectionTitle>Project Profile</RecordDetailSectionTitle>
          <Box sx={PROJECT_DETAILS_GRID_SX}>
            <LabelValue label="Project Name">
              <Typography variant="body2" sx={{ ...METADATA_BODY_SX, fontWeight: 500 }}>
                {project.name}
              </Typography>
            </LabelValue>
            <LabelValue label="Project Code">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {project.projectCode}
              </Typography>
            </LabelValue>
            <LabelValue label="Location">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {formatBuildingFloor(project)}
              </Typography>
            </LabelValue>
            <LabelValue label="Start Date">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {formatDate(project.startDate)}
              </Typography>
            </LabelValue>
            <LabelValue label="Expected End Date">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {formatDate(project.expectedEndDate)}
              </Typography>
            </LabelValue>
            <LabelValue label="Sector">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {project.sector || '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="Project Scope">
              <ProjectTypeTags types={getProjectTypes(project)} />
            </LabelValue>
            <LabelValue label="Carpet Area">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {project.carpetArea ? `${project.carpetArea.toLocaleString()} sq ft` : '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="Headcount">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {project.headcount ?? '—'}
              </Typography>
            </LabelValue>
          </Box>
        </Box>

        <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: true })}>
          <RecordDetailSectionTitle>Area & Planning</RecordDetailSectionTitle>
          <Box sx={PROJECT_DETAILS_GRID_SX}>
            <LabelValue label="Workstations">
              <Typography variant="body2" sx={METADATA_PREWRAP_SX}>
                {formatOptionalHtml(project.workstations)}
              </Typography>
            </LabelValue>
            <LabelValue label="Cabins">
              <Typography variant="body2" sx={METADATA_PREWRAP_SX}>
                {formatOptionalHtml(project.cabins)}
              </Typography>
            </LabelValue>
            <LabelValue label="Meeting Rooms">
              <Typography variant="body2" sx={METADATA_PREWRAP_SX}>
                {formatOptionalHtml(project.meetingRooms)}
              </Typography>
            </LabelValue>
            <LabelValue label="Services">
              <Typography variant="body2" sx={METADATA_PREWRAP_SX}>
                {formatOptionalHtml(project.services)}
              </Typography>
            </LabelValue>
            <LabelValue label="Support Function">
              <Typography variant="body2" sx={METADATA_PREWRAP_SX}>
                {formatOptionalHtml(project.supportFunction)}
              </Typography>
            </LabelValue>
            <LabelValue label="Expected Duration">
              <Typography variant="body2" sx={METADATA_BODY_SX}>
                {formatExpectedDuration(project.startDate, project.expectedEndDate)}
              </Typography>
            </LabelValue>
          </Box>
        </Box>
      </Stack>
      </Box>
    </WorkspaceSection>
  )
}

import type { ReactNode } from 'react'
import { Box, Stack, Typography, Chip as MuiChip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import dayjs from 'dayjs'
import type { ContactInfo, Project } from '@/slices/projects/reducer'
import { tokens } from '@/design-system/tokens'

export function getProgressStyle(
  label: string,
  palette: Theme['palette'],
): { bg: string; color: string } {
  const lower = label.toLowerCase()
  if (lower.includes('risk') || lower.includes('cancel'))
    return { bg: alpha(palette.error.main, 0.12), color: palette.error.main }
  if (lower.includes('complete'))
    return { bg: alpha(palette.info.main, 0.12), color: palette.info.main }
  if (lower.includes('ongoing') || lower.includes('execution'))
    return { bg: alpha(palette.info.main, 0.12), color: palette.info.main }
  if (lower.includes('quotation') || lower.includes('pitch'))
    return { bg: alpha(palette.warning.main, 0.12), color: palette.warning.main }
  if (lower.includes('archive'))
    return { bg: palette.action.hover as string, color: palette.text.secondary }
  return { bg: palette.action.hover as string, color: palette.text.secondary }
}

export const PROJECT_DETAILS_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
  },
  columnGap: { xs: '16px', md: '28px' },
  rowGap: { xs: '16px', md: '22px' },
  alignItems: 'stretch',
  alignContent: 'start',
} as const

export const METADATA_BODY_SX = {
  fontSize: 13,
  wordBreak: 'break-word' as const,
} as const

export const METADATA_PREWRAP_SX = {
  ...METADATA_BODY_SX,
  whiteSpace: 'pre-wrap' as const,
} as const

export function formatBuildingFloor(project: Pick<Project, 'building' | 'floor' | 'location'>): string {
  const parts = [project.building, project.floor].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  return project.location || '—'
}

export function parseProjectScopeTags(scope?: string): string[] {
  if (!scope?.trim()) return []
  return scope
    .split(/[,;|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatExpectedDuration(
  startDate: string | null,
  expectedEndDate: string | null,
): string {
  if (!startDate || !expectedEndDate) return '—'
  const start = dayjs(startDate)
  const end = dayjs(expectedEndDate)
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return '—'
  const months = end.diff(start, 'month')
  if (months >= 1) return `~${months} month${months === 1 ? '' : 's'}`
  const days = end.diff(start, 'day')
  return `~${days} day${days === 1 ? '' : 's'}`
}

export function countContacts(members?: ContactInfo[]): number {
  return members?.length ?? 0
}

export function countExternalConsultants(consultants?: Project['externalConsultants']): number {
  if (!consultants) return 0
  return [consultants.hvac, consultants.lighting, consultants.approvals].filter(Boolean).length
}

export function countBuildVendors(vendors?: Project['buildVendors']): number {
  if (!vendors) return 0
  return [vendors.civilInterior, vendors.electrical, vendors.fireFighting, vendors.av].filter(
    Boolean,
  ).length
}

export interface ClientTeamDetailFields {
  clientName: string
  designation: string
  email: string
  phone: string
}

function contactField(value?: string | null): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '—'
}

/** Primary client-team contact for Project Details (first entry). */
export function getClientTeamDetailFields(project: Project): ClientTeamDetailFields {
  const primary = project.clientTeam?.[0]
  const phone = primary?.phone ?? primary?.contact
  return {
    clientName: contactField(primary?.name),
    designation: contactField(primary?.designation),
    email: contactField(primary?.email),
    phone: contactField(phone),
  }
}

export function formatSqftRate(value: number | null | undefined): string {
  if (value == null) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function formatContactTeamDetail(members?: ContactInfo[]): ReactNode {
  if (!members?.length) {
    return (
      <Typography variant="body2" sx={{ fontSize: 13 }}>
        —
      </Typography>
    )
  }

  return (
    <Stack gap={1.5}>
      {members.map((member, idx) => (
        <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          {member.company && (
            <Typography
              variant="caption"
              sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.3, wordBreak: 'break-word' }}
            >
              {member.company}
            </Typography>
          )}
          <Typography variant="body2" sx={{ ...METADATA_PREWRAP_SX, fontWeight: 500 }}>
            {member.name || '—'}
          </Typography>
          {member.designation != null && member.designation !== '' && (
            <Typography
              variant="caption"
              sx={{ fontSize: 11, color: 'text.secondary', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {member.designation}
            </Typography>
          )}
          {member.email != null && member.email !== '' ? (
            <Typography
              variant="caption"
              sx={{ fontSize: 11, color: 'primary.main', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {member.email}
            </Typography>
          ) : null}
          {(member.phone != null && member.phone !== '') ||
          (member.contact != null && member.contact !== '') ? (
            <Typography
              variant="caption"
              sx={{ fontSize: 11, color: 'text.secondary', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {member.phone || member.contact}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Stack>
  )
}

export function formatExternalConsultantsDetail(
  consultants?: Project['externalConsultants'],
): ReactNode {
  if (!consultants) {
    return (
      <Typography variant="body2" sx={METADATA_BODY_SX}>
        —
      </Typography>
    )
  }
  const lines: string[] = []
  if (consultants.hvac) lines.push(`HVAC: ${consultants.hvac}`)
  if (consultants.lighting) lines.push(`Lighting: ${consultants.lighting}`)
  if (consultants.approvals) lines.push(`Approvals: ${consultants.approvals}`)
  if (!lines.length) {
    return (
      <Typography variant="body2" sx={METADATA_BODY_SX}>
        —
      </Typography>
    )
  }
  return (
    <Typography variant="body2" sx={METADATA_PREWRAP_SX}>
      {lines.join('\n')}
    </Typography>
  )
}

export function formatBuildVendorsDetail(vendors?: Project['buildVendors']): ReactNode {
  if (!vendors) {
    return (
      <Typography variant="body2" sx={METADATA_BODY_SX}>
        —
      </Typography>
    )
  }
  const lines: string[] = []
  if (vendors.civilInterior) lines.push(`Civil & Interior: ${vendors.civilInterior}`)
  if (vendors.electrical) lines.push(`Electrical: ${vendors.electrical}`)
  if (vendors.fireFighting) lines.push(`Fire Fighting: ${vendors.fireFighting}`)
  if (vendors.av) lines.push(`AV: ${vendors.av}`)
  if (!lines.length) {
    return (
      <Typography variant="body2" sx={METADATA_BODY_SX}>
        —
      </Typography>
    )
  }
  return (
    <Typography variant="body2" sx={METADATA_PREWRAP_SX}>
      {lines.join('\n')}
    </Typography>
  )
}

export function ProjectScopeTags({ scope }: { scope?: string }) {
  const tags = parseProjectScopeTags(scope)
  if (!tags.length) {
    return (
      <Typography variant="body2" sx={METADATA_BODY_SX}>
        —
      </Typography>
    )
  }
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
      {tags.map((tag) => (
        <MuiChip
          key={tag}
          label={tag}
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: 10,
            borderRadius: '4px',
            color: tokens.color.neutral[600],
            borderColor: tokens.color.neutral[300],
            '& .MuiChip-label': { px: '6px' },
          }}
        />
      ))}
    </Stack>
  )
}

export type TeamDetailPanel =
  | 'projectTeam'
  | 'clientTeam'
  | 'designTeam'
  | 'externalConsultants'
  | 'buildVendors'

export function teamPanelTitle(panel: TeamDetailPanel): string {
  switch (panel) {
    case 'projectTeam':
      return 'Project Team'
    case 'clientTeam':
      return 'Client Team'
    case 'designTeam':
      return 'Design Team'
    case 'externalConsultants':
      return 'External Consultants'
    case 'buildVendors':
      return 'Build Vendors'
  }
}

export function teamPanelContent(project: Project, panel: TeamDetailPanel): ReactNode {
  switch (panel) {
    case 'projectTeam':
      return formatContactTeamDetail(project.projectTeam)
    case 'clientTeam':
      return formatContactTeamDetail(project.clientTeam)
    case 'designTeam':
      return formatContactTeamDetail(project.designTeam)
    case 'externalConsultants':
      return formatExternalConsultantsDetail(project.externalConsultants)
    case 'buildVendors':
      return formatBuildVendorsDetail(project.buildVendors)
  }
}

export function teamPanelCount(project: Project, panel: TeamDetailPanel): number {
  switch (panel) {
    case 'projectTeam':
      return countContacts(project.projectTeam)
    case 'clientTeam':
      return countContacts(project.clientTeam)
    case 'designTeam':
      return countContacts(project.designTeam)
    case 'externalConsultants':
      return countExternalConsultants(project.externalConsultants)
    case 'buildVendors':
      return countBuildVendors(project.buildVendors)
  }
}

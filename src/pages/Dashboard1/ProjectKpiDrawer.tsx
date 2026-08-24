/**
 * Dashboard 1 — Projects KPI detail drawer.
 * Same right-side listing-table pattern as the Revenue KPI drawer.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { X } from 'lucide-react'
import { SearchInput, StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatDate } from '@/utils/formatters'
import type { Project } from '@/slices/projects/reducer'
import type { ProjectOverviewKpi } from './projectsOverviewData'

export type ClickableProjectKpiId =
  | 'active'
  | 'completed'
  | 'pipeline'
  | 'cancelled'
  | 'archived'

export const CLICKABLE_PROJECT_KPI_IDS: Set<string> = new Set<string>([
  'active',
  'completed',
  'pipeline',
  'cancelled',
  'archived',
])

const KPI_STATUS: Record<ClickableProjectKpiId, Project['status']> = {
  active: 'Live',
  completed: 'Completed',
  pipeline: 'Pitch',
  cancelled: 'Cancelled',
  archived: 'Archived',
}

interface DrawerColumn {
  key: string
  label: string
  format?: 'status' | 'date'
}

const STATUS_TYPE_BY_LABEL: Record<string, StatusType> = {
  Live: 'live',
  Pitch: 'pitch',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Archived: 'archived',
  'Execution Ongoing': 'execution_ongoing',
  'Quotation Ready': 'quotation_ready',
  'Planning In Progress': 'planning_in_progress',
}

function projectStage(project: Project): string {
  const progress = project.progress?.trim()
  if (progress) return progress
  return project.status
}

function columnsForKpi(
  kpiId: ClickableProjectKpiId,
  includeStartDate: boolean,
): DrawerColumn[] {
  const base: DrawerColumn[] = [
    { key: 'name', label: 'Project Name' },
    { key: 'client', label: 'Client' },
    { key: 'manager', label: 'Project Manager' },
  ]

  if (kpiId === 'active') {
    const cols: DrawerColumn[] = [
      ...base,
      { key: 'stage', label: 'Project Stage', format: 'status' },
    ]
    if (includeStartDate) cols.push({ key: 'startDate', label: 'Project Start Date', format: 'date' })
    return cols
  }

  if (kpiId === 'pipeline') {
    return [...base, { key: 'stage', label: 'Stage', format: 'status' }]
  }

  return base
}

function toRow(project: Project): Record<string, string> {
  return {
    id: project.id,
    name: project.name,
    client: project.customerName || '—',
    manager: project.projectManager || '—',
    stage: projectStage(project),
    startDate: project.startDate ? formatDate(project.startDate) : '',
  }
}

function renderCell(value: string, format?: DrawerColumn['format']) {
  if (format === 'status' && value) {
    const status = STATUS_TYPE_BY_LABEL[value] ?? 'in_progress'
    return <StatusBadge status={status} label={value} size="small" />
  }
  return value || '—'
}

export interface ProjectKpiDrawerProps {
  open: boolean
  onClose: () => void
  kpi: ProjectOverviewKpi | null
  projects: Project[]
}

export function ProjectKpiDrawer({ open, onClose, kpi, projects }: ProjectKpiDrawerProps) {
  const [search, setSearch] = useState('')

  const kpiId = kpi && CLICKABLE_PROJECT_KPI_IDS.has(kpi.id)
    ? (kpi.id as ClickableProjectKpiId)
    : null

  useEffect(() => {
    setSearch('')
  }, [kpi?.id])

  const sourceRows = useMemo(() => {
    if (!kpiId) return []
    const status = KPI_STATUS[kpiId]
    return projects.filter((project) => project.status === status).map(toRow)
  }, [kpiId, projects])

  const includeStartDate = useMemo(
    () => kpiId === 'active' && sourceRows.some((row) => Boolean(row.startDate)),
    [kpiId, sourceRows],
  )

  const columns = kpiId ? columnsForKpi(kpiId, includeStartDate) : []

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sourceRows
    return sourceRows.filter((row) =>
      columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(query)),
    )
  }, [columns, search, sourceRows])

  if (!kpi || !kpiId) return null

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.18)' } },
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '78%', md: 880 },
          maxWidth: 960,
          minWidth: { sm: 640 },
          boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: 3,
          pt: 2.5,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ pr: 2 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}>
            {kpi.title}
          </Typography>
          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.4,
              lineHeight: 1.2,
              mt: 0.5,
            }}
          >
            {kpi.value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
            {kpi.subtitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ mt: -0.5 }}>
          <X size={18} />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          px: 3,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <SearchInput
          size="sm"
          placeholder="Search..."
          value={search}
          onChange={setSearch}
          debounce={200}
          sx={{ flex: '1 1 180px', minWidth: 160, maxWidth: 280 }}
        />
      </Box>

      <Box sx={{ px: 3, pb: 3, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <TableContainer
          sx={{
            overflowX: 'auto',
            overflowY: 'auto',
            minHeight: 0,
            border: `1px solid ${tokens.color.neutral[200]}`,
            borderRadius: 1,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              width: '100%',
              tableLayout: 'auto',
              '& .MuiTableCell-head': {
                fontSize: 12,
                fontWeight: 600,
                color: 'text.secondary',
                bgcolor: tokens.color.neutral[50],
                borderBottom: `1px solid ${tokens.color.neutral[200]}`,
                py: 1,
                px: 1.5,
                whiteSpace: 'nowrap',
                lineHeight: 1.35,
              },
              '& .MuiTableCell-body': {
                fontSize: 13,
                py: 1,
                px: 1.5,
                borderBottom: `1px solid ${tokens.color.neutral[100]}`,
                whiteSpace: 'nowrap',
                color: 'text.primary',
              },
            }}
          >
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id} hover={false}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {renderCell(row[col.key], col.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No projects match the current filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Drawer>
  )
}

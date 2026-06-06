import { useState, useEffect, useRef, useMemo, useCallback, type MouseEvent } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { ArrowUpward, ArrowDownward, PersonOutline } from '@mui/icons-material'
import { Eye } from 'lucide-react'
import { FolderKanban, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import type { Project } from '@/slices/projects/reducer'
import { ListingTemplate } from '@/components/templates/ListingTemplate'
import { StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatProjectSite } from '@/utils/projectSite'
import { getProjectAssignedMembers, projectHasAssignedMembers } from '@/utils/projectAssignedTeam'
import { getInitials, getAvatarColor, toSlug } from '@/utils/formatters'

export interface TeamAssignmentRow {
  id: string
  userId: string
  memberName: string
  roleLabel: string
  projectId: string
  projectName: string
  projectCode: string
  projectStatus: Project['status']
  projectLead: string
  siteLine: string
}

type TeamVisibleColumns = {
  site: boolean
  projectLead: boolean
}

/** Horizontal inset for table inside listing card (matches listing pagination). */
const TEAM_TABLE_INSET_X = 2

const TEAM_CELL_PAD_X = '16px'

const TEAM_ACTION_WIDTH_PX = 56

const TABLE_HEADER_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: TEAM_CELL_PAD_X,
    paddingRight: TEAM_CELL_PAD_X,
  },
}

const TABLE_BODY_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: TEAM_CELL_PAD_X,
    paddingRight: TEAM_CELL_PAD_X,
  },
}

const TABLE_HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'middle' as const,
  lineHeight: 1.35,
  boxSizing: 'border-box' as const,
  ...TABLE_HEADER_PADDING,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  verticalAlign: 'middle' as const,
  boxSizing: 'border-box' as const,
  ...TABLE_BODY_PADDING,
}

const TABLE_HEADER_ACTION_SX = {
  ...TABLE_HEADER_CELL_SX,
  width: TEAM_ACTION_WIDTH_PX,
  minWidth: TEAM_ACTION_WIDTH_PX,
  maxWidth: TEAM_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
}

const TABLE_CELL_ACTION_SX = {
  ...TABLE_CELL_SX,
  width: TEAM_ACTION_WIDTH_PX,
  minWidth: TEAM_ACTION_WIDTH_PX,
  maxWidth: TEAM_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
}

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

function teamColCount(visible: TeamVisibleColumns): number {
  return 3 + (visible.site ? 1 : 0) + (visible.projectLead ? 1 : 0) + 2
}

function teamDataColCount(visible: TeamVisibleColumns): number {
  return Math.max(teamColCount(visible) - 1, 1)
}

function teamDataColWidth(visible: TeamVisibleColumns): string {
  return `calc((100% - ${TEAM_ACTION_WIDTH_PX}px) / ${teamDataColCount(visible)})`
}

function flattenProjectTeam(projects: Project[]): TeamAssignmentRow[] {
  const rows: TeamAssignmentRow[] = []
  for (const project of projects) {
    const siteLine = formatProjectSite(project)
    const members = getProjectAssignedMembers(project)
    for (const member of members) {
      rows.push({
        id: `${project.id}-${member.userId}`,
        userId: member.userId,
        memberName: member.name,
        roleLabel: member.roleLabel ?? 'Team Member',
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        projectStatus: project.status,
        projectLead: project.projectManager,
        siteLine,
      })
    }
  }
  return rows
}

function MemberAvatar({ name }: { name: string }) {
  const colors = getAvatarColor(name)
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        bgcolor: colors.bg,
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </Box>
  )
}

interface SortHeaderProps {
  field: string
  label: string
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  sx?: object
}

function SortHeader({ field, label, sortField, sortDirection, onSort, sx }: SortHeaderProps) {
  const isActive = sortField === field
  return (
    <TableCell
      sx={{
        ...TABLE_HEADER_CELL_SX,
        cursor: 'pointer',
        userSelect: 'none',
        fontWeight: isActive ? 700 : 600,
        color: isActive ? 'primary.main' : 'text.secondary',
        '&:hover': { color: 'primary.main' },
        ...sx,
      }}
      onClick={() => onSort(field)}
    >
      <Stack direction="row" alignItems="center" gap="2px" component="span">
        {label}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUpward sx={{ fontSize: 12 }} />
          ) : (
            <ArrowDownward sx={{ fontSize: 12 }} />
          )
        ) : (
          <ArrowUpward sx={{ fontSize: 12, opacity: 0.2 }} />
        )}
      </Stack>
    </TableCell>
  )
}

function RowActions({
  onViewProject,
}: {
  onViewProject: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  function open(e: MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }

  function close() {
    setAnchor(null)
  }

  return (
    <>
      <IconButton size="small" onClick={open} aria-label="Row actions" sx={{ p: 0.5 }}>
        <MoreVertIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} onClick={(e) => e.stopPropagation()}>
        <MenuItem
          dense
          onClick={() => {
            onViewProject()
            close()
          }}
          sx={{ fontSize: 12, gap: 1 }}
        >
          <Eye size={14} />
          View Project
        </MenuItem>
      </Menu>
    </>
  )
}

interface AddedTeamTableProps {
  rows: TeamAssignmentRow[]
  loading: boolean
  projectCount: number
  loadError: string | null
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  visibleColumns: TeamVisibleColumns
  onSort: (field: string) => void
  onViewProject: (row: TeamAssignmentRow) => void
}

function AddedTeamTable({
  rows,
  loading,
  projectCount,
  loadError,
  sortField,
  sortDirection,
  visibleColumns,
  onSort,
  onViewProject,
}: AddedTeamTableProps) {
  const theme = useTheme()
  const dataColWidth = teamDataColWidth(visibleColumns)
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const headSx = { ...TABLE_HEADER_CELL_SX, width: dataColWidth }
  const cellSx = { ...TABLE_CELL_SX, width: dataColWidth }
  const actionHeadSx = TABLE_HEADER_ACTION_SX
  const cellActionSx = TABLE_CELL_ACTION_SX

  if (loading) {
    return (
      <Box sx={{ px: TEAM_TABLE_INSET_X, py: 2 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    )
  }

  if (rows.length === 0) {
    const emptyMessage = loadError
      ? `Could not load projects: ${loadError}`
      : projectCount === 0
        ? 'No projects loaded. Check that the API is available and refresh the page.'
        : 'No team assignments found for the current filters.'
    return (
      <Box sx={{ py: 8, textAlign: 'center', px: TEAM_TABLE_INSET_X }}>
        <Box sx={{ color: tokens.color.neutral[300], mb: 1, display: 'flex', justifyContent: 'center' }}>
          <UserPlus size={40} strokeWidth={1.5} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ px: TEAM_TABLE_INSET_X }}>
      <TableContainer sx={{ overflow: 'visible', width: '100%' }}>
        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
          <colgroup>
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            {visibleColumns.site && <col style={{ width: dataColWidth }} />}
            {visibleColumns.projectLead && <col style={{ width: dataColWidth }} />}
            <col style={{ width: dataColWidth }} />
            <col style={{ width: `${TEAM_ACTION_WIDTH_PX}px` }} />
          </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <SortHeader
              field="memberName"
              label="Team Member"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              sx={headSx}
            />
            <TableCell sx={headSx}>Role</TableCell>
            <SortHeader
              field="projectName"
              label="Project"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              sx={headSx}
            />
            {visibleColumns.site && <TableCell sx={headSx}>Site</TableCell>}
            {visibleColumns.projectLead && <TableCell sx={headSx}>Project Lead</TableCell>}
            <TableCell sx={headSx}>Status</TableCell>
            <TableCell sx={actionHeadSx}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              hover
              onClick={() => onViewProject(row)}
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: hoverBg }, '&:last-child td': { border: 0 } }}
            >
              <TableCell sx={cellSx}>
                <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
                  <MemberAvatar name={row.memberName} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, lineHeight: 1.35, wordBreak: 'break-word' }}>
                    {row.memberName}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell sx={cellSx}>
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', wordBreak: 'break-word' }}>
                  {row.roleLabel}
                </Typography>
              </TableCell>
              <TableCell sx={cellSx}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, lineHeight: 1.35, wordBreak: 'break-word' }}>
                    {row.projectName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    {row.projectCode}
                  </Typography>
                </Box>
              </TableCell>
              {visibleColumns.site && (
                <TableCell sx={cellSx}>
                  <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', wordBreak: 'break-word' }}>
                    {row.siteLine || '—'}
                  </Typography>
                </TableCell>
              )}
              {visibleColumns.projectLead && (
                <TableCell sx={cellSx}>
                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
                    <PersonOutline sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontSize: 12, wordBreak: 'break-word' }}>
                      {row.projectLead}
                    </Typography>
                  </Stack>
                </TableCell>
              )}
              <TableCell sx={cellSx}>
                <StatusBadge
                  status={row.projectStatus.toLowerCase().replace(/\s+/g, '_') as StatusType}
                />
              </TableCell>
              <TableCell sx={cellActionSx} onClick={(e) => e.stopPropagation()}>
                <Box sx={CENTER_CELL_CONTENT_SX}>
                  <RowActions onViewProject={() => onViewProject(row)} />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default function AddedTeamPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { items, loading, error } = useAppSelector((s) => s.projects)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [sortField, setSortField] = useState<string | null>('memberName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useState<TeamVisibleColumns>({
    site: true,
    projectLead: true,
  })
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    dispatch(fetchProjects({ page: 1, pageSize: 100 }))
  }, [dispatch])

  const allRows = useMemo(() => flattenProjectTeam(items), [items])

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of items) {
      seen.set(p.id, p.name)
    }
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }))
  }, [items])

  const filteredRows = useMemo(() => {
    let rows = allRows
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) =>
          r.memberName.toLowerCase().includes(q) ||
          r.projectName.toLowerCase().includes(q) ||
          r.projectCode.toLowerCase().includes(q) ||
          r.roleLabel.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      rows = rows.filter((r) => r.projectStatus === statusFilter)
    }
    if (projectFilter) {
      rows = rows.filter((r) => r.projectId === projectFilter)
    }
    return rows
  }, [allRows, search, statusFilter, projectFilter])

  const sortedRows = useMemo(() => {
    if (!sortField) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const field = sortField as keyof TeamAssignmentRow
      const aStr = String(a[field] ?? '').toLowerCase()
      const bStr = String(b[field] ?? '').toLowerCase()
      const cmp = aStr.localeCompare(bStr)
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filteredRows, sortField, sortDirection])

  const uniqueMembers = useMemo(() => {
    const set = new Set(allRows.map((r) => r.userId))
    return set.size
  }, [allRows])

  const statCards = [
    {
      label: 'ASSIGNMENTS',
      value: allRows.length,
      variant: 'default' as const,
      icon: <UserPlus size={24} strokeWidth={1.75} />,
    },
    {
      label: 'TEAM MEMBERS',
      value: uniqueMembers,
      variant: 'info' as const,
      icon: <PersonOutline sx={{ fontSize: 24 }} />,
    },
    {
      label: 'PROJECTS WITH TEAM',
      value: items.filter((p) => projectHasAssignedMembers(p)).length,
      variant: 'success' as const,
      icon: <FolderKanban size={24} strokeWidth={1.75} />,
    },
  ]

  const filterConfig = [
    {
      field: 'status',
      label: 'Project Status',
      type: 'select' as const,
      options: [
        { label: 'All', value: '' },
        { label: 'Pitch', value: 'Pitch' },
        { label: 'Live', value: 'Live' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Cancelled', value: 'Cancelled' },
        { label: 'Archived', value: 'Archived' },
      ],
    },
    {
      field: 'projectId',
      label: 'Project',
      type: 'select' as const,
      options: [{ label: 'All', value: '' }, ...projectOptions],
    },
  ]

  const columnsConfig = useMemo(
    () => [
      { field: 'site', label: 'Site', visible: visibleColumns.site },
      { field: 'projectLead', label: 'Project Lead', visible: visibleColumns.projectLead },
    ],
    [visibleColumns],
  )

  const handleSearch = useCallback((value: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(value), 300)
  }, [])

  function handleFilterChange(vals: Record<string, unknown>) {
    setStatusFilter((vals.status as string) ?? '')
    setProjectFilter((vals.projectId as string) ?? '')
  }

  function handleFilterReset() {
    setStatusFilter('')
    setProjectFilter('')
    setSearch('')
  }

  function handleSort(field: string) {
    const newDirection =
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)
  }

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    const key = field as keyof TeamVisibleColumns
    if (key in visibleColumns) {
      setVisibleColumns((prev) => ({ ...prev, [key]: visible }))
    }
  }

  function handleViewProject(row: TeamAssignmentRow) {
    navigate(`/projects/${toSlug(row.projectName)}`)
  }

  const activeFilterCount = [statusFilter, projectFilter].filter(Boolean).length

  return (
    <ListingTemplate
      icon={<UserPlus size={20} strokeWidth={1.75} />}
      title="Added Team"
      subtitle="Team members assigned to projects"
      statCards={statCards}
      searchPlaceholder="Search team or project…"
      onSearchChange={handleSearch}
      filterConfig={filterConfig}
      activeFilters={{ status: statusFilter, projectId: projectFilter }}
      onFilterChange={handleFilterChange}
      onFilterReset={handleFilterReset}
      filterCount={activeFilterCount}
      columns={columnsConfig}
      onColumnVisibilityChange={handleColumnVisibilityChange}
      showViewToggle={false}
      clipCardContent={false}
    >
      <AddedTeamTable
        rows={sortedRows}
        loading={loading}
        projectCount={items.length}
        loadError={error}
        sortField={sortField}
        sortDirection={sortDirection}
        visibleColumns={visibleColumns}
        onSort={handleSort}
        onViewProject={handleViewProject}
      />
    </ListingTemplate>
  )
}

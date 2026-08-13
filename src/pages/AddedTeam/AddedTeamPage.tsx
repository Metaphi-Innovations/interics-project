import { useState, useEffect, useCallback, type MouseEvent } from 'react'
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
import type { Project } from '@/slices/projects/reducer'
import { ListingTemplate } from '@/components/templates/ListingTemplate'
import { tokens } from '@/design-system/tokens'
import { getInitials, getAvatarColor } from '@/utils/formatters'
import { teamsApi } from '@/api/teamsApi'

export interface TeamAssignmentRow {
  id: string
  userId: string
  memberName: string
  projectCount: number
  roleLabel: string
  projectId: string
  projectName: string
  projectCode: string
  projectStatus: Project['status']
}

type TeamMemberApiRow = {
  id?: string
  userId?: string
  teamMember?: string
  memberName?: string
  projectCount?: number
  role?: string
  roleLabel?: string
  projectId?: string
  project?: string
  projectName?: string
  projectCode?: string
  projectStatus?: string
}

function mapApiTeamRow(raw: TeamMemberApiRow): TeamAssignmentRow | null {
  const userId = raw.userId?.trim()
  const projectId = raw.projectId?.trim()
  if (!userId || !projectId) return null

  const statusRaw = String(raw.projectStatus ?? '').toUpperCase()
  const projectStatus: Project['status'] =
    statusRaw === 'LIVE'
      ? 'Live'
      : statusRaw === 'PITCH'
        ? 'Pitch'
        : statusRaw === 'COMPLETED'
          ? 'Completed'
          : statusRaw === 'CANCELLED'
            ? 'Cancelled'
            : statusRaw === 'ARCHIVED'
              ? 'Archived'
              : 'Pitch'

  return {
    id: raw.id?.trim() || `${projectId}-${userId}`,
    userId,
    memberName: (raw.memberName ?? raw.teamMember ?? '').trim() || 'Unknown',
    projectCount: Number(raw.projectCount ?? 1) || 1,
    roleLabel: (raw.roleLabel ?? raw.role ?? 'Team Member').trim() || 'Team Member',
    projectId,
    projectName: (raw.projectName ?? raw.project ?? '').trim() || 'Untitled project',
    projectCode: (raw.projectCode ?? '').trim(),
    projectStatus,
  }
}

const TEAM_DATA_COLUMN_COUNT = 4

/** Horizontal padding aligned with listing card toolbar (`p: 10px 14px`). */
const LISTING_EDGE_PAD = '14px'

const TEAM_CELL_PAD_X = LISTING_EDGE_PAD

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

const TABLE_HEADER_ACTION_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: 0,
    paddingRight: LISTING_EDGE_PAD,
  },
}

const TABLE_BODY_ACTION_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: 0,
    paddingRight: LISTING_EDGE_PAD,
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
  verticalAlign: 'middle' as const,
  ...TABLE_HEADER_ACTION_PADDING,
}

const TABLE_CELL_ACTION_SX = {
  ...TABLE_CELL_SX,
  width: TEAM_ACTION_WIDTH_PX,
  minWidth: TEAM_ACTION_WIDTH_PX,
  maxWidth: TEAM_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  ...TABLE_BODY_ACTION_PADDING,
}

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

function teamDataColWidth(): string {
  return `calc((100% - ${TEAM_ACTION_WIDTH_PX}px) / ${TEAM_DATA_COLUMN_COUNT})`
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
  onViewDetails,
}: {
  onViewDetails: () => void
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
            onViewDetails()
            close()
          }}
          sx={{ fontSize: 12, gap: 1 }}
        >
          <Eye size={14} />
          View details
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
  onSort: (field: string) => void
  onViewDetails: (userId: string) => void
}

function AddedTeamTable({
  rows,
  loading,
  projectCount,
  loadError,
  sortField,
  sortDirection,
  onSort,
  onViewDetails,
}: AddedTeamTableProps) {
  const theme = useTheme()
  const dataColWidth = teamDataColWidth()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const headSx = { ...TABLE_HEADER_CELL_SX, width: dataColWidth }
  const cellSx = { ...TABLE_CELL_SX, width: dataColWidth }
  const actionHeadSx = TABLE_HEADER_ACTION_SX
  const cellActionSx = TABLE_CELL_ACTION_SX

  if (loading) {
    return (
      <Box sx={{ py: 2, px: LISTING_EDGE_PAD }}>
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
      <Box sx={{ py: 8, textAlign: 'center', px: LISTING_EDGE_PAD }}>
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
    <TableContainer sx={{ overflow: 'visible', width: '100%' }}>
      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
          <colgroup>
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
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
            <SortHeader
              field="projectCount"
              label="No. of Project"
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
            <TableCell sx={actionHeadSx}>
              <Box sx={CENTER_CELL_CONTENT_SX}>Action</Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              hover
              onClick={() => onViewDetails(row.userId)}
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
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                  {row.projectCount}
                </Typography>
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
              <TableCell sx={cellActionSx} onClick={(e) => e.stopPropagation()}>
                <Box sx={CENTER_CELL_CONTENT_SX}>
                  <RowActions onViewDetails={() => onViewDetails(row.userId)} />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
    </TableContainer>
  )
}

export default function AddedTeamPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<TeamAssignmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [sortField, setSortField] = useState<string | null>('memberName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState({ assignments: 0, teamMembers: 0, projectsWithTeam: 0 })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void teamsApi.getSummary().then((s) => {
      if (s) setSummary(s)
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const res = await teamsApi.getMembers({
          page: page + 1,
          limit: pageSize,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          projectId: projectFilter || undefined,
          sortBy:
            sortField === 'memberName'
              ? 'teamMember'
              : sortField === 'roleLabel'
                ? 'role'
                : sortField === 'projectName'
                  ? 'project'
                  : sortField === 'projectCount'
                    ? 'projectCount'
                    : undefined,
          sortOrder: sortDirection,
        })
        if (cancelled) return
        const payload = res && typeof res === 'object' && 'items' in (res as object)
          ? res
          : { items: Array.isArray(res) ? res : [], meta: { total: 0 } }
        const rawItems = Array.isArray(payload?.items) ? payload.items : []
        const rows = rawItems
          .map((item) => mapApiTeamRow(item as TeamMemberApiRow))
          .filter((row): row is TeamAssignmentRow => row != null)
        setItems(rows)
        setTotal(payload?.meta?.total ?? rows.length)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load team members')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [page, pageSize, debouncedSearch, statusFilter, projectFilter, sortField, sortDirection])

  const [filterOptions, setFilterOptions] = useState<{
    projects: { value: string; label: string }[]
    statuses: { value: string; label: string }[]
  }>({ projects: [], statuses: [] })

  useEffect(() => {
    void teamsApi.getFilters().then((f) => {
      if (f) setFilterOptions({ projects: f.projects ?? [], statuses: f.statuses ?? [] })
    }).catch(() => undefined)
  }, [])

  const projectOptions = filterOptions.projects
  const sortedRows = items

  const statCards = [
    {
      label: 'ASSIGNMENTS',
      value: summary.assignments,
      variant: 'default' as const,
      icon: <UserPlus size={24} strokeWidth={1.75} />,
    },
    {
      label: 'TEAM MEMBERS',
      value: summary.teamMembers,
      variant: 'info' as const,
      icon: <PersonOutline sx={{ fontSize: 24 }} />,
    },
    {
      label: 'PROJECTS WITH TEAM',
      value: summary.projectsWithTeam,
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
        { label: 'Pitch', value: 'PITCH' },
        { label: 'Live', value: 'LIVE' },
      ],
    },
    {
      field: 'projectId',
      label: 'Project',
      type: 'select' as const,
      options: [{ label: 'All', value: '' }, ...projectOptions],
    },
  ]

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(0)
  }, [])

  function handleFilterChange(vals: Record<string, unknown>) {
    setStatusFilter((vals.status as string) ?? '')
    setProjectFilter((vals.projectId as string) ?? '')
    setPage(0)
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

  function handleViewDetails(userId: string) {
    navigate(`/added-team/${userId}`)
  }

  const activeFilterCount = [statusFilter, projectFilter].filter(Boolean).length

  return (
    <ListingTemplate
      icon={<UserPlus size={20} strokeWidth={1.75} />}
      title="Team"
      subtitle="Team members assigned to projects"
      statCards={statCards}
      searchPlaceholder="Search team or project…"
      onSearchChange={handleSearch}
      filterConfig={filterConfig}
      activeFilters={{ status: statusFilter, projectId: projectFilter }}
      onFilterChange={handleFilterChange}
      onFilterReset={handleFilterReset}
      filterCount={activeFilterCount}
      showViewToggle={false}
      clipCardContent={false}
      pageSize={pageSize}
      onPageSizeChange={(s) => {
        setPageSize(s)
        setPage(0)
      }}
      page={page}
      totalCount={total}
      onPageChange={setPage}
    >
      <AddedTeamTable
        rows={sortedRows}
        loading={loading}
        projectCount={new Set(items.map((p) => p.projectId)).size}
        loadError={error}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onViewDetails={handleViewDetails}
      />
    </ListingTemplate>
  )
}

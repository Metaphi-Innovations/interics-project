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
import { tokens } from '@/design-system/tokens'
import { getProjectAssignedMembers, projectHasAssignedMembers } from '@/utils/projectAssignedTeam'
import { getInitials, getAvatarColor } from '@/utils/formatters'

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

function flattenProjectTeam(projects: Project[]): TeamAssignmentRow[] {
  const rows: TeamAssignmentRow[] = []
  for (const project of projects) {
    const members = getProjectAssignedMembers(project)
    for (const member of members) {
      rows.push({
        id: `${project.id}-${member.userId}`,
        userId: member.userId,
        memberName: member.name,
        projectCount: 0,
        roleLabel: member.roleLabel ?? 'Team Member',
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        projectStatus: project.status,
      })
    }
  }

  const projectsByMember = new Map<string, Set<string>>()
  for (const row of rows) {
    const projectIds = projectsByMember.get(row.userId) ?? new Set<string>()
    projectIds.add(row.projectId)
    projectsByMember.set(row.userId, projectIds)
  }

  return rows.map((row) => ({
    ...row,
    projectCount: projectsByMember.get(row.userId)?.size ?? 1,
  }))
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
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { items: rawItems, loading, error } = useAppSelector((s) => s.projects)
  const items = rawItems ?? []

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [sortField, setSortField] = useState<string | null>('memberName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
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
      if (sortField === 'projectCount') {
        const cmp = a.projectCount - b.projectCount
        return sortDirection === 'asc' ? cmp : -cmp
      }
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
    >
      <AddedTeamTable
        rows={sortedRows}
        loading={loading}
        projectCount={items.length}
        loadError={error}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onViewDetails={handleViewDetails}
      />
    </ListingTemplate>
  )
}

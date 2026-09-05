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
import { Eye } from 'lucide-react'
import { UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '@/slices/projects/reducer'
import { ListingTemplate } from '@/components/templates/ListingTemplate'
import type { ColumnItem } from '@/components/templates/ListingTemplate'
import {
  FilterableSortHeader,
  type ColumnFilterOption,
} from '@/components/listing'
import { LISTING_DEFAULT_PAGE_SIZE, clampListingPage0Based } from '@/components/listing/listingStandards'
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

type TeamColumnFilters = {
  teamMember: string
  projectCount: string
  role: string
}

function toColumnFilterOptions(
  options?: Array<{ value: string | number | boolean; label: string }>,
): ColumnFilterOption[] {
  return (options ?? []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }))
}

function mapApiTeamRow(raw: TeamMemberApiRow): TeamAssignmentRow | null {
  const userId = raw.userId?.trim()
  if (!userId) return null

  const projectId = raw.projectId?.trim() || ''
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
    id: raw.id?.trim() || userId,
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

const TEAM_ACTION_WIDTH_PX = 84

type TeamVisibleColumns = {
  projectCount: boolean
  role: boolean
}

function buildTeamListColumns(visible: TeamVisibleColumns): string[] {
  return [
    'id',
    'userId',
    'memberName',
    'teamMember',
    ...(visible.projectCount ? (['projectCount'] as const) : []),
    ...(visible.role ? (['role', 'roleLabel'] as const) : []),
    'projectId',
  ]
}

function teamDataColWidth(visibleCount: number): string {
  const count = Math.max(1, visibleCount)
  return `calc((100% - ${TEAM_ACTION_WIDTH_PX}px) / ${count})`
}

/** Horizontal padding aligned with listing card toolbar (`p: 10px 14px`). */
const LISTING_EDGE_PAD = '14px'
const TEAM_CELL_PAD_X = LISTING_EDGE_PAD

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
  loadError: string | null
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  columnFilters: TeamColumnFilters
  visibleColumns: TeamVisibleColumns
  teamMemberOptions: ColumnFilterOption[]
  projectCountOptions: ColumnFilterOption[]
  roleOptions: ColumnFilterOption[]
  onColumnFilter: (field: keyof TeamColumnFilters, value: string) => void
  onViewDetails: (userId: string) => void
}

function AddedTeamTable({
  rows,
  loading,
  loadError,
  sortField,
  sortDirection,
  onSort,
  columnFilters,
  visibleColumns,
  teamMemberOptions,
  projectCountOptions,
  roleOptions,
  onColumnFilter,
  onViewDetails,
}: AddedTeamTableProps) {
  const theme = useTheme()
  const visibleDataCount =
    1 +
    (visibleColumns.projectCount ? 1 : 0) +
    (visibleColumns.role ? 1 : 0)
  const dataColWidth = teamDataColWidth(visibleDataCount)
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
      ? `Could not load team members: ${loadError}`
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
            {Array.from({ length: visibleDataCount }, (_, index) => (
              <col key={index} style={{ width: dataColWidth }} />
            ))}
            <col style={{ width: `${TEAM_ACTION_WIDTH_PX}px` }} />
          </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <FilterableSortHeader
              label="Team Member"
              field="memberName"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={columnFilters.teamMember}
              filterOptions={teamMemberOptions}
              onFilter={(value) => onColumnFilter('teamMember', value)}
              sx={headSx}
            />
            {visibleColumns.projectCount && (
              <FilterableSortHeader
                label="No. of Project"
                field="projectCount"
                sortField={sortField ?? undefined}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={columnFilters.projectCount}
                filterOptions={projectCountOptions}
                onFilter={(value) => onColumnFilter('projectCount', value)}
                sx={headSx}
              />
            )}
            {visibleColumns.role && (
              <FilterableSortHeader
                label="Role"
                field="roleLabel"
                sortField={sortField ?? undefined}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={columnFilters.role}
                filterOptions={roleOptions}
                onFilter={(value) => onColumnFilter('role', value)}
                sx={headSx}
              />
            )}
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
              {visibleColumns.projectCount && (
                <TableCell sx={cellSx}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    {row.projectCount}
                  </Typography>
                </TableCell>
              )}
              {visibleColumns.role && (
                <TableCell sx={cellSx}>
                  <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', wordBreak: 'break-word' }}>
                    {row.roleLabel}
                  </Typography>
                </TableCell>
              )}
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
  const [columnFilters, setColumnFilters] = useState<TeamColumnFilters>({
    teamMember: '',
    projectCount: '',
    role: '',
  })
  const [visibleColumns, setVisibleColumns] = useState<TeamVisibleColumns>({
    projectCount: true,
    role: true,
  })
  const [sortField, setSortField] = useState<string | null>('memberName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(LISTING_DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [filterOptions, setFilterOptions] = useState<{
    teamMember: { value: string; label: string }[]
    roles: { value: string; label: string }[]
    projectCount: { value: string; label: string }[]
  }>({ teamMember: [], roles: [], projectCount: [] })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void teamsApi.getFilters().then((f) => {
      if (f) {
        setFilterOptions({
          teamMember: f.teamMember ?? [],
          roles: f.roles ?? [],
          projectCount: f.projectCount ?? [],
        })
      }
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
          teamMember: columnFilters.teamMember || undefined,
          role: columnFilters.role || undefined,
          projectCount: columnFilters.projectCount || undefined,
          columns: buildTeamListColumns(visibleColumns).join(','),
          sortBy:
            sortField === 'memberName'
              ? 'teamMember'
              : sortField === 'roleLabel'
                ? 'role'
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
        const nextTotal = payload?.meta?.total ?? rows.length
        setTotal(nextTotal)
        const clamped = clampListingPage0Based(page, nextTotal, pageSize)
        if (clamped !== page) {
          setPage(clamped)
          return
        }
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
  }, [
    page,
    pageSize,
    debouncedSearch,
    columnFilters.teamMember,
    columnFilters.role,
    columnFilters.projectCount,
    sortField,
    sortDirection,
    visibleColumns,
  ])

  const teamMemberOptions = toColumnFilterOptions(filterOptions.teamMember)
  const roleOptions = toColumnFilterOptions(filterOptions.roles)
  const projectCountOptions = toColumnFilterOptions(filterOptions.projectCount)
  const sortedRows = items

  const columnsConfig: ColumnItem[] = [
    { field: 'projectCount', label: 'No. of Project', visible: visibleColumns.projectCount },
    { field: 'role', label: 'Role', visible: visibleColumns.role },
  ]

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    const key = field as keyof TeamVisibleColumns
    if (!(key in visibleColumns)) return
    setVisibleColumns((prev) => ({ ...prev, [key]: visible }))
    setPage(0)
  }

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(0)
  }, [])

  function handleResetAll() {
    setSearch('')
    setColumnFilters({
      teamMember: '',
      projectCount: '',
      role: '',
    })
    setSortField('memberName')
    setSortDirection('asc')
    setPage(0)
  }

  function handleSort(field: string, direction: 'asc' | 'desc') {
    setSortField(field)
    setSortDirection(direction)
    setPage(0)
  }

  function handleColumnFilter(field: keyof TeamColumnFilters, value: string) {
    setColumnFilters((prev) => ({ ...prev, [field]: value }))
    setPage(0)
  }

  function handleViewDetails(userId: string) {
    navigate(`/added-team/${userId}`)
  }

  const activeFilterCount = [
    columnFilters.teamMember,
    columnFilters.role,
    columnFilters.projectCount,
  ].filter(Boolean).length

  return (
    <ListingTemplate
      icon={<UserPlus size={20} strokeWidth={1.75} />}
      title="Team"
      subtitle="Team members assigned to projects"
      searchPlaceholder="Search team or project…"
      searchValue={search}
      onSearchChange={handleSearch}
      onResetAll={handleResetAll}
      filterCount={activeFilterCount}
      columns={columnsConfig}
      onColumnVisibilityChange={handleColumnVisibilityChange}
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
        loadError={error}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        columnFilters={columnFilters}
        visibleColumns={visibleColumns}
        teamMemberOptions={teamMemberOptions}
        projectCountOptions={projectCountOptions}
        roleOptions={roleOptions}
        onColumnFilter={handleColumnFilter}
        onViewDetails={handleViewDetails}
      />
    </ListingTemplate>
  )
}

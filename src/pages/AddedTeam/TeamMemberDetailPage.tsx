import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Badge,
  Box,
  Card,
  CircularProgress,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button as MuiButton,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import FilterListIcon from '@mui/icons-material/FilterList'
import SearchIcon from '@mui/icons-material/Search'
import { BadgeOutlined, ChevronRight, Email, MoreVert, Phone, WorkOutline } from '@mui/icons-material'
import { Eye } from 'lucide-react'
import { Button, DatePicker, Modal, StatusBadge, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { FiltersPopover } from '@/components/templates'
import type { FilterField } from '@/components/templates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRoles } from '@/slices/roles/thunk'
import { fetchUsers, updateUser } from '@/slices/users/thunk'
import type { Project } from '@/slices/projects/reducer'
import { ProjectOverviewTab } from '@/pages/Projects/components/ProjectOverviewTab'
import { formatBuildingFloor } from '@/pages/Projects/projectOverviewHelpers'
import { getProjectAssignedMembers } from '@/utils/projectAssignedTeam'
import { formatCurrency, formatDate, getAvatarColor, getInitials } from '@/utils/formatters'
import { teamsApi, type TeamMemberAssignmentApi } from '@/api/teamsApi'

type AssignedPeriod =
  | 'Last 1 Year'
  | 'Last 2 Years'
  | 'Last 5 Years'
  | 'All Time'
  | 'Custom Date Range'

const PERIOD_OPTIONS: AssignedPeriod[] = [
  'Last 1 Year',
  'Last 2 Years',
  'Last 5 Years',
  'All Time',
  'Custom Date Range',
]

const ASSIGNED_PROJECT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'projectName', label: 'Project Name' },
  { key: 'projectLead', label: 'Project Lead' },
  { key: 'sites', label: 'Sites' },
  { key: 'status', label: 'Project Status' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'expectedEndDate', label: 'Expected End Date' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'profitPct', label: 'Profit %' },
]

const PAGE_SIZE = 25
const ACTION_WIDTH_PX = 88
const CELL_PAD_X = 1.5 // 12px — matches Projects listing cell padding
const DATA_COL_COUNT = ASSIGNED_PROJECT_COLUMNS.length
const DATA_COL_WIDTH = `calc((100% - ${ACTION_WIDTH_PX}px) / ${DATA_COL_COUNT})`

const tableHeadCellSx = {
  fontSize: 11,
  fontWeight: 600,
  py: '8px',
  px: CELL_PAD_X,
  whiteSpace: 'nowrap' as const,
  width: DATA_COL_WIDTH,
}

const tableBodyCellSx = {
  py: '7px',
  px: CELL_PAD_X,
  width: DATA_COL_WIDTH,
  verticalAlign: 'middle' as const,
}

const actionHeadCellSx = {
  fontSize: 11,
  fontWeight: 600,
  py: '8px',
  px: CELL_PAD_X,
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const actionBodyCellSx = {
  py: '7px',
  px: CELL_PAD_X,
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

interface AssignedProjectRow {
  id: string
  projectName: string
  projectLead: string
  status: Project['status']
  startDate: string | null
  expectedEndDate: string | null
  assignedAt: string | null
  sites: string
  revenue: number
  profit: number
  profitPct: number | null
  project: Project
}

function startOfDay(d: Date): Date {
  const next = new Date(d)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(d: Date): Date {
  const next = new Date(d)
  next.setHours(23, 59, 59, 999)
  return next
}

function getPeriodBounds(
  period: AssignedPeriod,
  customFrom: Date | null,
  customTo: Date | null,
): { start: Date | null; end: Date | null } {
  if (period === 'All Time') return { start: null, end: null }
  if (period === 'Custom Date Range') {
    return {
      start: customFrom ? startOfDay(customFrom) : null,
      end: customTo ? endOfDay(customTo) : null,
    }
  }
  const end = endOfDay(new Date())
  const start = startOfDay(new Date())
  const years = period === 'Last 1 Year' ? 1 : period === 'Last 2 Years' ? 2 : 5
  start.setFullYear(start.getFullYear() - years)
  return { start, end }
}

function parseProjectDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function projectInPeriod(
  assignedAt: string | null | undefined,
  start: Date | null,
  end: Date | null,
): boolean {
  if (!start && !end) return true
  const effectiveDate = parseProjectDate(assignedAt)
  if (!effectiveDate) return false
  if (end && effectiveDate > end) return false
  if (start && effectiveDate < start) return false
  return true
}

function projectRevenue(project: Project): number {
  return project.totalClientPOValue || project.projectValue || 0
}

function projectProfit(project: Project): number {
  return projectRevenue(project) - (project.totalVendorPOValue || 0)
}

function projectProfitPct(project: Project): number | null {
  const revenue = projectRevenue(project)
  if (revenue <= 0) return null
  return (100 * projectProfit(project)) / revenue
}

function toUiProjectStatus(status?: string): Project['status'] {
  const normalized = String(status ?? 'PITCH').toUpperCase()
  if (normalized === 'LIVE') return 'Live'
  if (normalized === 'COMPLETED') return 'Completed'
  if (normalized === 'ARCHIVED') return 'Archived'
  if (normalized === 'CANCELLED') return 'Cancelled'
  return 'Pitch'
}

function assignmentSites(row: TeamMemberAssignmentApi): string {
  return formatBuildingFloor({
    building: undefined,
    floor: undefined,
    location: row.location ?? '',
    address: null,
    city: row.city ?? null,
    state: row.state ?? null,
    country: null,
    pincode: null,
  })
}

function mapTeamAssignmentRow(row: TeamMemberAssignmentApi): AssignedProjectRow {
  const status = toUiProjectStatus(row.projectStatus)
  const project: Project = {
    id: String(row.projectId ?? ''),
    projectCode: String(row.projectCode ?? ''),
    name: String(row.projectName ?? '—'),
    customerId: '',
    customerName: '',
    projectTypes: [],
    status,
    progress: row.progressLabel ?? row.statusLabel ?? status,
    location: row.location ?? '',
    city: row.city ?? null,
    state: row.state ?? null,
    carpetArea: null,
    headcount: row.headcount ?? null,
    projectManager: row.projectLeadName ?? '—',
    projectManagerId: row.projectLeadId ?? '',
    startDate: row.startDate ?? null,
    expectedEndDate: row.expectedEndDate ?? null,
    projectValue: 0,
    totalClientPOValue: Number(row.revenue ?? 0),
    totalVendorPOValue: Number(row.vendorOfferAmount ?? 0),
    invoicedAmount: 0,
    paidVendorAmount: 0,
    createdAt: row.startDate ?? new Date(0).toISOString(),
    assignedTeam: [],
  }

  return {
    id: String(row.projectId ?? ''),
    projectName: String(row.projectName ?? '—'),
    projectLead: row.projectLeadName?.trim() || '—',
    status,
    startDate: row.startDate ?? null,
    expectedEndDate: row.expectedEndDate ?? null,
    assignedAt: row.assignedAt ?? row.startDate ?? null,
    sites: assignmentSites(row),
    revenue: Number(row.revenue ?? 0),
    profit: Number(row.profit ?? 0),
    profitPct: row.profitPct ?? null,
    project,
  }
}

function fmtInr(amount: number): string {
  return `₹${formatCurrency(amount)}`
}

function fmtPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}%`
}

function compareDateDesc(a: string | null, b: string | null): number {
  const aTs = a ? new Date(a).getTime() : 0
  const bTs = b ? new Date(b).getTime() : 0
  return bTs - aTs
}

function ProjectRowActions({ onView }: { onView: () => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  function handleOpen(event: MouseEvent<HTMLElement>) {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  function handleClose() {
    setAnchorEl(null)
  }

  return (
    <>
      <IconButton size="small" onClick={handleOpen} aria-label="Row actions" sx={{ p: 0.5 }}>
        <MoreVert sx={{ fontSize: 16 }} />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem
          dense
          onClick={() => {
            onView()
            handleClose()
          }}
          sx={{ fontSize: 12, gap: 1 }}
        >
          <Eye size={14} />
          View
        </MenuItem>
      </Menu>
    </>
  )
}

function ProjectOverviewQuickModal({
  open,
  project,
  onClose,
}: {
  open: boolean
  project: Project | null
  onClose: () => void
}) {
  if (!project) return null

  return (
    <Modal open={open} onClose={onClose} title="Project Overview" subtitle={project.name} size="xl">
      <ProjectOverviewTab project={project} readOnly />
    </Modal>
  )
}

function ProfileMetaItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
      <Box sx={{ color: tokens.color.neutral[400], display: 'flex', fontSize: 12, flexShrink: 0 }}>
        {icon}
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

export default function TeamMemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()

  const users = useAppSelector((state) => state.users.items ?? [])
  const projects = useAppSelector((state) => state.projects.items ?? [])
  const roles = useAppSelector((state) => state.roles.items ?? [])
  const usersLoading = useAppSelector((state) => state.users.loading)
  const saving = useAppSelector((state) => state.users.saving)

  const isEditMode = searchParams.get('mode') === 'edit'

  const selectedUser = useMemo(() => users.find((user) => user.id === memberId) ?? null, [users, memberId])
  const [teamDetail, setTeamDetail] = useState<{
    user: Record<string, unknown>
    assignments: TeamMemberAssignmentApi[]
  } | null>(null)
  const roleName = useMemo(() => {
    if (!selectedUser) return '—'
    return roles.find((role) => role.id === selectedUser.role)?.name ?? selectedUser.role
  }, [roles, selectedUser])
  const designationLabel = useMemo(() => {
    if (roleName === 'Project User') return 'Designer'
    return roleName
  }, [roleName])

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    dispatch(fetchUsers({}))
    dispatch(fetchRoles())
  }, [dispatch])

  useEffect(() => {
    if (!memberId) return
    let cancelled = false
    void (async () => {
      try {
        const detail = await teamsApi.getMemberDetail(memberId)
        if (!cancelled) setTeamDetail(detail)
      } catch {
        if (!cancelled) setTeamDetail(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [memberId])

  useEffect(() => {
    if (!selectedUser) return
    setForm({
      name: selectedUser.name,
      email: selectedUser.email,
      phone: selectedUser.phone ?? '',
    })
  }, [selectedUser])

  const assignedProjects = useMemo<AssignedProjectRow[]>(() => {
    if (teamDetail?.assignments?.length) {
      return teamDetail.assignments.map(mapTeamAssignmentRow)
    }
    if (!selectedUser) return []
    return projects
      .filter((project) =>
        getProjectAssignedMembers(project).some((member) => member.userId === selectedUser.id),
      )
      .map((project) => ({
        id: project.id,
        projectName: project.name,
        projectLead: project.projectManager || '—',
        status: project.status,
        startDate: project.startDate,
        expectedEndDate: project.expectedEndDate,
        assignedAt: project.createdAt ?? project.startDate,
        sites: formatBuildingFloor(project),
        revenue: projectRevenue(project),
        profit: projectProfit(project),
        profitPct: projectProfitPct(project),
        project,
      }))
  }, [teamDetail, projects, selectedUser])

  const [period, setPeriod] = useState<AssignedPeriod>('All Time')
  const [customFrom, setCustomFrom] = useState<Date | null>(null)
  const [customTo, setCustomTo] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const [page, setPage] = useState(1)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const theme = useTheme()

  const periodBounds = useMemo(
    () => getPeriodBounds(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const filterConfig: FilterField[] = useMemo(
    () => [
      {
        field: 'period',
        label: 'Period',
        type: 'select',
        options: PERIOD_OPTIONS.map((option) => ({ label: option, value: option })),
      },
    ],
    [],
  )

  const activeFilters = useMemo(() => ({ period }), [period])

  const activeFilterCount = period !== 'All Time' ? 1 : 0

  const filteredProjects = useMemo(() => {
    if (period === 'Custom Date Range' && (!customFrom || !customTo)) return []
    const q = searchQuery.trim().toLowerCase()
    const rows = assignedProjects.filter((row) => {
      if (!projectInPeriod(row.assignedAt, periodBounds.start, periodBounds.end)) return false
      if (q) {
        const haystack = [row.projectName, row.projectLead, row.sites].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    // Newest association first; oldest last. No column-header sorting.
    return [...rows].sort((a, b) => compareDateDesc(a.assignedAt, b.assignedAt))
  }, [assignedProjects, period, customFrom, customTo, periodBounds, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE))
  const pageRows = filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filteredProjects.length, period, customFrom, customTo, searchQuery])

  function handleFilterChange(vals: Record<string, unknown>) {
    const next = (vals.period as AssignedPeriod) || 'All Time'
    setPeriod(next)
    if (next !== 'Custom Date Range') {
      setCustomFrom(null)
      setCustomTo(null)
    }
  }

  function handleFilterReset() {
    setPeriod('All Time')
    setCustomFrom(null)
    setCustomTo(null)
  }

  function handleResetAll() {
    setSearchQuery('')
    handleFilterReset()
    setPage(1)
  }

  async function handleSave() {
    if (!selectedUser) return
    try {
      await dispatch(
        updateUser({
          id: selectedUser.id,
          data: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            status: selectedUser.status,
          },
        }),
      ).unwrap()
      showToast({ title: 'Team member updated', variant: 'success' })
      navigate(`/added-team/${selectedUser.id}`)
    } catch {
      showToast({ title: 'Failed to update team member', variant: 'error' })
    }
  }

  if (usersLoading && !selectedUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (!selectedUser) {
    return (
      <Stack gap={2}>
        <Typography color="error">Team member not found.</Typography>
        <Button variant="outlined" color="secondary" size="sm" onClick={() => navigate('/added-team')}>
          Back to Team
        </Button>
      </Stack>
    )
  }

  const avatarColors = getAvatarColor(selectedUser.name)
  const memberIdLabel = selectedUser.employeeId?.trim() || '—'
  const displayName = isEditMode ? form.name : selectedUser.name
  const displayEmail = isEditMode ? form.email : selectedUser.email
  const displayPhone = isEditMode ? form.phone : selectedUser.phone?.trim() || '—'

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          mb: '12px',
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate('/added-team')}
          sx={{ color: tokens.color.neutral[500], p: 0.25 }}
          aria-label="Back to team"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Typography
          variant="body2"
          sx={{
            color: 'primary.main',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 12,
          }}
          onClick={() => navigate('/added-team')}
        >
          Team
        </Typography>
        <ChevronRight sx={{ fontSize: 14, color: tokens.color.neutral[400] }} />
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: 12,
            maxWidth: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedUser.name}
        </Typography>
      </Box>

      <Card
        sx={{
          p: '14px 20px',
          mb: '12px',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          gap: '14px',
          borderRadius: '10px',
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '8px',
            backgroundColor: alpha(avatarColors.bg, 0.2),
            color: avatarColors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(displayName)}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {isEditMode ? (
              <TextField
                size="small"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                sx={{ maxWidth: 320, flex: 1, minWidth: 180 }}
              />
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>
                {selectedUser.name}
              </Typography>
            )}
            <StatusBadge status={selectedUser.status as StatusType} />
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: '12px',
              mt: '6px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <ProfileMetaItem icon={<WorkOutline sx={{ fontSize: 12 }} />} label={designationLabel} />
            <ProfileMetaItem icon={<BadgeOutlined sx={{ fontSize: 12 }} />} label={`ID: ${memberIdLabel}`} />
            {isEditMode ? (
              <>
                <TextField
                  size="small"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  sx={{ width: { xs: '100%', sm: 220 } }}
                />
                <TextField
                  size="small"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  sx={{ width: { xs: '100%', sm: 180 } }}
                />
              </>
            ) : (
              <>
                <ProfileMetaItem icon={<Email sx={{ fontSize: 12 }} />} label={displayEmail} />
                <ProfileMetaItem icon={<Phone sx={{ fontSize: 12 }} />} label={displayPhone} />
              </>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            gap: 1,
            flexShrink: 0,
          }}
        >
          {isEditMode && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                size="sm"
                onClick={() => navigate(`/added-team/${selectedUser.id}`)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="contained" size="sm" onClick={() => void handleSave()} loading={saving}>
                Save
              </Button>
            </>
          )}
        </Box>
      </Card>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
              Projects Assigned
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: 'text.secondary',
                bgcolor: 'action.hover',
                borderRadius: '6px',
                px: 1,
                py: 0.25,
                lineHeight: 1.4,
              }}
            >
              {assignedProjects.length}
            </Typography>
          </Stack>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          gap={1.5}
          sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                width: { xs: '100%', sm: 260 },
                minWidth: { sm: 200 },
                height: 32,
                bgcolor: searchFocused ? 'action.selected' : 'action.hover',
                border: `1px solid ${searchFocused ? theme.palette.primary.main : 'transparent'}`,
                borderRadius: '6px',
                px: '10px',
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
            >
              <SearchIcon sx={{ fontSize: 14, color: tokens.color.neutral[400] }} />
              <InputBase
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                sx={{ fontSize: 12, flex: 1, '& input': { p: 0 } }}
              />
            </Stack>
            <MuiButton
              variant="outlined"
              size="small"
              onClick={handleResetAll}
              sx={{ height: 32, fontSize: 12, flexShrink: 0 }}
            >
              Reset
            </MuiButton>
          </Stack>

          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" justifyContent="flex-end">
            <Badge badgeContent={activeFilterCount > 0 ? activeFilterCount : undefined} color="primary">
              <MuiButton
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon fontSize="small" />}
                onClick={(e) => setFilterAnchor(e.currentTarget)}
                sx={{ height: 32, fontSize: 12 }}
              >
                Filters
              </MuiButton>
            </Badge>
            {period === 'Custom Date Range' ? (
              <>
                <DatePicker label="From" value={customFrom} onChange={setCustomFrom} size="sm" />
                <DatePicker label="To" value={customTo} onChange={setCustomTo} size="sm" />
              </>
            ) : null}
          </Stack>
        </Stack>

        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 1280 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {ASSIGNED_PROJECT_COLUMNS.map((column) => (
                  <TableCell key={column.key} sx={tableHeadCellSx}>
                    {column.label}
                  </TableCell>
                ))}
                <TableCell sx={actionHeadCellSx}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={DATA_COL_COUNT + 1} sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      {period === 'Custom Date Range' && (!customFrom || !customTo)
                        ? 'Select a custom start and end date to view assigned projects.'
                        : 'No projects found for the selected search, filters, or period.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={tableBodyCellSx}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                        {row.projectName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>{row.projectLead}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{row.sites || '—'}</TableCell>
                    <TableCell sx={tableBodyCellSx}>
                      <StatusBadge
                        status={
                          row.status.toLowerCase() as
                            | 'pitch'
                            | 'live'
                            | 'completed'
                            | 'cancelled'
                            | 'archived'
                        }
                      />
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>{formatDate(row.startDate)}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{formatDate(row.expectedEndDate)}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{fmtInr(row.revenue)}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{fmtInr(row.profit)}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{fmtPct(row.profitPct)}</TableCell>
                    <TableCell sx={actionBodyCellSx}>
                      <ProjectRowActions onView={() => setActiveProject(row.project)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredProjects.length > 0 ? (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length}
            </Typography>
            {filteredProjects.length > PAGE_SIZE ? (
              <Stack direction="row" gap={1}>
                <Button variant="outlined" color="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Previous
                </Button>
                <Button variant="outlined" color="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Next
                </Button>
              </Stack>
            ) : null}
          </Stack>
        ) : null}
      </Box>

      <FiltersPopover
        anchor={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
      />

      <ProjectOverviewQuickModal
        open={Boolean(activeProject)}
        project={activeProject}
        onClose={() => setActiveProject(null)}
      />
    </>
  )
}

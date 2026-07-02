import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Box,
  Card,
  CircularProgress,
  IconButton,
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
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BadgeOutlined, ChevronRight, Email, MoreVert, Phone, WorkOutline } from '@mui/icons-material'
import { Eye } from 'lucide-react'
import { Button, Modal, StatusBadge, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { FormField } from '@/components/templates'
import { WorkspaceSection } from '@/components/templates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchRoles } from '@/slices/roles/thunk'
import { fetchUsers, updateUser } from '@/slices/users/thunk'
import { fetchCustomers } from '@/slices/customers/thunk'
import type { Project } from '@/slices/projects/reducer'
import type { Contact as CustomerContact } from '@/slices/customers/reducer'
import { formatBuildingFloor, formatExpectedDuration } from '@/pages/Projects/projectOverviewHelpers'
import { getProjectAssignedMembers } from '@/utils/projectAssignedTeam'
import { formatDate, getAvatarColor, getInitials } from '@/utils/formatters'

const ASSIGNED_PROJECT_COLUMNS: Array<{ key: SortField; label: string }> = [
  { key: 'projectName', label: 'Project Name' },
  { key: 'projectLead', label: 'Project Lead' },
  { key: 'sites', label: 'Sites' },
  { key: 'status', label: 'Status' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'expectedEndDate', label: 'Expected End Date' },
]

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

const PAGE_SIZE = 5
const ACTION_WIDTH_PX = 56
const CELL_PAD_X = '14px'

type SortField = 'projectName' | 'projectLead' | 'status' | 'startDate' | 'expectedEndDate' | 'sites'

interface AssignedProjectRow {
  id: string
  projectName: string
  projectLead: string
  status: Project['status']
  startDate: string | null
  expectedEndDate: string | null
  sites: string
  project: Project
}

function compareText(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase())
}

function compareDate(a: string | null, b: string | null): number {
  const aTs = a ? new Date(a).getTime() : 0
  const bTs = b ? new Date(b).getTime() : 0
  return aTs - bTs
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
  customerContacts,
  onClose,
}: {
  open: boolean
  project: Project | null
  customerContacts: CustomerContact[]
  onClose: () => void
}) {
  if (!project) return null

  const assignedTeam = getProjectAssignedMembers(project)
    .filter((member) => member.userId !== project.projectManagerId)
    .map((member) => member.name)

  const leadName = project.projectManager?.trim() || '—'
  const clientContacts = project.clientTeam?.length
    ? project.clientTeam
    : customerContacts.map((contact) => ({
      name: contact.name,
      designation: contact.designation,
      email: contact.email,
      phone: contact.phone,
      isPrimary: contact.isPrimary,
    }))

  return (
    <Modal open={open} onClose={onClose} title="Project Overview" subtitle={project.name} size="lg">
      <Stack gap={2}>
        <WorkspaceSection title="Project Profile" noPadding>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <FormField label="Project Name"><Typography variant="body2">{project.name}</Typography></FormField>
              <FormField label="Project Code"><Typography variant="body2">{project.projectCode}</Typography></FormField>
              <FormField label="Project Lead"><Typography variant="body2">{project.projectManager || '—'}</Typography></FormField>
              <FormField label="Location"><Typography variant="body2">{formatBuildingFloor(project)}</Typography></FormField>
              <FormField label="Start Date"><Typography variant="body2">{formatDate(project.startDate)}</Typography></FormField>
              <FormField label="End Date"><Typography variant="body2">{formatDate(project.expectedEndDate)}</Typography></FormField>
              <FormField label="Sector"><Typography variant="body2">{project.sector || '—'}</Typography></FormField>
              <FormField label="Project Scope"><Typography variant="body2">{project.projectScope || '—'}</Typography></FormField>
            </Box>
          </Box>
        </WorkspaceSection>

        <WorkspaceSection title="Area & Planning" noPadding>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <FormField label="Carpet Area"><Typography variant="body2">{project.carpetArea ? `${project.carpetArea.toLocaleString()} sq ft` : '—'}</Typography></FormField>
              <FormField label="Headcount"><Typography variant="body2">{project.headcount ?? '—'}</Typography></FormField>
              <FormField label="Workstation Size"><Typography variant="body2">{project.workstationSize || '—'}</Typography></FormField>
              <FormField label="Meeting Room Count"><Typography variant="body2">{project.meetingRoomCount ?? '—'}</Typography></FormField>
              <FormField label="Server Room Details"><Typography variant="body2">{project.serverRoomDetails || '—'}</Typography></FormField>
              <FormField label="UPS Capacity"><Typography variant="body2">{project.upsCapacity || '—'}</Typography></FormField>
              <FormField label="Reception Details"><Typography variant="body2">{project.receptionDetails || '—'}</Typography></FormField>
              <FormField label="Pantry Details"><Typography variant="body2">{project.pantryDetails || '—'}</Typography></FormField>
              <FormField label="Expected Duration"><Typography variant="body2">{formatExpectedDuration(project.startDate, project.expectedEndDate)}</Typography></FormField>
            </Box>
          </Box>
        </WorkspaceSection>

        <WorkspaceSection title="Team" noPadding sx={{ height: '142px' }}>
          <Box sx={{ px: 2, py: 2.5, minHeight: 140 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              <FormField label="Project Lead">
                <Stack direction="row" alignItems="center" gap={1}>
                  {leadName !== '—' ? <MemberAvatar name={leadName} /> : null}
                  <Typography variant="body2">{leadName}</Typography>
                </Stack>
              </FormField>
              <FormField label="Assigned Team Members">
                <Typography variant="body2" sx={{ color: assignedTeam.length > 0 ? 'text.primary' : 'text.secondary' }}>
                  {assignedTeam.length > 0 ? assignedTeam.join(', ') : '—'}
                </Typography>
              </FormField>
            </Box>
          </Box>
        </WorkspaceSection>

        <WorkspaceSection title="Client Team" noPadding sx={{ height: '142px' }}>
          <Box sx={{ px: 2, py: 1.5 }}>
            {clientContacts.length === 0 ? (
              <Box
                sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  py: 2,
                  px: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No client team contacts added.
                </Typography>
              </Box>
            ) : (
              <Stack gap={1}>
                {clientContacts.map((client, index) => {
                  const isPrimary =
                    (client as { primary?: boolean; isPrimary?: boolean }).primary === true
                    || (client as { primary?: boolean; isPrimary?: boolean }).isPrimary === true
                    || index === 0

                  const legacyContact = 'contact' in client ? client.contact : undefined
                  const phoneNumber = client.phone || legacyContact
                  return (
                    <Card
                      key={`${client.email || client.phone || legacyContact || client.name || 'client'}-${index}`}
                      sx={{
                        width: '294px',
                        p: 1.25,
                        border: '1px solid',
                        borderColor: isPrimary ? 'primary.light' : 'divider',
                        borderRadius: 2,
                        bgcolor: isPrimary ? (theme) => alpha(theme.palette.primary.main, 0.03) : 'transparent',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 1.5,
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" gap={1.25} sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: alpha(getAvatarColor(client.name || 'Client').bg, 0.15),
                            color: getAvatarColor(client.name || 'Client').text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(client.name || 'Client')}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {client.name || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {client.designation || '—'}
                          </Typography>

                          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.5, minWidth: 0 }}>
                            <Phone sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {phoneNumber || '—'}
                            </Typography>
                          </Stack>

                          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.25, minWidth: 0 }}>
                            <Email sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography
                              variant="caption"
                              color="primary.main"
                              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {client.email || '—'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>

                      {isPrimary ? <StatusBadge status="active" label="Primary" /> : null}
                    </Card>
                  )
                })}
              </Stack>
            )}
          </Box>
        </WorkspaceSection>
      </Stack>
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
  const customers = useAppSelector((state) => state.customers.items ?? [])
  const usersLoading = useAppSelector((state) => state.users.loading)
  const saving = useAppSelector((state) => state.users.saving)

  const isEditMode = searchParams.get('mode') === 'edit'

  const selectedUser = useMemo(() => users.find((user) => user.id === memberId) ?? null, [users, memberId])
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
    dispatch(fetchProjects({ page: 1, pageSize: 500 }))
    dispatch(fetchCustomers({ page: 1, pageSize: 500 }))
  }, [dispatch])

  useEffect(() => {
    if (!selectedUser) return
    setForm({
      name: selectedUser.name,
      email: selectedUser.email,
      phone: selectedUser.phone ?? '',
    })
  }, [selectedUser])

  const assignedProjects = useMemo<AssignedProjectRow[]>(() => {
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
        sites: formatBuildingFloor(project),
        project,
      }))
  }, [projects, selectedUser])

  const [sortField, setSortField] = useState<SortField>('projectName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const activeProjectCustomerContacts = useMemo(() => {
    if (!activeProject) return []
    const customer = customers.find((item) => item.id === activeProject.customerId)
    return customer?.contacts ?? []
  }, [activeProject, customers])

  const sortedProjects = useMemo(() => {
    const rows = [...assignedProjects]
    rows.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'projectName':
          cmp = compareText(a.projectName, b.projectName)
          break
        case 'projectLead':
          cmp = compareText(a.projectLead, b.projectLead)
          break
        case 'status':
          cmp = compareText(a.status, b.status)
          break
        case 'startDate':
          cmp = compareDate(a.startDate, b.startDate)
          break
        case 'expectedEndDate':
          cmp = compareDate(a.expectedEndDate, b.expectedEndDate)
          break
        case 'sites':
          cmp = compareText(a.sites, b.sites)
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return rows
  }, [assignedProjects, sortDirection, sortField])

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / PAGE_SIZE))
  const pageRows = sortedProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [sortDirection, sortField, assignedProjects.length])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
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
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
            Projects Assigned
          </Typography>
        </Box>
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 980 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {ASSIGNED_PROJECT_COLUMNS.map((column) => (
                  <TableCell
                    key={column.key}
                    onClick={() => handleSort(column.key as SortField)}
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      py: '8px',
                      px: CELL_PAD_X,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                <TableCell
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    py: '8px',
                    pl: 0,
                    pr: CELL_PAD_X,
                    width: ACTION_WIDTH_PX,
                    minWidth: ACTION_WIDTH_PX,
                    maxWidth: ACTION_WIDTH_PX,
                    textAlign: 'center',
                  }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      No assigned projects found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ py: '7px', px: CELL_PAD_X }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                        {row.projectName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: '7px', px: CELL_PAD_X }}>{row.projectLead}</TableCell>
                    <TableCell sx={{ py: '7px', px: CELL_PAD_X }}>{row.sites || '—'}</TableCell>
                    <TableCell sx={{ py: '7px', px: CELL_PAD_X }}>
                      <StatusBadge status={row.status.toLowerCase() as 'pitch' | 'live' | 'completed' | 'cancelled' | 'archived'} />
                    </TableCell>
                    <TableCell sx={{ py: '7px', px: CELL_PAD_X }}>{formatDate(row.startDate)}</TableCell>
                    <TableCell sx={{ py: '7px', px: CELL_PAD_X }}>{formatDate(row.expectedEndDate)}</TableCell>
                    <TableCell sx={{ py: '7px', pl: 0, pr: CELL_PAD_X, textAlign: 'center' }}>
                      <ProjectRowActions onView={() => setActiveProject(row.project)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {sortedProjects.length > PAGE_SIZE ? (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, sortedProjects.length)} of {sortedProjects.length}
            </Typography>
            <Stack direction="row" gap={1}>
              <Button variant="outlined" color="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Previous
              </Button>
              <Button variant="outlined" color="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                Next
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Box>

      <ProjectOverviewQuickModal
        open={Boolean(activeProject)}
        project={activeProject}
        customerContacts={activeProjectCustomerContacts}
        onClose={() => setActiveProject(null)}
      />
    </>
  )
}

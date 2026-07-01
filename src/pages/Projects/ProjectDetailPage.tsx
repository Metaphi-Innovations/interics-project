// ProjectDetailPage
import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  Skeleton,
} from '@mui/material'
import {
  GridView,
  Analytics,
  PlayCircle as PlayCircleIcon,
  BarChart as BarChartIcon,
  FilePresent,
  History,
  Edit,
  Lock,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Email,
  Phone,
  Star,
} from '@mui/icons-material'

import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PitchTab from './tabs/PitchTab'
import LiveTab from './tabs/LiveTab'
import { convertProjectToLive } from './convertProjectToLive'
import FinancialsTab from './tabs/FinancialsTab'
import DocumentsTab from './tabs/DocumentsTab'
import ActivityTab from './tabs/ActivityTab'
import { store } from '@/store'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchProjects, fetchProjectById, updateProject, changeProjectStatus } from '../../slices/projects/thunk'
import { fetchUsers } from '../../slices/users/thunk'
import { isProjectManagerRole } from './projectManagerRoles'
import { ProjectTypesField } from './components/ProjectTypesField'
import { ProjectDetailsSections } from './components/ProjectDetailsSections'
import { getProjectAdditionalTeamMembers } from '@/utils/projectAssignedTeam'
import { clearSelected } from '../../slices/projects/reducer'
import type { Project } from '../../slices/projects/reducer'
import {
  WorkspaceDetail,
  WorkspaceSection,
} from '../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../components/templates/DrawerForm'
import { StatusBadge, useToast, Input, Toggle } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useTheme, alpha } from '@mui/material/styles'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
  fromSlug,
} from '../../utils/formatters'

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <Box>
      <Skeleton height={20} width={220} sx={{ mb: 1.5 }} />
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 1 }} />
      <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 2 }} />
    </Box>
  )
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound() {
  const navigate = useNavigate()
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={600}>
        Project not found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        The project you're looking for doesn't exist or has been removed.
      </Typography>
      <Box
        component="span"
        onClick={() => navigate('/projects')}
        sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}
      >
        ← Back to Projects
      </Box>
    </Box>
  )
}

// ─── Tab config ───────────────────────────────────────────────────────────────

interface TabConfig {
  label: string
  value: string
  icon: React.ReactNode
  locked: boolean
  lockReason: string | null
}

function getTabConfig(status: string): TabConfig[] {
  const isLiveProject = status === 'Live'
  return [
    {
      label: 'Overview',
      value: 'overview',
      icon: <GridView sx={{ fontSize: 14 }} />,
      locked: false,
      lockReason: null,
    },
    {
      label: 'Pitch',
      value: 'pitch',
      icon: <Analytics sx={{ fontSize: 14 }} />,
      locked: false,
      lockReason: null,
    },
    {
      label: 'Live',
      value: 'live',
      icon: <PlayCircleIcon sx={{ fontSize: 14 }} />,
      locked: !isLiveProject,
      lockReason: 'Use Convert Live on the Pitch tab to unlock',
    },
    {
      label: 'Financials',
      value: 'financials',
      icon: <BarChartIcon sx={{ fontSize: 14 }} />,
      locked: false,
      lockReason: null,
    },
    {
      label: 'Documents',
      value: 'documents',
      icon: <FilePresent sx={{ fontSize: 14 }} />,
      locked: false,
      lockReason: null,
    },
    {
      label: 'Activity',
      value: 'activity',
      icon: <History sx={{ fontSize: 14 }} />,
      locked: false,
      lockReason: null,
    },
  ]
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Box sx={{ color: tokens.color.primary[300], mb: 1 }}>{icon}</Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 340, mx: 'auto' }}>
        {description}
      </Typography>
      {action}
    </Box>
  )
}

// ─── Tab content ──────────────────────────────────────────────────────────────

const OVERVIEW_CARD_SX = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  p: 2,
} as const

const TEAM_SECTION_CARD_SX = {
  ...OVERVIEW_CARD_SX,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
} as const

function OverviewTab({ project }: { project: Project }) {
  const theme = useTheme()

  const additionalTeamMembers = getProjectAdditionalTeamMembers(project)
  const clientTeamMembers = project.clientTeam ?? []

  const TeamsRow = (
    <Box
      sx={{
        mt: 2,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2,
        alignItems: 'stretch',
      }}
    >
      <Box sx={TEAM_SECTION_CARD_SX}>
        <Typography
          variant="overline"
          sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}
        >
          Team
        </Typography>
        <Stack gap={1.5} sx={{ flex: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
              PROJECT LEAD
            </Typography>
            <Stack direction="row" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: alpha(getAvatarColor(project.projectManager).bg, 0.15),
                  color: getAvatarColor(project.projectManager).text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {getInitials(project.projectManager)}
              </Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                {project.projectManager}
              </Typography>
            </Stack>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
              TEAM MEMBERS
            </Typography>
            <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" useFlexGap>
              {additionalTeamMembers.length === 0 ? (
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                  No additional team members
                </Typography>
              ) : (
                additionalTeamMembers.map((member) => (
                  <Stack key={member.userId} direction="row" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: alpha(getAvatarColor(member.name).bg, 0.15),
                        color: getAvatarColor(member.name).text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(member.name)}
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {member.name}
                    </Typography>
                  </Stack>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Box sx={TEAM_SECTION_CARD_SX}>
        <Typography
          variant="overline"
          sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}
        >
          Client Team
        </Typography>
        {clientTeamMembers.length === 0 ? (
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', flex: 1 }}>
            No client team contacts added.
          </Typography>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.25,
              alignItems: 'stretch',
            }}
          >
            {clientTeamMembers.map((member, idx) => (
              <Box
                key={`${member.name ?? 'client'}-${idx}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  height: '100%',
                  border: '1px solid',
                  borderColor: idx === 0 ? 'primary.light' : 'divider',
                  borderRadius: 2,
                  px: 1.5,
                  py: 1.25,
                  bgcolor: idx === 0 ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                }}
              >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
                  <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: alpha(getAvatarColor(member.name || 'Client').bg, 0.15),
                        color: getAvatarColor(member.name || 'Client').text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(member.name || 'Client')}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                        {member.name || '—'}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                        {member.designation || '—'}
                      </Typography>
                      <Stack gap={0.75}>
                        <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
                          <Phone sx={{ fontSize: 12, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {member.phone || member.contact || '—'}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
                          <Email sx={{ fontSize: 12, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ fontSize: 11, color: 'primary.main', wordBreak: 'break-word' }}>
                            {member.email || '—'}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                  {idx === 0 ? (
                    <MuiChip
                      size="small"
                      icon={<Star sx={{ fontSize: '12px !important' }} />}
                      label="Primary"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        borderRadius: '6px',
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                        '& .MuiChip-label': { px: 1 },
                        '& .MuiChip-icon': { color: 'primary.main', ml: '4px' },
                      }}
                    />
                  ) : null}
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )

  return (
    <Stack
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'stretch',
        '& > .MuiCard-root': {
          display: 'flex',
          flexDirection: 'column',
          mb: 2,
        },
        '& > .MuiCard-root > :last-child': {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <ProjectDetailsSections project={project} />
      {TeamsRow}
    </Stack>
  )
}

// ─── Edit Project Drawer ──────────────────────────────────────────────────────

interface EditDrawerProps {
  open: boolean
  project: Project
  onClose: () => void
  onSave: (data: Partial<Project>) => void
  saving: boolean
  managerOptions: { value: string; label: string }[]
}

function EditProjectDrawer({
  open,
  project,
  onClose,
  onSave,
  saving,
  managerOptions,
}: EditDrawerProps) {
  const [form, setForm] = useState<Partial<Project>>({})

  useEffect(() => {
    setForm({ ...project })
  }, [project])

  function set(key: keyof Project, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Edit Project"
      subtitle="Update project information"
      onSubmit={() => onSave(form)}
      submitLoading={saving}
    >
      <FormSection title="Project Details" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Project Name" required>
            <Input
              value={form.name ?? ''}
              onChange={(v) => set('name', v)}
              size="sm"
            />
          </FormField>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Project Type">
            <ProjectTypesField
              value={form.projectTypes ?? []}
              onChange={(v) => set('projectTypes', v)}
            />
          </FormField>
        </Box>
        <FormField label="Location">
          <Input
            value={form.location ?? ''}
            onChange={(v) => set('location', v)}
            size="sm"
          />
        </FormField>
        <FormField label="Carpet Area (sq ft)">
          <Input
            type="number"
            value={form.carpetArea?.toString() ?? ''}
            onChange={(v) =>
              set('carpetArea', v ? Number(v) : null)
            }
            size="sm"
          />
        </FormField>
        <FormField label="Headcount">
          <Input
            type="number"
            value={form.headcount?.toString() ?? ''}
            onChange={(v) =>
              set('headcount', v ? Number(v) : null)
            }
            size="sm"
          />
        </FormField>
        <FormField label="Workstation Size">
          <Input
            value={form.workstationSize ?? ''}
            onChange={(v) => set('workstationSize', v || null)}
            size="sm"
          />
        </FormField>
        <FormField label="Meeting Room Count">
          <Input
            type="number"
            value={form.meetingRoomCount?.toString() ?? ''}
            onChange={(v) =>
              set('meetingRoomCount', v ? Number(v) : null)
            }
            size="sm"
          />
        </FormField>
        <FormField label="Server Room Details">
          <Input
            value={form.serverRoomDetails ?? ''}
            onChange={(v) => set('serverRoomDetails', v || null)}
            size="sm"
          />
        </FormField>
        <FormField label="UPS Capacity">
          <Input
            value={form.upsCapacity ?? ''}
            onChange={(v) => set('upsCapacity', v || null)}
            size="sm"
          />
        </FormField>
        <FormField label="Reception Details">
          <Input
            value={form.receptionDetails ?? ''}
            onChange={(v) => set('receptionDetails', v || null)}
            size="sm"
          />
        </FormField>
        <FormField label="Pantry Details">
          <Input
            value={form.pantryDetails ?? ''}
            onChange={(v) => set('pantryDetails', v || null)}
            size="sm"
          />
        </FormField>
        <FormField label="Project Lead">
          <MuiSelect
            value={form.projectManagerId ?? ''}
            onChange={(e) => {
              const opt = managerOptions.find((o) => o.value === e.target.value)
              set('projectManagerId', e.target.value)
              if (opt) set('projectManager', opt.label)
            }}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            {managerOptions.map((o) => (
              <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12 }}>
                {o.label}
              </MenuItem>
            ))}
          </MuiSelect>
        </FormField>
        <FormField label="Start Date">
          <Input
            type="date"
            value={form.startDate ?? ''}
            onChange={(v) => set('startDate', v || null)}
            size="sm"
          />
        </FormField>
        <FormField label="Expected End Date">
          <Input
            type="date"
            value={form.expectedEndDate ?? ''}
            onChange={(v) => set('expectedEndDate', v || null)}
            size="sm"
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

// ─── Change Status Dialog ─────────────────────────────────────────────────────

type ProjectStatus = Project['status']

const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  Pitch: [],
  Live: ['Completed', 'Cancelled'],
  Completed: ['Archived'],
  Cancelled: ['Archived'],
  Archived: [],
}

interface StatusDialogProps {
  open: boolean
  project: Project
  onClose: () => void
  onConfirm: (status: ProjectStatus) => void
}

function ChangeStatusDialog({ open, project, onClose, onConfirm }: StatusDialogProps) {
  const [selected, setSelected] = useState<ProjectStatus | ''>('')
  const available = STATUS_TRANSITIONS[project.status]

  useEffect(() => {
    setSelected('')
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>
        Change Project Status
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {project.status}
          </Box>
        </Typography>
        {project.status === 'Pitch' ? (
          <Typography variant="body2" color="warning.main" sx={{ fontSize: 12 }}>
            Use Convert Live on the Pitch tab to change status to Live.
          </Typography>
        ) : available.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            No further transitions available.
          </Typography>
        ) : (
          <FormControl fullWidth size="small">
            <MuiSelect
              value={selected}
              onChange={(e) => setSelected(e.target.value as ProjectStatus)}
              displayEmpty
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>
                Select status…
              </MenuItem>
              {available.map((s) => (
                <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>
                  {s}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose}>
          Cancel
        </MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          disabled={!selected}
          onClick={() => selected && onConfirm(selected as ProjectStatus)}
        >
          Confirm
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

// ─── ProjectDetailPage ────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const toast = useToast()

  const { items: rawItems, selectedItem: project, loading, saving } = useAppSelector(
    (s) => s.projects
  )
  const items = rawItems ?? []
  const users = useAppSelector((s) => s.users.items ?? [])

  const [activeTab, setActiveTab] = useState('overview')
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [convertingToLive, setConvertingToLive] = useState(false)

  function isTabAccessible(tabValue: string, status: string): boolean {
    const tab = getTabConfig(status).find((t) => t.value === tabValue)
    return Boolean(tab && !tab.locked)
  }

  // Derive tab from hash (block hidden / locked tabs)
  useEffect(() => {
    if (!project) return
    const hash = location.hash.replace('#', '')
    if (hash && hash !== 'transition' && isTabAccessible(hash, project.status)) {
      setActiveTab(hash)
      return
    }
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab && isTabAccessible(tab, project.status)) {
      setActiveTab(tab)
    }
  }, [location.hash, location.search, project?.status, project?.id])

  // Reset active tab when it becomes hidden or locked
  useEffect(() => {
    if (!project) return
    if (activeTab === 'transition' || !isTabAccessible(activeTab, project.status)) {
      setActiveTab('overview')
    }
  }, [project?.status, activeTab, project?.id])

  useEffect(() => {
    dispatch(fetchUsers({}))
    dispatch(fetchProjects({})).then((action) => {
      if (fetchProjects.fulfilled.match(action)) {
        const foundId = fromSlug(slug ?? '', action.payload.items)
        if (foundId) {
          dispatch(fetchProjectById(foundId))
        } else {
          // Try direct slug lookup in API
          dispatch(fetchProjectById(slug ?? ''))
        }
      }
    })
    return () => {
      dispatch(clearSelected())
    }
  }, [dispatch, slug])

  const managerOptions = users
    .filter((u) => isProjectManagerRole(u.role))
    .map((u) => ({ value: u.id, label: u.name }))

  async function handleEditSave(data: Partial<Project>) {
    if (!project) return
    try {
      await dispatch(updateProject({ id: project.id, data })).unwrap()
      toast.success('Project updated')
      setEditDrawerOpen(false)
    } catch {
      toast.error('Failed to update project')
    }
  }

  async function handleStatusConfirm(status: ProjectStatus) {
    if (!project) return
    try {
      await dispatch(changeProjectStatus({ id: project.id, status })).unwrap()
      toast.success(`Status changed to ${status}`)
      setStatusDialogOpen(false)
    } catch {
      toast.error('Failed to change status')
    }
  }

  async function handleConvertLive() {
    if (!project) return
    if (project.status === 'Live') {
      setActiveTab('live')
      return
    }
    setConvertingToLive(true)
    try {
      const result = await convertProjectToLive(dispatch, () => store.getState(), project)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      await dispatch(fetchProjectById(project.id)).unwrap()
      toast.success('Project converted to Live')
      setActiveTab('live')
    } catch {
      toast.error('Failed to convert project to Live')
    } finally {
      setConvertingToLive(false)
    }
  }

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading && !project) return <DetailSkeleton />

  // Check if we have items loaded but no match
  const hasItems = items.length > 0
  if (!loading && hasItems && !project) return <NotFound />

  if (!project) {
    return <DetailSkeleton />
  }

  // ── Tab config ────────────────────────────────────────────────────────────

  const tabConfig = getTabConfig(project.status)
  const workspaceTabs = tabConfig.map((t) => ({
    label: t.label,
    value: t.value,
    icon: t.icon,
    disabled: t.locked,
  }))

  // ── Tab content ───────────────────────────────────────────────────────────

  function renderTabContent() {
    const current = tabConfig.find((t) => t.value === activeTab)
    if (current?.locked) {
      return (
        <WorkspaceSection>
          <EmptyState
            icon={<Lock sx={{ fontSize: 48 }} />}
            title="This section is locked"
            description={current.lockReason ?? ''}
          />
        </WorkspaceSection>
      )
    }
    const proj = project!
    switch (activeTab) {
      case 'overview':
        return <OverviewTab project={proj} />
      case 'pitch':
        return <PitchTab project={proj} />
      case 'live':
        return <LiveTab project={proj} />
      case 'financials':
        return <FinancialsTab project={proj} />
      case 'documents':
        return <DocumentsTab project={proj} />
      case 'activity':
        return <ActivityTab project={proj} />
      default:
        return <OverviewTab project={proj} />
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <WorkspaceDetail
        moduleName="Projects"
        moduleHref="/projects"
        recordName={project.name}
        avatarText={getInitials(project.name)}
        avatarColor={alpha(getAvatarColor(project.name).bg, 0.2)}
        title={project.name}
        titleMeta={
          <Stack direction="row" alignItems="center" gap={1} sx={{ ml: 1 }}>
            <StatusBadge status={project.status.toLowerCase() as StatusType} />
          </Stack>
        }
        metaItems={[]}
        heroExtra={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {[
              {
                label: 'Revenue',
                value: formatCurrency(project.totalClientPOValue),
                icon: <TrendingUp sx={{ fontSize: 12 }} />,
                color: 'primary.main',
              },
              {
                label: 'Cost',
                value: formatCurrency(project.totalVendorPOValue),
                icon: <TrendingDown sx={{ fontSize: 12 }} />,
                color: '#EA580C',
              },
              {
                label: 'Profit',
                value: formatCurrency(
                  project.totalClientPOValue - project.totalVendorPOValue,
                ),
                icon: <AttachMoney sx={{ fontSize: 12 }} />,
                color: 'success.main',
              },
            ].map((metric) => (
              <Box
                key={metric.label}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '6px 12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  minWidth: 90,
                  bgcolor: 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ color: metric.color, display: 'flex' }}>{metric.icon}</Box>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {metric.label}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: metric.color, fontSize: 13 }}
                >
                  ₹{metric.value}
                </Typography>
              </Box>
            ))}
          </Box>
        }
        primaryAction={{
          label: 'Edit Project',
          icon: <Edit sx={{ fontSize: 14 }} />,
          onClick: () => setEditDrawerOpen(true),
        }}
        secondaryActions={[]}
        metrics={[]}
        tabs={workspaceTabs}
        activeTab={activeTab}
        onTabChange={(val) => {
          const tab = tabConfig.find((t) => t.value === val)
          if (!tab || tab.locked) return
          setActiveTab(val)
        }}
        tabsEnd={
          activeTab === 'pitch' ? (
            <Toggle
              label="Convert Live"
              size="sm"
              checked={project.status === 'Live'}
              disabled={convertingToLive || project.status === 'Live'}
              onChange={(checked) => {
                if (checked && project.status !== 'Live') {
                  void handleConvertLive()
                }
              }}
            />
          ) : null
        }
      >
        {renderTabContent()}
      </WorkspaceDetail>

      {/* Edit Drawer */}
      <EditProjectDrawer
        open={editDrawerOpen}
        project={project}
        onClose={() => setEditDrawerOpen(false)}
        onSave={handleEditSave}
        saving={saving}
        managerOptions={managerOptions}
      />

      {/* Status Dialog */}
      <ChangeStatusDialog
        open={statusDialogOpen}
        project={project}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleStatusConfirm}
      />
    </>
  )
}

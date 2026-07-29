// ProjectDetailPage
import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  Skeleton,
  Chip as MuiChip,
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
import { fetchStatuses, fetchSectors } from '../../slices/settings/thunk'
import {
  getStatusMasterChipColors,
  lifecycleStatusForMasterName,
} from '../../utils/masterChipStyles'
import type { StatusMaster } from '../../slices/settings/reducer'
import { ProjectTypesField } from './components/ProjectTypesField'
import { ProjectOverviewTab } from './components/ProjectOverviewTab'
import { clearSelected } from '../../slices/projects/reducer'
import type { Project } from '../../slices/projects/reducer'
import {
  WorkspaceDetail,
  WorkspaceSection,
} from '../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../components/templates/DrawerForm'
import {
  StatusBadge,
  useToast,
  Input,
  Toggle,
  DatePicker,
  dateFromIso,
  isoFromDate,
  RichTextEditor,
  AutocompleteField,
} from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import {
  COUNTRIES,
  INDIAN_CITIES,
  INDIAN_STATES,
  digitsOnly,
  formatAddressLine,
} from '@/constants/locations'
import { useTheme, alpha } from '@mui/material/styles'
import {
  getInitials,
  getAvatarColor,
  fromSlug,
} from '../../utils/formatters'
import { formatExpectedDuration } from './projectOverviewHelpers'

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
// Overview UI lives in ./components/ProjectOverviewTab (shared with Team module).

// ─── Edit Project Drawer ──────────────────────────────────────────────────────

const PROJECT_DETAIL_TOOLBAR = [
  'bold', 'italic', 'underline',
  'divider',
  'bulletList', 'orderedList',
  'divider',
  'undo', 'redo',
] as const

interface EditDrawerProps {
  open: boolean
  project: Project
  onClose: () => void
  onSave: (data: Partial<Project>) => void
  saving: boolean
}

function EditProjectDrawer({
  open,
  project,
  onClose,
  onSave,
  saving,
}: EditDrawerProps) {
  const dispatch = useAppDispatch()
  const sectors = useAppSelector((s) => s.settings.sectors)
  const activeSectors = sectors.filter((s) => s.status === 'active')
  const [form, setForm] = useState<Partial<Project>>({})

  useEffect(() => {
    setForm({ ...project })
  }, [project])

  useEffect(() => {
    if (open) {
      void dispatch(fetchSectors())
    }
  }, [open, dispatch])

  function set(key: keyof Project, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Edit Project"
      subtitle="Update project information"
      onSubmit={() =>
        onSave({
          ...form,
          location: formatAddressLine({
            address: form.address,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            country: form.country,
          }),
        })
      }
      submitLoading={saving}
    >
      <FormSection title="Project Profile" columns={2} divider={false}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Project Name" required>
            <Input
              value={form.name ?? ''}
              onChange={(v) => set('name', v)}
              size="sm"
            />
          </FormField>
        </Box>
        <FormField label="Project Code">
          <Input
            value={form.projectCode ?? ''}
            onChange={() => undefined}
            size="sm"
            disabled
          />
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Address">
            <Input
              value={form.address ?? ''}
              onChange={(v) => set('address', v || null)}
              placeholder="Street, building, landmark"
              size="sm"
            />
          </FormField>
        </Box>
        <FormField label="City">
          <AutocompleteField
            options={[...INDIAN_CITIES]}
            value={form.city || null}
            onChange={(v) => set('city', v)}
            getOptionLabel={(o) => o}
            isOptionEqualToValue={(a, b) => a === b}
            placeholder="Search city…"
            size="sm"
          />
        </FormField>
        <FormField label="State">
          <AutocompleteField
            options={[...INDIAN_STATES]}
            value={form.state || null}
            onChange={(v) => set('state', v)}
            getOptionLabel={(o) => o}
            isOptionEqualToValue={(a, b) => a === b}
            placeholder="Search state…"
            size="sm"
          />
        </FormField>
        <FormField label="Country">
          <AutocompleteField
            options={[...COUNTRIES]}
            value={form.country || null}
            onChange={(v) => set('country', v)}
            getOptionLabel={(o) => o}
            isOptionEqualToValue={(a, b) => a === b}
            placeholder="Search country…"
            size="sm"
          />
        </FormField>
        <FormField label="PIN Code">
          <Input
            value={form.pincode ?? ''}
            onChange={(v) => set('pincode', digitsOnly(v).slice(0, 10) || null)}
            placeholder="e.g. 110001"
            size="sm"
          />
        </FormField>
        <FormField label="Building">
          <Input
            value={form.building ?? ''}
            onChange={(v) => set('building', v || undefined)}
            placeholder="e.g. Connaught Place Tower"
            size="sm"
          />
        </FormField>
        <FormField label="Floor">
          <Input
            value={form.floor ?? ''}
            onChange={(v) => set('floor', v || undefined)}
            placeholder="e.g. 12th Floor"
            size="sm"
          />
        </FormField>
        <FormField label="Start Date">
          <DatePicker
            value={dateFromIso(form.startDate)}
            onChange={(d) => set('startDate', isoFromDate(d) || null)}
            fullWidth
            size="sm"
          />
        </FormField>
        <FormField label="Expected End Date">
          <DatePicker
            value={dateFromIso(form.expectedEndDate)}
            onChange={(d) => set('expectedEndDate', isoFromDate(d) || null)}
            fullWidth
            size="sm"
            minDate={dateFromIso(form.startDate) ?? undefined}
          />
        </FormField>
        <FormField label="Sector">
          <FormControl fullWidth size="small">
            <MuiSelect
              value={form.sector ?? ''}
              onChange={(e) => set('sector', e.target.value || undefined)}
              displayEmpty
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>
                Select sector…
              </MenuItem>
              {activeSectors.map((s) => (
                <MenuItem key={s.id} value={s.name} sx={{ fontSize: 13 }}>
                  {s.name}
                </MenuItem>
              ))}
              {form.sector && !activeSectors.some((s) => s.name === form.sector) ? (
                <MenuItem value={form.sector} sx={{ fontSize: 13 }}>
                  {form.sector}
                </MenuItem>
              ) : null}
            </MuiSelect>
          </FormControl>
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Project Scope">
            <ProjectTypesField
              value={form.projectTypes ?? []}
              onChange={(v) => {
                set('projectTypes', v)
                set('projectScope', v.join(', ') || undefined)
              }}
              placeholder="Select project scope…"
            />
          </FormField>
        </Box>
        <FormField label="Carpet Area (sq ft)">
          <Input
            type="number"
            value={form.carpetArea?.toString() ?? ''}
            onChange={(v) => set('carpetArea', v ? Number(v) : null)}
            placeholder="e.g. 4500"
            size="sm"
          />
        </FormField>
        <FormField label="Headcount">
          <Input
            type="number"
            value={form.headcount?.toString() ?? ''}
            onChange={(v) => set('headcount', v ? Number(v) : null)}
            placeholder="e.g. 120"
            size="sm"
          />
        </FormField>
      </FormSection>

      <FormSection title="Area & Planning" columns={1} divider={false}>
        <RichTextEditor
          label="Workstations"
          value={form.workstations ?? ''}
          onChange={(html) => set('workstations', html || null)}
          placeholder="Describe workstation requirements…"
          minHeight={100}
          toolbar={[...PROJECT_DETAIL_TOOLBAR]}
        />
        <RichTextEditor
          label="Cabins"
          value={form.cabins ?? ''}
          onChange={(html) => set('cabins', html || null)}
          placeholder="Describe cabin requirements…"
          minHeight={100}
          toolbar={[...PROJECT_DETAIL_TOOLBAR]}
        />
        <RichTextEditor
          label="Meeting Rooms"
          value={form.meetingRooms ?? ''}
          onChange={(html) => set('meetingRooms', html || null)}
          placeholder="Describe meeting room requirements…"
          minHeight={100}
          toolbar={[...PROJECT_DETAIL_TOOLBAR]}
        />
        <RichTextEditor
          label="Services"
          value={form.services ?? ''}
          onChange={(html) => set('services', html || null)}
          placeholder="Describe services requirements…"
          minHeight={100}
          toolbar={[...PROJECT_DETAIL_TOOLBAR]}
        />
        <RichTextEditor
          label="Support Function"
          value={form.supportFunction ?? ''}
          onChange={(html) => set('supportFunction', html || null)}
          placeholder="Describe support function requirements…"
          minHeight={100}
          toolbar={[...PROJECT_DETAIL_TOOLBAR]}
        />
        <FormField label="Expected Duration">
          <Input
            value={formatExpectedDuration(
              form.startDate ?? null,
              form.expectedEndDate ?? null,
            )}
            onChange={() => undefined}
            size="sm"
            disabled
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

// ─── Change Status Dialog ─────────────────────────────────────────────────────

interface StatusDialogProps {
  open: boolean
  project: Project
  statusOptions: StatusMaster[]
  onClose: () => void
  onConfirm: (statusName: string) => void
}

function ChangeStatusDialog({ open, project, statusOptions, onClose, onConfirm }: StatusDialogProps) {
  const [selected, setSelected] = useState('')
  const activeOptions = statusOptions.filter((s) => s.status === 'active')

  useEffect(() => {
    setSelected(project.progress ?? '')
  }, [open, project.progress])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>
        Change Project Status
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current:{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {project.progress || '—'}
          </Box>
        </Typography>
        {activeOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            No active statuses in Status Master. Add statuses in Settings.
          </Typography>
        ) : (
          <FormControl fullWidth size="small">
            <MuiSelect
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              displayEmpty
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>
                Select status…
              </MenuItem>
              {activeOptions.map((s) => (
                <MenuItem key={s.id} value={s.name} sx={{ fontSize: 13 }}>
                  {s.name}
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
          disabled={!selected || selected === project.progress}
          onClick={() => selected && onConfirm(selected)}
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
  const theme = useTheme()

  const { items: rawItems, selectedItem: project, loading, saving } = useAppSelector(
    (s) => s.projects
  )
  const items = rawItems ?? []
  const statusMasters = useAppSelector((s) => s.settings.statuses)

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
    dispatch(fetchStatuses())
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

  async function handleStatusConfirm(statusName: string) {
    if (!project) return
    try {
      const lifecycle = lifecycleStatusForMasterName(statusName)
      await dispatch(
        updateProject({
          id: project.id,
          data: { progress: statusName },
        })
      ).unwrap()
      if (lifecycle && lifecycle !== project.status) {
        await dispatch(
          changeProjectStatus({ id: project.id, status: lifecycle })
        ).unwrap()
      }
      toast.success(`Status changed to ${statusName}`)
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
  const progressChipColors = project.progress
    ? getStatusMasterChipColors(
        project.progress,
        theme.palette.mode === 'dark' ? 'dark' : 'light',
      )
    : null

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
        return <ProjectOverviewTab project={proj} />
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
        return <ProjectOverviewTab project={proj} />
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
            {project.progress && progressChipColors ? (
              <MuiChip
                label={project.progress}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: progressChipColors.bg,
                  color: progressChipColors.color,
                  border: 'none',
                  borderRadius: '20px',
                  '& .MuiChip-label': { px: '10px' },
                }}
              />
            ) : (
              <StatusBadge status={project.status.toLowerCase() as 'pitch' | 'live' | 'completed' | 'cancelled' | 'archived'} />
            )}
          </Stack>
        }
        metaItems={[]}
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
      />

      {/* Status Dialog */}
      <ChangeStatusDialog
        open={statusDialogOpen}
        project={project}
        statusOptions={statusMasters}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleStatusConfirm}
      />
    </>
  )
}

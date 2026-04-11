// ProjectDetailPage
import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  Skeleton,
  Tooltip,
} from '@mui/material'
import {
  GridView,
  Analytics,
  Assignment,
  PlayCircle as PlayCircleIcon,
  BarChart as BarChartIcon,
  FilePresent,
  History,
  Edit,
  SwapHoriz,
  Archive,
  Tag as TagIcon,
  Person,
  LocationOn,
  CalendarToday,
  Lock,
  Upload as UploadIcon,
  TrendingUp,
  TrendingDown,
  AttachMoney,
} from '@mui/icons-material'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PitchTab from './tabs/PitchTab'
import BaselineTab from './tabs/BaselineTab'
import LiveTab from './tabs/LiveTab'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchProjects, fetchProjectById, updateProject, changeProjectStatus } from '../../slices/projects/thunk'
import { fetchUsers } from '../../slices/users/thunk'
import { clearSelected } from '../../slices/projects/reducer'
import type { Project } from '../../slices/projects/reducer'
import {
  WorkspaceDetail,
  WorkspaceSection,
  WorkspaceTwoCol,
} from '../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../components/templates/DrawerForm'
import { StatusBadge, useToast, Input, AvatarGroup } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { alpha } from '@mui/material/styles'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
  formatDate,
  toSlug,
  fromSlug,
} from '../../utils/formatters'

// ─── Progress badge colours ───────────────────────────────────────────────────

function getProgressStyle(label: string): { bg: string; color: string } {
  const lower = label.toLowerCase()
  if (lower.includes('risk') || lower.includes('cancel'))
    return { bg: '#FEE2E2', color: '#B91C1C' }
  if (lower.includes('complete')) return { bg: '#DBEAFE', color: '#1D4ED8' }
  if (lower.includes('ongoing') || lower.includes('execution'))
    return { bg: '#E0F2FE', color: '#0369A1' }
  if (lower.includes('quotation') || lower.includes('pitch'))
    return { bg: '#FEF3C7', color: '#B45309' }
  if (lower.includes('archive')) return { bg: '#F3F4F6', color: '#6B7280' }
  return { bg: tokens.color.neutral[100], color: tokens.color.neutral[600] }
}

// ─── Label/Value pair ─────────────────────────────────────────────────────────

function LabelValue({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.6, display: 'block' }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: '2px' }}>{children}</Box>
    </Box>
  )
}

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
  const isPitch = status === 'Pitch'
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
      label: 'PO & Baseline',
      value: 'baseline',
      icon: <Assignment sx={{ fontSize: 14 }} />,
      locked: false,
      lockReason: null,
    },
    {
      label: 'Live',
      value: 'live',
      icon: <PlayCircleIcon sx={{ fontSize: 14 }} />,
      locked: isPitch,
      lockReason: 'Available after baseline is created',
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

function OverviewTab({ project }: { project: Project }) {
  const progressStyle = getProgressStyle(project.progress)
  const netPosition = project.totalClientPOValue - project.totalVendorPOValue

  return (
    <WorkspaceTwoCol sidebarWidth={300}>
      {/* Left column */}
      <Box>
        <WorkspaceSection title="Project Details">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: '16px',
            }}
          >
            <LabelValue label="Project Name">
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>
                {project.name}
              </Typography>
            </LabelValue>
            <LabelValue label="Project Code">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {project.projectCode}
              </Typography>
            </LabelValue>
            <LabelValue label="Client">
              <Typography
                variant="body2"
                sx={{ fontSize: 13, color: 'primary.main', cursor: 'pointer' }}
              >
                {project.customerName}
              </Typography>
            </LabelValue>
            <LabelValue label="Project Type">
              <MuiChip
                label={project.type}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: 11,
                  borderRadius: '4px',
                  color: tokens.color.neutral[600],
                  borderColor: tokens.color.neutral[300],
                  '& .MuiChip-label': { px: '6px' },
                }}
              />
            </LabelValue>
            <LabelValue label="Location">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {project.location || '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="Carpet Area">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {project.carpetArea ? `${project.carpetArea.toLocaleString()} sq ft` : '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="Headcount">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {project.headcount ?? '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="Project Manager">
              <Stack direction="row" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: alpha(getAvatarColor(project.projectManager).bg, 0.15),
                    color: getAvatarColor(project.projectManager).bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  {getInitials(project.projectManager)}
                </Box>
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {project.projectManager}
                </Typography>
              </Stack>
            </LabelValue>
            <LabelValue label="Start Date">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {formatDate(project.startDate)}
              </Typography>
            </LabelValue>
            <LabelValue label="Expected End Date">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {formatDate(project.expectedEndDate)}
              </Typography>
            </LabelValue>
          </Box>
        </WorkspaceSection>

        <WorkspaceSection title="Financial Summary">
          <Stack gap="12px">
            {[
              {
                label: 'Project Value',
                value: '₹' + formatCurrency(project.projectValue),
              },
              {
                label: 'Client PO Value',
                value: '₹' + formatCurrency(project.totalClientPOValue),
              },
              {
                label: 'Vendor PO Value',
                value: '₹' + formatCurrency(project.totalVendorPOValue),
              },
              {
                label: 'Net Position',
                value: '₹' + formatCurrency(Math.abs(netPosition)),
                extra: netPosition >= 0 ? '(Positive)' : '(Negative)',
                positive: netPosition >= 0,
              },
            ].map((row) => (
              <Stack
                key={row.label}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  {row.label}
                </Typography>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                    {row.value}
                  </Typography>
                  {'extra' in row && row.extra && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 11,
                        color: row.positive ? 'success.main' : 'error.main',
                      }}
                    >
                      {row.extra}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </WorkspaceSection>
      </Box>

      {/* Right column */}
      <Box>
        <WorkspaceSection title="Status & Progress">
          <Stack gap="12px">
            <LabelValue label="Current Status">
              <StatusBadge status={project.status.toLowerCase() as StatusType} />
            </LabelValue>
            <LabelValue label="Progress">
              <MuiChip
                label={project.progress}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 11,
                  borderRadius: '4px',
                  bgcolor: getProgressStyle(project.progress).bg,
                  color: getProgressStyle(project.progress).color,
                  '& .MuiChip-label': { px: '6px' },
                }}
              />
            </LabelValue>
            <LabelValue label="Created">
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {formatDate(project.createdAt)}
              </Typography>
            </LabelValue>
          </Stack>
        </WorkspaceSection>

        <WorkspaceSection title="Team">
          <Stack gap="10px">
            <LabelValue label="Project Manager">
              <Stack direction="row" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: alpha(getAvatarColor(project.projectManager).bg, 0.15),
                    color: getAvatarColor(project.projectManager).bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {getInitials(project.projectManager)}
                </Box>
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {project.projectManager}
                </Typography>
              </Stack>
            </LabelValue>
            <LabelValue label="Team Members">
              <AvatarGroup
                users={[project.projectManager].map((name) => ({
                  name,
                  color: getAvatarColor(name).bg,
                }))}
                max={4}
                size="sm"
              />
            </LabelValue>
          </Stack>
        </WorkspaceSection>
      </Box>
    </WorkspaceTwoCol>
  )
}




function FinancialsTab({ project }: { project: Project }) {
  const profit = project.totalClientPOValue - project.totalVendorPOValue
  const stats = [
    { label: 'Revenue', value: project.totalClientPOValue, color: 'success' as const },
    { label: 'Cost', value: project.totalVendorPOValue, color: 'error' as const },
    { label: 'Invoiced', value: project.invoicedAmount, color: 'info' as const },
    { label: 'Profit', value: profit, color: profit >= 0 ? 'success' as const : 'error' as const },
  ]

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, lg: 3 }}>
            <Box
              sx={{
                p: '14px 16px',
                border: `1px solid ${tokens.color.neutral[100]}`,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="overline"
                sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}
              >
                {s.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, mt: '2px' }}>
                ₹{formatCurrency(Math.abs(s.value))}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <WorkspaceSection title="Detailed Reports">
        <EmptyState
          icon={<BarChartIcon sx={{ fontSize: 48 }} />}
          title="Detailed financial reports coming soon"
          description="Charts and breakdowns by category, vendor, and time period will appear here."
        />
      </WorkspaceSection>
    </>
  )
}

function DocumentsTab() {
  return (
    <WorkspaceSection title="Project Documents">
      <EmptyState
        icon={<FilePresent sx={{ fontSize: 48 }} />}
        title="No documents yet"
        description="Upload project documents, contracts, and files."
        action={
          <MuiButton variant="outlined" size="small" startIcon={<UploadIcon />}>
            Upload Document
          </MuiButton>
        }
      />
    </WorkspaceSection>
  )
}

function ActivityTab() {
  return (
    <WorkspaceSection title="Activity Log">
      <EmptyState
        icon={<History sx={{ fontSize: 48 }} />}
        title="No activity yet"
        description="Actions taken on this project will be logged here."
      />
    </WorkspaceSection>
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
              onChange={(e) => set('name', e.target.value)}
              size="sm"
            />
          </FormField>
        </Box>
        <FormField label="Project Type">
          <MuiSelect
            value={form.type ?? ''}
            onChange={(e) => set('type', e.target.value)}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="Design Only" sx={{ fontSize: 12 }}>Design Only</MenuItem>
            <MenuItem value="Design & Build" sx={{ fontSize: 12 }}>Design & Build</MenuItem>
          </MuiSelect>
        </FormField>
        <FormField label="Location">
          <Input
            value={form.location ?? ''}
            onChange={(e) => set('location', e.target.value)}
            size="sm"
          />
        </FormField>
        <FormField label="Carpet Area (sq ft)">
          <Input
            type="number"
            value={form.carpetArea?.toString() ?? ''}
            onChange={(e) =>
              set('carpetArea', e.target.value ? Number(e.target.value) : null)
            }
            size="sm"
          />
        </FormField>
        <FormField label="Headcount">
          <Input
            type="number"
            value={form.headcount?.toString() ?? ''}
            onChange={(e) =>
              set('headcount', e.target.value ? Number(e.target.value) : null)
            }
            size="sm"
          />
        </FormField>
        <FormField label="Project Manager">
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
            onChange={(e) => set('startDate', e.target.value || null)}
            size="sm"
          />
        </FormField>
        <FormField label="Expected End Date">
          <Input
            type="date"
            value={form.expectedEndDate ?? ''}
            onChange={(e) => set('expectedEndDate', e.target.value || null)}
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
            Status changes to Live automatically when baseline is created.
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
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const toast = useToast()

  const { items, selectedItem: project, loading, saving } = useAppSelector(
    (s) => s.projects
  )
  const users = useAppSelector((s) => s.users.items)

  const [activeTab, setActiveTab] = useState('overview')
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // Derive tab from hash
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) setActiveTab(hash)
  }, [location.hash])

  useEffect(() => {
    dispatch(fetchUsers())
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
    .filter((u) => u.role === 'Project User' || u.role === 'Power User')
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

  async function handleArchive() {
    if (!project) return
    if (project.status === 'Completed' || project.status === 'Cancelled') {
      await handleStatusConfirm('Archived')
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
  const progressStyle = getProgressStyle(project.progress)

  const tabs = tabConfig.map((t) => ({
    label: t.locked ? (
      <Stack direction="row" alignItems="center" gap={0.5} component="span">
        {t.label}
        <Lock sx={{ fontSize: 11, opacity: 0.5 }} />
      </Stack>
    ) as unknown as string : t.label,
    value: t.value,
    icon: t.icon,
  }))

  // Build WorkspaceDetail tabs (with Tooltip for locked ones)
  const workspaceTabs = tabConfig.map((t) => ({
    label: t.locked ? `${t.label} 🔒` : t.label,
    value: t.value,
    icon: t.locked ? (
      <Tooltip title={t.lockReason ?? ''} placement="top">
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {t.icon}
        </Box>
      </Tooltip>
    ) : t.icon,
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
    switch (activeTab) {
      case 'overview':
        return <OverviewTab project={project} />
      case 'pitch':
        return <PitchTab project={project} />
      case 'baseline':
        return <BaselineTab project={project} />
      case 'live':
        return <LiveTab project={project} />
      case 'financials':
        return <FinancialsTab project={project} />
      case 'documents':
        return <DocumentsTab />
      case 'activity':
        return <ActivityTab />
      default:
        return <OverviewTab project={project} />
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
            <MuiChip
              label={project.progress}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: progressStyle.bg,
                color: progressStyle.color,
                borderRadius: '4px',
                '& .MuiChip-label': { px: '6px' },
              }}
            />
          </Stack>
        }
        metaItems={[
          { icon: <TagIcon sx={{ fontSize: 12 }} />, label: project.projectCode },
          { icon: <Person sx={{ fontSize: 12 }} />, label: project.projectManager },
          ...(project.location
            ? [{ icon: <LocationOn sx={{ fontSize: 12 }} />, label: project.location }]
            : []),
          {
            icon: <CalendarToday sx={{ fontSize: 12 }} />,
            label: `${formatDate(project.startDate)} → ${formatDate(project.expectedEndDate)}`,
          },
        ]}
        heroExtra={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {[
              {
                label: 'Revenue',
                value: formatCurrency(project.totalClientPOValue),
                icon: <TrendingUp sx={{ fontSize: 12 }} />,
                color: '#107E68',
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
                color: '#16A34A',
              },
            ].map((metric) => (
              <Box
                key={metric.label}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '6px 12px',
                  border: '1px solid #E2E8E6',
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
        secondaryActions={[
          {
            label: 'Change Status',
            icon: <SwapHoriz sx={{ fontSize: 14 }} />,
            onClick: () => setStatusDialogOpen(true),
          },
          {
            label: 'Archive Project',
            icon: <Archive sx={{ fontSize: 14 }} />,
            onClick: handleArchive,
            destructive: true,
          },
        ]}
        metrics={[
          {
            label: 'CLIENT PO VALUE',
            value: formatCurrency(project.totalClientPOValue),
            prefix: '₹',
          },
          {
            label: 'VENDOR PO VALUE',
            value: formatCurrency(project.totalVendorPOValue),
            prefix: '₹',
          },
          {
            label: 'INVOICED AMOUNT',
            value: formatCurrency(project.invoicedAmount),
            prefix: '₹',
            highlight: project.invoicedAmount > 0,
          },
          {
            label: 'PAID TO VENDORS',
            value: formatCurrency(project.paidVendorAmount),
            prefix: '₹',
          },
        ]}
        tabs={workspaceTabs}
        activeTab={activeTab}
        onTabChange={(val) => {
          const tab = tabConfig.find((t) => t.value === val)
          if (!tab?.locked) setActiveTab(val)
        }}
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

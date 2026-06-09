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
import LinearProgress from '@mui/material/LinearProgress'
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
import { getProgressStyle } from './projectOverviewHelpers'
import { clearSelected } from '../../slices/projects/reducer'
import type { Project } from '../../slices/projects/reducer'
import {
  WorkspaceDetail,
  WorkspaceSection,
} from '../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../components/templates/DrawerForm'
import { StatusBadge, useToast, Input, Button, Toggle } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useTheme, alpha } from '@mui/material/styles'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
  formatDate,
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

const STAGE_STEPS = ['Pitch', 'Transition', 'Live', 'Completed']

function OverviewTab({ project }: { project: Project }) {
  const theme = useTheme()
  const revenue = project.totalClientPOValue

  const totalReceivable = revenue
  const collected = project.invoicedAmount
  const outstanding = totalReceivable - collected
  const collectionPct = totalReceivable > 0 ? Math.round((collected / totalReceivable) * 100) : 0

  const stageIndex = project.status === 'Pitch' ? 1 :
    project.status === 'Live' ? 2 :
    project.status === 'Completed' || project.status === 'Archived' ? 3 : 0

  const completion = project.status === 'Completed' || project.status === 'Archived' ? 100 :
    project.status === 'Live' ? 55 :
    project.status === 'Pitch' ? 15 : 30

  const teamMembers = [project.projectManager]
  const clientTeamMembers = project.clientTeam ?? []
  const docs = project.projectDocuments
  const projectDocumentItems = [
    {
      name: 'Final Layout',
      description: docs?.finalLayoutDescription,
      link: docs?.finalLayoutLink,
      file: docs?.finalLayoutFile,
    },
    {
      name: 'Final RCP',
      description: docs?.finalRcpDescription,
      link: docs?.finalRcpLink,
      file: docs?.finalRcpFile,
    },
    {
      name: 'Final Views',
      description: docs?.finalViewsDescription,
      link: docs?.finalViewsLink,
      file: docs?.finalViewsFile,
    },
    {
      name: 'Final Photographs',
      description: docs?.finalPhotographsDescription,
      link: docs?.finalPhotographsLink,
      file: docs?.finalPhotographsFile,
    },
    {
      name: 'Final Handover Documents',
      description: docs?.finalHandoverDescription,
      link: docs?.finalHandoverLink,
      file: docs?.finalHandoverFile ?? docs?.finalHandoverDocuments?.[0],
    },
  ]
  const hasProjectDocuments = projectDocumentItems.some((d) => d.description || d.link || d.file)

  const TeamCard = (
    <Box sx={OVERVIEW_CARD_SX}>
      <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Team
      </Typography>
      <Stack gap={1.5}>
        <Box>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            PROJECT LEAD
          </Typography>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 28, height: 28, borderRadius: '50%',
                bgcolor: alpha(getAvatarColor(project.projectManager).bg, 0.15),
                color: getAvatarColor(project.projectManager).text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}
            >
              {getInitials(project.projectManager)}
            </Box>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>{project.projectManager}</Typography>
          </Stack>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            TEAM MEMBERS
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.75}>
            {teamMembers.slice(0, 5).map((name) => (
              <Box
                key={name}
                title={name}
                sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bgcolor: alpha(getAvatarColor(name).bg, 0.15),
                  color: getAvatarColor(name).text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, border: '1px solid white',
                }}
              >
                {getInitials(name)}
              </Box>
            ))}
            {teamMembers.length > 5 && (
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                +{teamMembers.length - 5} more
              </Typography>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )

  const ClientTeamCard = (
    <Box sx={{ ...OVERVIEW_CARD_SX, mt: 2 }}>
      <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Client Team
      </Typography>
      {clientTeamMembers.length === 0 ? (
        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
          No client team contacts added.
        </Typography>
      ) : (
        <Stack gap={1.25}>
          {clientTeamMembers.map((member, idx) => (
            <Box
              key={`${member.name ?? 'client'}-${idx}`}
              sx={{
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
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
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
        </Stack>
      )}
    </Box>
  )

  const ProjectDocumentsCard = (
    <Box sx={OVERVIEW_CARD_SX}>
      <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Project Documents
      </Typography>
      {!hasProjectDocuments ? (
        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
          No project documents added yet.
        </Typography>
      ) : (
        <Stack gap={1}>
          {projectDocumentItems.map((doc) => (
            <Box key={doc.name} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                {doc.name}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', mt: 0.25 }}>
                {doc.description?.trim() || '—'}
              </Typography>
              <Stack direction="row" gap={1} sx={{ mt: 0.75 }}>
                {doc.link ? (
                  <Button size="sm" variant="outlined" color="primary" label="Open Link" onClick={() => window.open(doc.link!, '_blank', 'noopener,noreferrer')} />
                ) : null}
                {doc.file ? (
                  <Button size="sm" variant="outlined" color="primary" label="Open File" onClick={() => window.open(doc.file!.blobUrl, '_blank', 'noopener,noreferrer')} />
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
        gap: '24px',
        alignItems: { xs: 'start', md: 'stretch' },
      }}
    >
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
        {ProjectDocumentsCard}
        {ClientTeamCard}
      </Stack>

      <Box sx={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'stretch' }}>

        <Box sx={OVERVIEW_CARD_SX}>
          <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}>
            Status & Progress
          </Typography>
          <Stack gap={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>Current Status</Typography>
              <StatusBadge status={project.status.toLowerCase() as StatusType} />
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>Progress</Typography>
              <MuiChip
                label={project.progress}
                size="small"
                sx={{
                  height: 18, fontSize: 10, borderRadius: '4px',
                  bgcolor: getProgressStyle(project.progress, theme.palette).bg,
                  color: getProgressStyle(project.progress, theme.palette).color,
                  '& .MuiChip-label': { px: '6px' },
                }}
              />
            </Stack>

            <Box>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.75 }}>Stage</Typography>
              <Stack direction="row" alignItems="center" gap={0.5}>
                {STAGE_STEPS.map((step, idx) => {
                  const done = idx < stageIndex
                  const active = idx === stageIndex
                  return (
                    <Stack key={step} direction="row" alignItems="center" gap={0.5} sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: done ? 'success.main' : active ? 'primary.main' : tokens.color.neutral[200],
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 9, fontWeight: active ? 700 : 400,
                          color: active ? 'primary.main' : done ? 'success.main' : 'text.disabled',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {step}
                      </Typography>
                      {idx < STAGE_STEPS.length - 1 && (
                        <Box sx={{ flex: 1, height: 1, bgcolor: done ? 'success.main' : tokens.color.neutral[100] }} />
                      )}
                    </Stack>
                  )
                })}
              </Stack>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>Overall Completion</Typography>
                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: 'primary.main' }}>{completion}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={completion} sx={{ height: 5, borderRadius: 3 }} />
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>Created</Typography>
              <Typography variant="caption" sx={{ fontSize: 11 }}>{formatDate(project.createdAt)}</Typography>
            </Stack>
          </Stack>
        </Box>

        <Box sx={OVERVIEW_CARD_SX}>
          <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}>
            Receivables Snapshot
          </Typography>
          <Stack gap={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Total Receivable</Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>₹{formatCurrency(totalReceivable)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" gap={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Collected</Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'success.main' }}>₹{formatCurrency(collected)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" gap={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Outstanding</Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'warning.main' }}>₹{formatCurrency(outstanding)}</Typography>
            </Stack>

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>Collection Progress</Typography>
                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>{collectionPct}%</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={collectionPct}
                sx={{ height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#0D9488' } }}
              />
            </Box>
          </Stack>
        </Box>

        {TeamCard}

      </Box>
    </Box>
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
    if (!hash || hash === 'transition') return
    if (isTabAccessible(hash, project.status)) {
      setActiveTab(hash)
    }
  }, [location.hash, project?.status, project?.id])

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

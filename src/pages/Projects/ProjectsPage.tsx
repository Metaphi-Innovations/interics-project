import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Chip as MuiChip,
  Card as MuiCard,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  Select as MuiSelect,
  FormControl,
  Skeleton,
} from '@mui/material'
import {
  MoreVert,
  PersonOutline,
  CalendarToday,
  EventBusy,
  ArrowUpward,
  ArrowDownward,
  PlayCircle,
  CheckCircle,
  Visibility,
  Edit,
  LocationOn,
  Archive,
  CancelOutlined,
} from '@mui/icons-material'
import { FolderKanban, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchProjects, changeProjectStatus, updateProject } from '../../slices/projects/thunk'
import { fetchUsers } from '../../slices/users/thunk'
import { isProjectManagerRole } from './projectManagerRoles'
import {
  setFilters,
  resetFilters,
  setPage,
  setSortConfig,
} from '../../slices/projects/reducer'
import type { Project } from '../../slices/projects/reducer'
import { ListingTemplate } from '../../components/templates/ListingTemplate'
import { DrawerForm, FormField, FormSection } from '../../components/templates/DrawerForm'
import { useToast, Input, DatePicker, dateFromIso, isoFromDate, ConfirmDialog, AutocompleteField } from '@/design-system/components'
import {
  COUNTRIES,
  INDIAN_CITIES,
  INDIAN_STATES,
  digitsOnly,
  formatAddressLine,
} from '@/constants/locations'
import { tokens } from '@/design-system/tokens'
import { useTheme } from '@mui/material/styles'
import {
  formatCurrency,
  formatDate,
  getDaysBetweenDates,
  getInitials,
  getAvatarColor,
  toSlug,
} from '../../utils/formatters'
import { formatProjectSite } from '../../utils/projectSite'
import { getProjectTypes, PROJECT_TYPE_OPTIONS } from './projectTypes'
import { ProjectTypeTags } from './components/ProjectTypeTags'
import { ProjectTypesField } from './components/ProjectTypesField'
import { fetchStatuses } from '../../slices/settings/thunk'
import {
  getStatusMasterChipColors,
  lifecycleStatusForMasterName,
} from '../../utils/masterChipStyles'
import type { StatusMaster } from '../../slices/settings/reducer'

// ─── Column visibility state ──────────────────────────────────────────────────

interface ColumnVisibility {
  projectName: boolean
  status: boolean
  type: boolean
  projectLead: boolean
  dates: boolean
}

// ─── Project Avatar ───────────────────────────────────────────────────────────

function ProjectAvatar({ name }: { name: string }) {
  const colors = getAvatarColor(name)
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: '6px',
        bgcolor: colors.bg,
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </Box>
  )
}

// ─── Progress badge (Status Master colors) ────────────────────────────────────

function ProgressBadge({ label }: { label: string }) {
  const theme = useTheme()
  const mode = theme.palette.mode === 'dark' ? 'dark' : 'light'
  const colors = getStatusMasterChipColors(label, mode)
  return (
    <MuiChip
      label={label}
      size="small"
      sx={{
        height: 18,
        fontSize: 10,
        fontWeight: 600,
        bgcolor: colors.bg,
        color: colors.color,
        borderRadius: '4px',
        border: 'none',
        '& .MuiChip-label': { px: '6px' },
      }}
    />
  )
}

// ─── Sort header ──────────────────────────────────────────────────────────────

interface SortHeaderProps {
  field: string
  label: string
  currentField: string | null
  direction: 'asc' | 'desc'
  onSort: (field: string) => void
}

function SortHeader({ field, label, currentField, direction, onSort }: SortHeaderProps) {
  const isActive = currentField === field
  return (
    <Box
      onClick={() => onSort(field)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { color: 'primary.main' },
        color: isActive ? 'primary.main' : 'inherit',
      }}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ArrowUpward sx={{ fontSize: 12 }} />
        ) : (
          <ArrowDownward sx={{ fontSize: 12 }} />
        )
      ) : (
        <ArrowUpward sx={{ fontSize: 12, opacity: 0.2 }} />
      )}
    </Box>
  )
}

// ─── Row actions ──────────────────────────────────────────────────────────────

interface RowActionsProps {
  project: Project
  onView: () => void
  onEdit: () => void
  onChangeStatus: () => void
  onArchive: () => void
  onCancel: () => void
}

function RowActions({
  project,
  onView,
  onEdit,
  onChangeStatus,
  onArchive,
  onCancel,
}: RowActionsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const showLifecycleActions = project.status === 'Live'

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVert sx={{ fontSize: 16 }} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem
          onClick={() => { setAnchor(null); onView() }}
          sx={{ fontSize: 13, gap: 1 }}
        >
          <Visibility sx={{ fontSize: 14 }} /> View
        </MenuItem>
        <MenuItem
          onClick={() => { setAnchor(null); onEdit() }}
          sx={{ fontSize: 13, gap: 1 }}
        >
          <Edit sx={{ fontSize: 14 }} /> Edit Basic Info
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { setAnchor(null); onChangeStatus() }}
          sx={{ fontSize: 13 }}
        >
          Change Status
        </MenuItem>
        {showLifecycleActions ? (
          <>
            <MenuItem
              onClick={() => { setAnchor(null); onArchive() }}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <Archive sx={{ fontSize: 14 }} /> Archive Project
            </MenuItem>
            <MenuItem
              onClick={() => { setAnchor(null); onCancel() }}
              sx={{ fontSize: 13, gap: 1, color: 'error.main' }}
            >
              <CancelOutlined sx={{ fontSize: 14 }} /> Cancel Project
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  )
}

// ─── Projects Table ───────────────────────────────────────────────────────────

interface ProjectsTableProps {
  items: Project[]
  loading: boolean
  columns: ColumnVisibility
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  onView: (project: Project) => void
  onEdit: (project: Project) => void
  onChangeStatus: (project: Project) => void
  onArchive: (project: Project) => void
  onCancel: (project: Project) => void
}

function ProjectsTable({
  items,
  loading,
  columns,
  sortField,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onChangeStatus,
  onArchive,
  onCancel,
}: ProjectsTableProps) {
  const theme = useTheme()

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ color: tokens.color.neutral[300], mb: 1, display: 'flex' }}>
          <FolderKanban size={40} strokeWidth={1.5} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          No projects found
        </Typography>
      </Box>
    )
  }

  const cellSx = {
    py: '10px',
    px: '12px',
    fontSize: 12,
    borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  }

  const headSx = {
    ...cellSx,
    fontWeight: 600,
    fontSize: 11,
    color: 'text.secondary',
    bgcolor: 'background.default',
    whiteSpace: 'nowrap' as const,
  }

  const actionColWidth = 56
  const actionHeadSx = {
    ...headSx,
    width: actionColWidth,
    minWidth: actionColWidth,
    textAlign: 'center' as const,
    verticalAlign: 'middle' as const,
  }
  const actionCellSx = {
    ...cellSx,
    width: actionColWidth,
    minWidth: actionColWidth,
    p: '4px',
    textAlign: 'center' as const,
    verticalAlign: 'middle' as const,
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={headSx}>
              <SortHeader
                field="name"
                label="Project"
                currentField={sortField}
                direction={sortDirection}
                onSort={onSort}
              />
            </TableCell>
            {columns.status && <TableCell sx={headSx}>Status</TableCell>}
            {columns.type && (
              <TableCell sx={{ ...headSx, display: { xs: 'none', lg: 'table-cell' } }}>
                Scope
              </TableCell>
            )}
            {columns.projectLead && (
              <TableCell sx={{ ...headSx, display: { xs: 'none', lg: 'table-cell' } }}>
                Project Lead
              </TableCell>
            )}
            {columns.dates && (
              <TableCell sx={{ ...headSx, display: { xs: 'none', xl: 'table-cell' } }}>
                <SortHeader
                  field="startDate"
                  label="Dates"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                />
              </TableCell>
            )}
            <TableCell sx={actionHeadSx}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((project) => {
            const isPastDue =
              project.expectedEndDate &&
              new Date(project.expectedEndDate) < new Date() &&
              project.status !== 'Completed' &&
              project.status !== 'Archived' &&
              project.status !== 'Cancelled'
            const dateSpanDays = getDaysBetweenDates(
              project.startDate,
              project.expectedEndDate,
            )

            return (
              <TableRow
                key={project.id}
                hover
                onClick={() => onView(project)}
                sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
              >
                {/* Project Name */}
                <TableCell sx={cellSx}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <ProjectAvatar name={project.name} />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}
                      >
                        {project.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {formatProjectSite(project) || project.projectCode}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>

                {/* Status */}
                {columns.status && (
                  <TableCell sx={cellSx}>
                    <ProgressBadge label={project.progress} />
                  </TableCell>
                )}

                {/* Type */}
                {columns.type && (
                  <TableCell sx={{ ...cellSx, display: { xs: 'none', lg: 'table-cell' } }}>
                    <ProjectTypeTags types={getProjectTypes(project)} maxVisible={4} />
                  </TableCell>
                )}

                {/* Project Lead */}
                {columns.projectLead && (
                  <TableCell sx={{ ...cellSx, display: { xs: 'none', lg: 'table-cell' } }}>
                    <Stack direction="row" alignItems="center" gap="4px">
                      <PersonOutline sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {project.projectManager}
                      </Typography>
                    </Stack>
                  </TableCell>
                )}

                {/* Dates */}
                {columns.dates && (
                  <TableCell sx={{ ...cellSx, display: { xs: 'none', xl: 'table-cell' } }}>
                    <Stack gap="2px">
                      <Stack direction="row" alignItems="center" gap="3px">
                        <CalendarToday sx={{ fontSize: 10, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                          {formatDate(project.startDate)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap="3px">
                        <EventBusy
                          sx={{
                            fontSize: 10,
                            color: isPastDue ? 'warning.main' : 'text.secondary',
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 10,
                            color: isPastDue
                              ? theme.palette.warning.main
                              : 'text.secondary',
                          }}
                        >
                          {formatDate(project.expectedEndDate)}
                        </Typography>
                      </Stack>
                      {dateSpanDays !== null && (
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 10, color: 'text.secondary', pl: '13px' }}
                        >
                          {dateSpanDays} {dateSpanDays === 1 ? 'day' : 'days'}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                )}

                {/* Actions */}
                <TableCell sx={actionCellSx} onClick={(e) => e.stopPropagation()}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <RowActions
                      project={project}
                      onView={() => onView(project)}
                      onEdit={() => onEdit(project)}
                      onChangeStatus={() => onChangeStatus(project)}
                      onArchive={() => onArchive(project)}
                      onCancel={() => onCancel(project)}
                    />
                  </Box>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  )
}

// ─── Project Grid Card ────────────────────────────────────────────────────────

interface ProjectGridCardProps {
  project: Project
  onView: (project: Project) => void
  onEdit: (project: Project) => void
  onChangeStatus: (project: Project) => void
  onArchive: (project: Project) => void
  onCancel: (project: Project) => void
}

function ProjectGridCard({
  project,
  onView,
  onEdit,
  onChangeStatus,
  onArchive,
  onCancel,
}: ProjectGridCardProps) {
  const theme = useTheme()
  const gridColors = getAvatarColor(project.name)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const showLifecycleActions = project.status === 'Live'

  return (
    <MuiCard
      elevation={0}
      onClick={() => onView(project)}
      sx={{
        p: 2,
        border: `1px solid ${tokens.color.neutral[100]}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: tokens.shadow.md },
      }}
    >
      {/* Top row */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={1} sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: gridColors.bg,
              color: gridColors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {getInitials(project.name)}
          </Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {project.name}
          </Typography>
        </Stack>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
          sx={{ flexShrink: 0, ml: 0.5 }}
        >
          <MoreVert sx={{ fontSize: 16 }} />
        </IconButton>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          PaperProps={{ sx: { minWidth: 160 } }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => { setAnchor(null); onView(project) }} sx={{ fontSize: 13, gap: 1 }}>
            <Visibility sx={{ fontSize: 14 }} /> View
          </MenuItem>
          <MenuItem onClick={() => { setAnchor(null); onEdit(project) }} sx={{ fontSize: 13, gap: 1 }}>
            <Edit sx={{ fontSize: 14 }} /> Edit
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { setAnchor(null); onChangeStatus(project) }} sx={{ fontSize: 13 }}>
            Change Status
          </MenuItem>
          {showLifecycleActions ? (
            <>
              <MenuItem onClick={() => { setAnchor(null); onArchive(project) }} sx={{ fontSize: 13, gap: 1 }}>
                <Archive sx={{ fontSize: 14 }} /> Archive Project
              </MenuItem>
              <MenuItem
                onClick={() => { setAnchor(null); onCancel(project) }}
                sx={{ fontSize: 13, gap: 1, color: 'error.main' }}
              >
                <CancelOutlined sx={{ fontSize: 14 }} /> Cancel Project
              </MenuItem>
            </>
          ) : null}
        </Menu>
      </Stack>

      {/* Project code */}
      <Typography variant="caption" sx={{ color: tokens.color.neutral[400], fontSize: 10, mt: '4px', display: 'block' }}>
        {formatProjectSite(project) || project.projectCode}
      </Typography>

      {/* Status row */}
      <Stack direction="row" alignItems="center" gap="6px" sx={{ mt: 1 }}>
        <ProgressBadge label={project.progress} />
      </Stack>

      <Divider sx={{ my: '10px' }} />

      {/* Info rows */}
      <Stack gap="6px">
        <Stack direction="row" alignItems="center" gap="5px">
          <PersonOutline sx={{ fontSize: 11, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            Lead: {project.projectManager}
          </Typography>
        </Stack>
        {project.location && (
          <Stack direction="row" alignItems="center" gap="5px">
            <LocationOn sx={{ fontSize: 11, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.location}
            </Typography>
          </Stack>
        )}
        <Box sx={{ mt: 0.5 }}>
          <ProjectTypeTags types={getProjectTypes(project)} maxVisible={3} />
        </Box>
      </Stack>

      <Divider sx={{ my: '10px' }} />

      {/* Value + dates */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, color: theme.palette.primary.main }}>
          ₹{formatCurrency(project.projectValue)}
        </Typography>
        {(project.startDate || project.expectedEndDate) && (
          <Typography variant="caption" sx={{ fontSize: 10, color: tokens.color.neutral[400] }}>
            {formatDate(project.startDate)} → {formatDate(project.expectedEndDate)}
          </Typography>
        )}
      </Stack>
    </MuiCard>
  )
}

// ─── Projects Grid ────────────────────────────────────────────────────────────

interface ProjectsGridProps {
  items: Project[]
  loading: boolean
  onView: (project: Project) => void
  onEdit: (project: Project) => void
  onChangeStatus: (project: Project) => void
  onArchive: (project: Project) => void
  onCancel: (project: Project) => void
}

function ProjectsGrid({
  items,
  loading,
  onView,
  onEdit,
  onChangeStatus,
  onArchive,
  onCancel,
}: ProjectsGridProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1,1fr)', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' },
          gap: '12px',
          p: 2,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ color: tokens.color.neutral[300], mb: 1, display: 'flex', justifyContent: 'center' }}>
          <FolderKanban size={40} strokeWidth={1.5} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          No projects found
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1,1fr)', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' },
        gap: '12px',
        p: 2,
      }}
    >
      {items.map((project) => (
        <ProjectGridCard
          key={project.id}
          project={project}
          onView={onView}
          onEdit={onEdit}
          onChangeStatus={onChangeStatus}
          onArchive={onArchive}
          onCancel={onCancel}
        />
      ))}
    </Box>
  )
}

// ─── Simple pagination ────────────────────────────────────────────────────────

function SimplePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: '14px', py: '10px', borderTop: `1px solid ${tokens.color.neutral[100]}` }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </Typography>
      <Stack direction="row" gap={1}>
        <MuiButton
          size="small"
          variant="outlined"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          sx={{ height: 28, minWidth: 64, fontSize: 12 }}
        >
          Prev
        </MuiButton>
        <MuiButton
          size="small"
          variant="outlined"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          sx={{ height: 28, minWidth: 64, fontSize: 12 }}
        >
          Next
        </MuiButton>
      </Stack>
    </Stack>
  )
}

// ─── Change Status Dialog ─────────────────────────────────────────────────────

interface ChangeStatusDialogProps {
  project: Project | null
  statusOptions: StatusMaster[]
  onClose: () => void
  onConfirm: (statusName: string) => void
}

function ChangeStatusDialog({ project, statusOptions, onClose, onConfirm }: ChangeStatusDialogProps) {
  const [selected, setSelected] = useState('')
  const activeOptions = statusOptions.filter((s) => s.status === 'active')

  useEffect(() => {
    setSelected(project?.progress ?? '')
  }, [project])

  if (!project) return null

  return (
    <Dialog open={Boolean(project)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>
        Change Project Status
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current status:{' '}
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
                Select new status…
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

// ─── Edit Project Drawer ──────────────────────────────────────────────────────

interface EditProjectDrawerProps {
  open: boolean
  project: Project | null
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
}: EditProjectDrawerProps) {
  const [form, setForm] = useState<Partial<Project>>({})

  useEffect(() => {
    if (project) setForm({ ...project })
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
      submitLabel="Save"
    >
      <FormSection title="Project Details" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Project Name" required>
            <Input
              value={form.name ?? ''}
              onChange={(v) => set('name', v)}
              placeholder="Project name"
              size="sm"
            />
          </FormField>
        </Box>

        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Project Type" required>
            <ProjectTypesField
              value={form.projectTypes ?? []}
              onChange={(v) => set('projectTypes', v)}
            />
          </FormField>
        </Box>

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

        <FormField label="Carpet Area (sq ft)">
          <Input
            type="number"
            value={form.carpetArea?.toString() ?? ''}
            onChange={(v) =>
              set('carpetArea', v ? Number(v) : null)
            }
            placeholder="e.g. 4500"
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
            placeholder="e.g. 120"
            size="sm"
          />
        </FormField>

        <FormField label="Workstation Size">
          <Input
            value={form.workstationSize ?? ''}
            onChange={(v) => set('workstationSize', v || null)}
            placeholder="e.g. 1200 sq ft"
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
            placeholder="e.g. 4"
            size="sm"
          />
        </FormField>

        <FormField label="Server Room Details">
          <Input
            value={form.serverRoomDetails ?? ''}
            onChange={(v) => set('serverRoomDetails', v || null)}
            placeholder="e.g. 200 sq ft, raised floor"
            size="sm"
          />
        </FormField>

        <FormField label="UPS Capacity">
          <Input
            value={form.upsCapacity ?? ''}
            onChange={(v) => set('upsCapacity', v || null)}
            placeholder="e.g. 20 KVA"
            size="sm"
          />
        </FormField>

        <FormField label="Reception Details">
          <Input
            value={form.receptionDetails ?? ''}
            onChange={(v) => set('receptionDetails', v || null)}
            placeholder="e.g. Open reception with waiting lounge"
            size="sm"
          />
        </FormField>

        <FormField label="Pantry Details">
          <Input
            value={form.pantryDetails ?? ''}
            onChange={(v) => set('pantryDetails', v || null)}
            placeholder="e.g. 2 pantries with wet and dry zones"
            size="sm"
          />
        </FormField>

        <FormField label="Project Manager" required>
          <MuiSelect
            value={form.projectManagerId ?? ''}
            onChange={(e) => {
              const opt = managerOptions.find((o) => o.value === e.target.value)
              set('projectManagerId', e.target.value)
              if (opt) set('projectManager', opt.label)
            }}
            size="small"
            fullWidth
            displayEmpty
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="" sx={{ fontSize: 12 }}>Select…</MenuItem>
            {managerOptions.map((o) => (
              <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12 }}>
                {o.label}
              </MenuItem>
            ))}
          </MuiSelect>
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
      </FormSection>
    </DrawerForm>
  )
}

// ─── ProjectsPage ─────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const toast = useToast()

  const { items: rawItems, loading, saving, filters, pagination, sortConfig } = useAppSelector(
    (s) => s.projects
  )
  const items = rawItems ?? []
  const users = useAppSelector((s) => s.users.items ?? [])
  const statusMasters = useAppSelector((s) => s.settings.statuses)

  // Local state
  const [activeTab, setActiveTab] = useState(() => filters.status || 'Live')
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    projectName: true,
    status: true,
    type: true,
    projectLead: true,
    dates: true,
  })
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [statusDialogProject, setStatusDialogProject] = useState<Project | null>(null)
  const [lifecycleConfirm, setLifecycleConfirm] = useState<{
    project: Project
    status: 'Archived' | 'Cancelled'
  } | null>(null)
  const [lifecycleSaving, setLifecycleSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Debounce timer
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load users + status master
  useEffect(() => {
    dispatch(fetchUsers({}))
    dispatch(fetchStatuses())
  }, [dispatch])

  // Default to Live tab/filter on entry unless a status already exists in current session state.
  useEffect(() => {
    if (!filters.status) {
      dispatch(setFilters({ status: 'Live' }))
    }
  }, [dispatch, filters.status])

  const refetch = useCallback(() => {
    dispatch(
      fetchProjects({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
        projectManager: filters.projectManager || undefined,
      })
    )
  }, [dispatch, pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    refetch()
  }, [refetch])

  // ── Computed ─────────────────────────────────────────────────────────────

  const filteredItems = useMemo(
    () => (activeTab === 'all' ? items : items.filter((p) => p.status === activeTab)),
    [items, activeTab]
  )

  // Client-side sort
  const tabFilteredItems = useMemo(() => {
    if (!sortConfig.field) return filteredItems
    return [...filteredItems].sort((a, b) => {
      const field = sortConfig.field as keyof Project
      const rawA = a[field]
      const rawB = b[field]
      let cmp = 0
      if (typeof rawA === 'number' && typeof rawB === 'number') {
        cmp = rawA - rawB
      } else {
        const aStr = String(rawA ?? '').toLowerCase()
        const bStr = String(rawB ?? '').toLowerCase()
        cmp = aStr.localeCompare(bStr)
      }
      return sortConfig.direction === 'asc' ? cmp : -cmp
    })
  }, [filteredItems, sortConfig])

  const statCards = [
    {
      label: 'TOTAL PROJECTS',
      value: pagination.total,
      variant: 'default' as const,
      icon: <FolderKanban size={24} strokeWidth={1.75} />,
    },
    {
      label: 'LIVE PROJECTS',
      value: items.filter((p) => p.status === 'Live').length,
      variant: 'success' as const,
      icon: <PlayCircle sx={{ fontSize: 24 }} />,
    },
    {
      label: 'COMPLETED',
      value: items.filter((p) => p.status === 'Completed').length,
      variant: 'info' as const,
      icon: <CheckCircle sx={{ fontSize: 24 }} />,
    },
  ]

  const tabs = [
    { label: 'All', value: 'all', count: items.length },
    { label: 'Pitch', value: 'Pitch', count: items.filter((p) => p.status === 'Pitch').length },
    { label: 'Live', value: 'Live', count: items.filter((p) => p.status === 'Live').length },
    {
      label: 'Completed',
      value: 'Completed',
      count: items.filter((p) => p.status === 'Completed').length,
    },
    {
      label: 'Cancelled',
      value: 'Cancelled',
      count: items.filter((p) => p.status === 'Cancelled').length,
    },
    {
      label: 'Archived',
      value: 'Archived',
      count: items.filter((p) => p.status === 'Archived').length,
    },
  ]

  const managerOptions = users
    .filter((u) => isProjectManagerRole(u.role))
    .map((u) => ({ value: u.id, label: u.name }))

  const filterConfig = [
    {
      field: 'status',
      label: 'Status',
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
      field: 'type',
      label: 'Project Scope',
      type: 'select' as const,
      options: [
        { label: 'All', value: '' },
        ...PROJECT_TYPE_OPTIONS.map((t) => ({ label: t, value: t })),
      ],
    },
    {
      field: 'projectManager',
      label: 'Project Lead',
      type: 'select' as const,
      options: [
        { label: 'All', value: '' },
        ...managerOptions.map((o) => ({ label: o.label, value: o.value })),
      ],
    },
  ]

  const columnItems = [
    { field: 'status', label: 'Status', visible: columnVisibility.status },
    { field: 'type', label: 'Scope', visible: columnVisibility.type },
    { field: 'projectLead', label: 'Project Lead', visible: columnVisibility.projectLead },
    { field: 'dates', label: 'Dates', visible: columnVisibility.dates },
  ]

  const activeFilterCount = [filters.status, filters.type, filters.projectManager].filter(
    Boolean
  ).length

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSearch(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      dispatch(setFilters({ search: value }))
    }, 300)
  }

  function handleFilterChange(vals: Record<string, unknown>) {
    dispatch(
      setFilters({
        status: (vals.status as string) ?? '',
        type: (vals.type as string) ?? '',
        projectManager: (vals.projectManager as string) ?? '',
      })
    )
  }

  function handleFilterReset() {
    dispatch(resetFilters())
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    if (tab !== 'all') {
      dispatch(setFilters({ status: tab }))
    } else {
      dispatch(setFilters({ status: '' }))
    }
  }

  function handleSort(field: string) {
    const newDirection =
      sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    dispatch(setSortConfig({ field, direction: newDirection }))
  }

  function handleColumnToggle(field: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [field]: visible }))
  }

  function handlePageChange(newPage: number) {
    dispatch(setPage(newPage))
  }

  function handleView(project: Project) {
    navigate(`/projects/${toSlug(project.name)}`)
  }

  function handleEdit(project: Project) {
    setEditingProject(project)
    setEditDrawerOpen(true)
  }

  async function handleEditSave(data: Partial<Project>) {
    if (!editingProject) return
    try {
      await dispatch(updateProject({ id: editingProject.id, data })).unwrap()
      toast.success('Project updated')
      setEditDrawerOpen(false)
      setEditingProject(null)
    } catch {
      toast.error('Failed to update project')
    }
  }

  async function handleStatusConfirm(statusName: string) {
    if (!statusDialogProject) return
    try {
      const lifecycle = lifecycleStatusForMasterName(statusName)
      await dispatch(
        updateProject({
          id: statusDialogProject.id,
          data: { progress: statusName },
        })
      ).unwrap()
      if (lifecycle && lifecycle !== statusDialogProject.status) {
        await dispatch(
          changeProjectStatus({ id: statusDialogProject.id, status: lifecycle })
        ).unwrap()
      }
      toast.success(`Status changed to ${statusName}`)
      setStatusDialogProject(null)
    } catch {
      toast.error('Failed to change status')
    }
  }

  async function handleLifecycleConfirm() {
    if (!lifecycleConfirm) return
    const { project, status } = lifecycleConfirm
    setLifecycleSaving(true)
    try {
      await dispatch(changeProjectStatus({ id: project.id, status })).unwrap()
      toast.success(
        status === 'Archived'
          ? 'Project archived'
          : 'Project cancelled',
      )
      setLifecycleConfirm(null)
    } catch {
      toast.error(
        status === 'Archived'
          ? 'Failed to archive project'
          : 'Failed to cancel project',
      )
    } finally {
      setLifecycleSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ListingTemplate
        icon={<FolderKanban size={20} strokeWidth={1.75} />}
        title="Projects"
        subtitle="Track and manage all design projects"
        primaryAction={{
          label: 'Create Project',
          onClick: () => navigate('/projects/create'),
          startIcon: <Plus size={16} strokeWidth={2} />,
        }}
        statCards={statCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchPlaceholder="Search projects…"
        onSearchChange={handleSearch}
        filterConfig={filterConfig}
        activeFilters={{
          status: filters.status,
          type: filters.type,
          projectManager: filters.projectManager,
        }}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        filterCount={activeFilterCount}
        columns={columnItems}
        onColumnVisibilityChange={handleColumnToggle}
        showViewToggle={true}
        onViewModeChange={(mode) => setViewMode(mode === 'grid' ? 'grid' : 'table')}
      >
        {viewMode === 'grid' ? (
          <ProjectsGrid
            items={tabFilteredItems}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onChangeStatus={(p) => setStatusDialogProject(p)}
            onArchive={(p) => setLifecycleConfirm({ project: p, status: 'Archived' })}
            onCancel={(p) => setLifecycleConfirm({ project: p, status: 'Cancelled' })}
          />
        ) : (
          <ProjectsTable
            items={tabFilteredItems}
            loading={loading}
            columns={columnVisibility}
            sortField={sortConfig.field}
            sortDirection={sortConfig.direction}
            onSort={handleSort}
            onView={handleView}
            onEdit={handleEdit}
            onChangeStatus={(p) => setStatusDialogProject(p)}
            onArchive={(p) => setLifecycleConfirm({ project: p, status: 'Archived' })}
            onCancel={(p) => setLifecycleConfirm({ project: p, status: 'Cancelled' })}
          />
        )}
        <SimplePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={handlePageChange}
        />
      </ListingTemplate>

      {/* Edit Project Drawer */}
      <EditProjectDrawer
        open={editDrawerOpen}
        project={editingProject}
        onClose={() => { setEditDrawerOpen(false); setEditingProject(null) }}
        onSave={handleEditSave}
        saving={saving}
        managerOptions={managerOptions}
      />

      {/* Change Status Dialog */}
      <ChangeStatusDialog
        project={statusDialogProject}
        statusOptions={statusMasters}
        onClose={() => setStatusDialogProject(null)}
        onConfirm={handleStatusConfirm}
      />

      <ConfirmDialog
        open={Boolean(lifecycleConfirm)}
        onClose={() => {
          if (lifecycleSaving) return
          setLifecycleConfirm(null)
        }}
        onConfirm={handleLifecycleConfirm}
        loading={lifecycleSaving}
        variant={lifecycleConfirm?.status === 'Cancelled' ? 'destructive' : 'default'}
        title={
          lifecycleConfirm?.status === 'Archived'
            ? 'Archive Project?'
            : 'Cancel Project?'
        }
        description={
          lifecycleConfirm?.status === 'Archived'
            ? `“${lifecycleConfirm.project.name}” will be moved to the Archived tab. All project data will be preserved.`
            : `“${lifecycleConfirm?.project.name ?? ''}” will be moved to the Cancelled tab. All project data will be preserved for historical records.`
        }
        confirmLabel={
          lifecycleConfirm?.status === 'Archived' ? 'Archive Project' : 'Cancel Project'
        }
        cancelLabel="Keep Project"
      />
    </>
  )
}

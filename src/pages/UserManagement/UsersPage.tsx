import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  IconButton as MuiIconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  TextField,
  MenuItem,
} from '@mui/material'
import {
  Group,
  CheckCircle,
  Block,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import { Users } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchUsers, createUser, updateUser, toggleUserStatus, deleteUser } from '../../slices/users/thunk'
import { setFilters, resetFilters, setSortConfig } from '../../slices/users/reducer'
import type { User } from '../../slices/users/reducer'
import { ListingTemplate } from '../../components/templates'
import type { FilterField } from '../../components/templates/ListingTemplate'
import { DrawerForm, FormSection, FormField } from '../../components/templates'
import { StatusBadge, useToast } from '@/design-system/components'
import { getInitials, getAvatarColor, formatDate } from '../../utils/formatters'
import { tokens } from '@/design-system/tokens'

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<User['role'], { label: string; bg: string; color: string }> = {
  admin:        { label: 'Admin',        bg: '#E8F5F2', color: '#107E68' },
  power_user:   { label: 'Power User',   bg: '#EFF6FF', color: '#1D4ED8' },
  project_user: { label: 'Project User', bg: '#F0FDF4', color: '#15803D' },
  viewer:       { label: 'Viewer',       bg: '#F3F4F6', color: '#6B7280' },
}

const ROLE_DESCRIPTIONS: Record<User['role'], string> = {
  admin:        'Full system access including metadata and settings management',
  power_user:   'Full access across all modules and projects',
  project_user: 'Access to assigned projects only',
  viewer:       'Read-only access across assigned projects',
}

// ─── User Avatar ──────────────────────────────────────────────────────────────

function UserAvatar({ name }: { name: string }) {
  const { bg, text } = getAvatarColor(name)
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: bg,
        color: text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </Box>
  )
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string
  field: string
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  sx?: object
}

function SortHeader({ label, field, sortField, sortDirection, onSort, sx }: SortHeaderProps) {
  const isActive = sortField === field
  function handleClick() {
    onSort(field, isActive && sortDirection === 'asc' ? 'desc' : 'asc')
  }
  return (
    <TableCell
      onClick={handleClick}
      sx={{
        fontSize: 11,
        fontWeight: isActive ? 700 : 600,
        color: isActive ? 'primary.main' : 'text.secondary',
        py: '8px',
        px: '14px',
        borderBottom: `2px solid ${tokens.color.neutral[100]}`,
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { color: 'primary.main' },
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center" gap="2px">
        {label}
        {isActive
          ? sortDirection === 'asc'
            ? <KeyboardArrowUpIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            : <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          : <UnfoldMoreIcon sx={{ fontSize: 14, color: tokens.color.neutral[300] }} />
        }
      </Stack>
    </TableCell>
  )
}

const STATIC_CELL_SX = {
  fontSize: 11, fontWeight: 600, color: 'text.secondary',
  py: '8px', px: '14px', borderBottom: `2px solid ${tokens.color.neutral[100]}`,
}

// ─── Users Table ──────────────────────────────────────────────────────────────

interface UsersTableProps {
  items: User[]
  loading: boolean
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onEdit: (user: User) => void
  onToggleStatus: (user: User) => void
  onDelete: (user: User) => void
}

function UsersTable({
  items, loading, sortField, sortDirection, onSort, onEdit, onToggleStatus, onDelete,
}: UsersTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <SortHeader label="Name" field="name" sortField={sortField} sortDirection={sortDirection} onSort={onSort} sx={{ minWidth: 200 }} />
            <SortHeader label="Role" field="role" sortField={sortField} sortDirection={sortDirection} onSort={onSort} sx={{ width: 160 }} />
            <TableCell sx={{ ...STATIC_CELL_SX, width: 120 }}>Phone</TableCell>
            <SortHeader label="Projects" field="assignedProjects" sortField={sortField} sortDirection={sortDirection} onSort={onSort} sx={{ width: 100 }} />
            <SortHeader label="Last Login" field="lastLogin" sortField={sortField} sortDirection={sortDirection} onSort={onSort} sx={{ width: 150 }} />
            <TableCell sx={{ ...STATIC_CELL_SX, width: 100 }}>Status</TableCell>
            <TableCell sx={{ ...STATIC_CELL_SX, width: 80, position: 'sticky', right: 0, bgcolor: 'background.paper' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && [...Array(5)].map((_, i) => (
            <TableRow key={i}>
              {[...Array(7)].map((__, j) => (
                <TableCell key={j} sx={{ py: '10px', px: '14px' }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </TableCell>
              ))}
            </TableRow>
          ))}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} sx={{ border: 0 }}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Users size={32} color={tokens.color.neutral[300]} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                    No users found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add your first user to get started
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}

          {!loading && items.map((user) => {
            const roleConf = ROLE_CONFIG[user.role]
            const projectCount = user.assignedProjects.length
            return (
              <TableRow
                key={user.id}
                sx={{
                  '&:hover': { bgcolor: hoverBg },
                  '&:last-child td': { border: 0 },
                }}
              >
                {/* Name */}
                <TableCell sx={{ py: '10px', px: '14px' }}>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <UserAvatar name={user.name} />
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.3 }}>
                        {user.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>

                {/* Role */}
                <TableCell sx={{ py: '10px', px: '14px' }}>
                  <MuiChip
                    label={roleConf.label}
                    size="small"
                    sx={{
                      bgcolor: roleConf.bg,
                      color: roleConf.color,
                      fontSize: 11,
                      height: 20,
                      fontWeight: 600,
                      '& .MuiChip-label': { px: '8px' },
                    }}
                  />
                </TableCell>

                {/* Phone */}
                <TableCell sx={{ py: '10px', px: '14px' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {user.phone ?? '—'}
                  </Typography>
                </TableCell>

                {/* Projects */}
                <TableCell sx={{ py: '10px', px: '14px' }}>
                  <MuiChip
                    label={projectCount > 0 ? `${projectCount} projects` : 'None'}
                    size="small"
                    sx={{
                      bgcolor: projectCount > 0 ? '#E8F5F2' : '#F3F4F6',
                      color: projectCount > 0 ? '#107E68' : '#9CA3AF',
                      fontSize: 11,
                      height: 20,
                      fontWeight: 600,
                      '& .MuiChip-label': { px: '8px' },
                    }}
                  />
                </TableCell>

                {/* Last Login */}
                <TableCell sx={{ py: '10px', px: '14px' }}>
                  {user.lastLogin ? (
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {formatDate(user.lastLogin)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12, fontStyle: 'italic' }}>
                      Never logged in
                    </Typography>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell sx={{ py: '10px', px: '14px' }}>
                  <StatusBadge status={user.status} />
                </TableCell>

                {/* Actions */}
                <TableCell sx={{ py: '10px', px: '8px', position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                  <Stack direction="row" alignItems="center" gap={0.25}>
                    <MuiIconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onEdit(user) }}
                      sx={{ color: 'text.secondary' }}
                    >
                      <Edit sx={{ fontSize: 15 }} />
                    </MuiIconButton>

                    <Tooltip title={user.status === 'active' ? 'Deactivate' : 'Activate'}>
                      <MuiIconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onToggleStatus(user) }}
                        sx={{ color: user.status === 'active' ? 'warning.main' : 'success.main' }}
                      >
                        {user.status === 'active'
                          ? <Block sx={{ fontSize: 15 }} />
                          : <CheckCircle sx={{ fontSize: 15 }} />
                        }
                      </MuiIconButton>
                    </Tooltip>

                    <Tooltip title={
                      user.assignedProjects.length > 0
                        ? 'Cannot delete — has assigned projects'
                        : 'Delete user'
                    }>
                      <span>
                        <MuiIconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onDelete(user) }}
                          disabled={user.assignedProjects.length > 0}
                          sx={{
                            color: 'error.main',
                            '&.Mui-disabled': { color: 'action.disabled' },
                          }}
                        >
                          <Delete sx={{ fontSize: 15 }} />
                        </MuiIconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ─── User Drawer ──────────────────────────────────────────────────────────────

interface UserDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  user?: User | null
}

interface FormState {
  name: string
  email: string
  phone: string
  role: User['role'] | ''
  status: User['status']
}

const defaultForm: FormState = {
  name: '',
  email: '',
  phone: '',
  role: '',
  status: 'active',
}

function validateForm(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (!form.role) {
    errors.role = 'Role is required'
  }
  return errors
}

function UserDrawer({ open, onClose, mode, user }: UserDrawerProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.users.saving)
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        setForm({
          name: user.name,
          email: user.email,
          phone: user.phone ?? '',
          role: user.role,
          status: user.status,
        })
      } else {
        setForm(defaultForm)
      }
      setErrors({})
      setTouched({})
    }
  }, [open, mode, user])

  function handleChange(field: keyof FormState, value: string) {
    const updated = { ...form, [field]: value }
    setForm(updated)
    if (touched[field]) {
      const newErrors = validateForm(updated)
      setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? '' }))
    }
  }

  function handleBlur(field: keyof FormState) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const newErrors = validateForm(form)
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? '' }))
  }

  function handleSubmit() {
    const allTouched = { name: true, email: true, role: true }
    setTouched(allTouched)
    const errs = validateForm(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role as User['role'],
      status: form.status,
    }

    if (mode === 'add') {
      dispatch(createUser(payload as Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'assignedProjects'>))
        .unwrap()
        .then(() => {
          showToast({ message: 'User created successfully', severity: 'success' })
          onClose()
        })
        .catch(() => {
          showToast({ message: 'Failed to create user', severity: 'error' })
        })
    } else if (user) {
      dispatch(updateUser({ id: user.id, data: payload }))
        .unwrap()
        .then(() => {
          showToast({ message: 'User updated successfully', severity: 'success' })
          onClose()
        })
        .catch(() => {
          showToast({ message: 'Failed to update user', severity: 'error' })
        })
    }
  }

  const selectedRole = form.role as User['role'] | ''

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add User' : 'Edit User'}
      subtitle={mode === 'add' ? 'Create a new system user' : user?.name}
      onSubmit={handleSubmit}
      submitLabel={mode === 'add' ? 'Create User' : 'Save Changes'}
      submitLoading={saving}
      width={480}
    >
      <FormSection title="Personal Details" columns={2} divider={false}>
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Full Name" required error={touched.name ? errors.name : undefined}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              error={Boolean(touched.name && errors.name)}
              inputProps={{ style: { fontSize: 13 } }}
            />
          </FormField>
        </Box>

        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Email Address" required error={touched.email ? errors.email : undefined} hint="Used for login">
            <TextField
              size="small"
              fullWidth
              type="email"
              placeholder="e.g. rahul@interics.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              error={Boolean(touched.email && errors.email)}
              inputProps={{ style: { fontSize: 13 } }}
            />
          </FormField>
        </Box>

        <Box sx={{ gridColumn: 'span 1' }}>
          <FormField label="Phone Number">
            <TextField
              size="small"
              fullWidth
              placeholder="+91 98200 00000"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              inputProps={{ style: { fontSize: 13 } }}
            />
          </FormField>
        </Box>
      </FormSection>

      <FormSection title="Access & Role" columns={1}>
        <FormField label="Role" required error={touched.role ? errors.role : undefined}>
          <TextField
            select
            size="small"
            fullWidth
            value={form.role}
            onChange={(e) => handleChange('role', e.target.value)}
            onBlur={() => handleBlur('role')}
            error={Boolean(touched.role && errors.role)}
            inputProps={{ style: { fontSize: 13 } }}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="power_user">Power User</MenuItem>
            <MenuItem value="project_user">Project User</MenuItem>
            <MenuItem value="viewer">Viewer</MenuItem>
          </TextField>
          {selectedRole && (
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: '#F8FAFB',
                borderRadius: '8px',
                border: '1px solid #E8EEEC',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {ROLE_DESCRIPTIONS[selectedRole]}
              </Typography>
            </Box>
          )}
        </FormField>

        {mode === 'edit' && (
          <FormField label="Status">
            <TextField
              select
              size="small"
              fullWidth
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              inputProps={{ style: { fontSize: 13 } }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </FormField>
        )}
      </FormSection>
    </DrawerForm>
  )
}

// ─── Toggle Status Dialog ─────────────────────────────────────────────────────

interface ToggleDialogProps {
  open: boolean
  user: User | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}

function ToggleStatusDialog({ open, user, onClose, onConfirm, saving }: ToggleDialogProps) {
  const isActive = user?.status === 'active'
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>
        {isActive ? 'Deactivate User' : 'Activate User'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          {isActive
            ? `Deactivate ${user?.name}? They will lose system access immediately.`
            : `Activate ${user?.name}? They will regain system access.`
          }
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          color={isActive ? 'warning' : 'success'}
          onClick={onConfirm}
          disabled={saving}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean
  user: User | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}

function DeleteDialog({ open, user, onClose, onConfirm, saving }: DeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Delete User</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Delete {user?.name}? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton size="small" variant="contained" color="error" onClick={onConfirm} disabled={saving}>
          Delete
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

// ─── Filter config ────────────────────────────────────────────────────────────

const filterConfig: FilterField[] = [
  {
    field: 'role',
    label: 'Role',
    type: 'select',
    options: [
      { value: '', label: 'All Roles' },
      { value: 'admin', label: 'Admin' },
      { value: 'power_user', label: 'Power User' },
      { value: 'project_user', label: 'Project User' },
      { value: 'viewer', label: 'Viewer' },
    ],
  },
  {
    field: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const dispatch = useAppDispatch()
  const { items, loading, filters, sortConfig } = useAppSelector((s) => s.users)
  const { showToast } = useToast()

  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionSaving, setActionSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    dispatch(fetchUsers({}))
  }, [dispatch])

  const filteredItems = useMemo(() => {
    let result = [...items]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    }
    if (filters.role) {
      result = result.filter((u) => u.role === filters.role)
    }
    if (filters.status) {
      result = result.filter((u) => u.status === filters.status)
    }
    if (activeTab !== 'all') {
      result = result.filter((u) => u.status === activeTab)
    }

    const { field, direction } = sortConfig
    result.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''
      if (field === 'name') { aVal = a.name; bVal = b.name }
      else if (field === 'role') { aVal = a.role; bVal = b.role }
      else if (field === 'assignedProjects') { aVal = a.assignedProjects.length; bVal = b.assignedProjects.length }
      else if (field === 'lastLogin') { aVal = a.lastLogin ?? ''; bVal = b.lastLogin ?? '' }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [items, filters, sortConfig, activeTab])

  const totalUsers = items.length
  const activeUsers = items.filter((u) => u.status === 'active').length
  const powerUsers = items.filter((u) => u.role === 'admin' || u.role === 'power_user').length
  const inactiveUsers = items.filter((u) => u.status === 'inactive').length

  const tabs = [
    { label: 'All', value: 'all', count: items.length },
    { label: 'Active', value: 'active', count: items.filter((u) => u.status === 'active').length },
    { label: 'Inactive', value: 'inactive', count: items.filter((u) => u.status === 'inactive').length },
  ]

  const statCards = [
    { label: 'Total Users', value: totalUsers, color: 'default' as const, icon: <Group sx={{ fontSize: 20 }} /> },
    { label: 'Active Users', value: activeUsers, color: 'success' as const, icon: <CheckCircle sx={{ fontSize: 20 }} /> },
    { label: 'Admins & Power Users', value: powerUsers, color: 'info' as const, icon: <Group sx={{ fontSize: 20 }} /> },
    { label: 'Inactive Users', value: inactiveUsers, color: 'warning' as const, icon: <Block sx={{ fontSize: 20 }} /> },
  ]

  const activeFilters = useMemo(() => {
    const f: Record<string, unknown> = {}
    if (filters.role) f.role = filters.role
    if (filters.status) f.status = filters.status
    return f
  }, [filters])

  function handleSort(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
  }

  function openToggleDialog(user: User) {
    setToggleTarget(user)
    setToggleDialogOpen(true)
  }

  function openDeleteDialog(user: User) {
    setDeleteTarget(user)
    setDeleteDialogOpen(true)
  }

  function handleConfirmToggle() {
    if (!toggleTarget) return
    setActionSaving(true)
    dispatch(toggleUserStatus(toggleTarget.id))
      .unwrap()
      .then(() => {
        const wasActive = toggleTarget.status === 'active'
        setToggleDialogOpen(false)
        setToggleTarget(null)
        showToast({ message: wasActive ? 'User deactivated' : 'User activated', severity: 'success' })
      })
      .catch(() => {
        showToast({ message: 'Failed to update status', severity: 'error' })
      })
      .finally(() => setActionSaving(false))
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    setActionSaving(true)
    dispatch(deleteUser(deleteTarget.id))
      .unwrap()
      .then(() => {
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
        showToast({ message: 'User deleted', severity: 'success' })
      })
      .catch(() => {
        showToast({ message: 'Failed to delete user', severity: 'error' })
      })
      .finally(() => setActionSaving(false))
  }

  function handleExport() {
    const rows = [
      ['Name', 'Email', 'Phone', 'Role', 'Projects', 'Last Login', 'Status'],
      ...filteredItems.map((u) => [
        u.name,
        u.email,
        u.phone ?? '',
        ROLE_CONFIG[u.role].label,
        u.assignedProjects.length.toString(),
        u.lastLogin ? formatDate(u.lastLogin) : 'Never',
        u.status,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <ListingTemplate
        title="User Management"
        subtitle="Manage system users, roles, and access"
        icon={<Users size={20} />}
        primaryAction={{
          label: '+ Add User',
          onClick: () => setAddDrawerOpen(true),
          startIcon: <Add sx={{ fontSize: 16 }} />,
        }}
        statCards={statCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchPlaceholder="Search users..."
        searchValue={filters.search}
        onSearchChange={(val) => dispatch(setFilters({ search: val }))}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={(newFilters) => {
          const params: Partial<{ search: string; role: string; status: string }> = {}
          for (const [k, v] of Object.entries(newFilters)) {
            (params as Record<string, string>)[k] = (v as string) || ''
          }
          dispatch(setFilters(params))
        }}
        onFilterReset={() => dispatch(resetFilters())}
        onExport={handleExport}
        showViewToggle={false}
        totalCount={filteredItems.length}
      >
        <UsersTable
          items={filteredItems}
          loading={loading}
          sortField={sortConfig.field}
          sortDirection={sortConfig.direction}
          onSort={handleSort}
          onEdit={(user) => setEditUser(user)}
          onToggleStatus={openToggleDialog}
          onDelete={openDeleteDialog}
        />
      </ListingTemplate>

      <UserDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        mode="add"
      />

      <UserDrawer
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        mode="edit"
        user={editUser}
      />

      <ToggleStatusDialog
        open={toggleDialogOpen}
        user={toggleTarget}
        onClose={() => { setToggleDialogOpen(false); setToggleTarget(null) }}
        onConfirm={handleConfirmToggle}
        saving={actionSaving}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        user={deleteTarget}
        onClose={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }}
        onConfirm={handleConfirmDelete}
        saving={actionSaving}
      />
    </>
  )
}

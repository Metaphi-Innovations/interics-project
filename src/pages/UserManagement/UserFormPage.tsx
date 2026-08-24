import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip as MuiChip,
  CircularProgress,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createUser, updateUser, fetchUsers, toUiUser } from '@/slices/users/thunk'
import { fetchRoles } from '@/slices/roles/thunk'
import type { User } from '@/slices/users/reducer'
import { FormSection, FormField } from '@/components/templates'
import PageHeader from '@/components/layout/PageHeader'
import { Button, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { usersApi } from '@/api/usersApi'
import { modulesApi } from '@/api/modulesApi'
import { permissionTemplatesApi, type PermissionTemplate } from '@/api/permissionTemplatesApi'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type { PermissionModuleTree, UserPermissions } from '@/types/permissions'
import {
  accessInputToUserPermissions,
  cloneUserPermissions,
  makeEmptyUserPermissions,
  userPermissionsToAccessInput,
} from '@/types/permissions'
import { normalizeArrayResponse } from '@/utils/normalizeListResponse'
import { MODULE_DEFS, RolePermissionsPanel } from './components/RolePermissionsPanel'

interface FormState {
  name: string
  email: string
  phone: string
  employeeId: string
  role: string
  password: string
}

const defaultForm: FormState = {
  name: '',
  email: '',
  phone: '',
  employeeId: '',
  role: '',
  password: '',
}

const LEVEL_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: 'Admin',
  1: 'Power User',
  2: 'Project User',
  3: 'Viewer',
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must contain a special character'
  }
  return undefined
}

function validateForm(
  form: FormState,
  allUsers: User[],
  options: { editId?: string; requirePassword?: boolean } = {},
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  } else {
    const dup = allUsers.find((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== options.editId)
    if (dup) errors.email = 'Email is already in use'
  }
  if (!form.role) errors.role = 'Role is required'
  if (options.requirePassword) {
    const passwordError = validatePassword(form.password)
    if (passwordError) errors.password = passwordError
  }
  return errors
}

export default function UserFormPage() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const isCreate = editId === undefined

  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.users.saving)
  const allUsers = useAppSelector((s) => s.users.items ?? [])
  const roles = useAppSelector((s) => s.roles.items ?? [])
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [permissions, setPermissions] = useState<UserPermissions>(() => makeEmptyUserPermissions())
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [expandedModules, setExpandedModules] = useState<string[]>(() => MODULE_DEFS.map((m) => m.id))
  const [loadUserState, setLoadUserState] = useState<'idle' | 'loading' | 'error' | 'ready'>(
    isCreate ? 'ready' : 'loading',
  )
  const [loadedUser, setLoadedUser] = useState<User | null>(null)
  const [moduleTree, setModuleTree] = useState<PermissionModuleTree | null>(null)
  const [templates, setTemplates] = useState<PermissionTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  useEffect(() => {
    dispatch(fetchRoles())
    dispatch(fetchUsers({}))
    void modulesApi.getTree().then(setModuleTree).catch(() => setModuleTree(null))
    void permissionTemplatesApi
      .getAll({ limit: 100 })
      .then((res) => {
        const raw = normalizeArrayResponse<PermissionTemplate>(unwrapApiData(res.data) ?? res.data)
        setTemplates(raw)
      })
      .catch(() => setTemplates([]))
  }, [dispatch])

  useEffect(() => {
    if (isCreate) {
      setLoadedUser(null)
      setLoadUserState('ready')
      setForm(defaultForm)
      setPermissions(makeEmptyUserPermissions())
      setStatus('active')
      setErrors({})
      setTouched({})
      setSelectedTemplateId('')
      setExpandedModules(MODULE_DEFS.map((m) => m.id))
      return
    }

    if (!editId) return

    let cancelled = false
    setLoadUserState('loading')
    usersApi
      .getById(editId)
      .then((res) => {
        if (cancelled) return
        const user = toUiUser(unwrapApiData(res.data))
        setLoadedUser(user)
        setLoadUserState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setLoadUserState('error')
      })

    return () => {
      cancelled = true
    }
  }, [isCreate, editId])

  useEffect(() => {
    if (!loadedUser || loadUserState !== 'ready' || isCreate) return

    setForm({
      name: loadedUser.name,
      email: loadedUser.email,
      phone: loadedUser.phone ?? '',
      employeeId: loadedUser.employeeId ?? '',
      role: loadedUser.role,
      password: '',
    })
    setPermissions(cloneUserPermissions(loadedUser.permissions))
    setStatus(loadedUser.status)
    setErrors({})
    setTouched({})
    setSelectedTemplateId(loadedUser.permissionTemplateId ?? '')
    setExpandedModules(MODULE_DEFS.map((m) => m.id))
  }, [loadedUser, loadUserState, isCreate])

  const handleChange = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  function handleBlur(field: keyof FormState) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const newErrors = validateForm(form, allUsers, {
      editId: loadedUser?.id,
      requirePassword: isCreate,
    })
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? '' }))
  }

  function handleCancel() {
    navigate('/user-management/users')
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId)
    if (!templateId || !moduleTree) return
    const template = templates.find((item) => item.id === templateId)
    if (template) {
      setPermissions(accessInputToUserPermissions(template.access, moduleTree))
    }
  }

  function handleSubmit() {
    const allTouched: Record<string, boolean> = {
      name: true,
      email: true,
      role: true,
      ...(isCreate ? { password: true } : {}),
    }
    setTouched(allTouched)
    const errs = validateForm(form, allUsers, {
      editId: loadedUser?.id,
      requirePassword: isCreate,
    })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (!moduleTree) {
      showToast({ title: 'Permission modules are still loading', variant: 'error' })
      return
    }

    const projectAccess = isCreate ? 'all' : loadedUser!.projectAccess
    const assignedProjects = isCreate ? [] : [...(loadedUser!.assignedProjects ?? [])]

    const payload: Omit<User, 'id' | 'createdAt' | 'lastLogin'> = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      employeeId: form.employeeId.trim() || undefined,
      role: form.role,
      permissionTemplateId: selectedTemplateId || null,
      permissions: cloneUserPermissions(permissions),
      projectAccess,
      assignedProjects,
      status: !isCreate && loadedUser ? status : 'active',
    }
    const access = userPermissionsToAccessInput(permissions, moduleTree)

    if (isCreate) {
      dispatch(createUser({ ...payload, password: form.password, access }))
        .unwrap()
        .then(() => {
          showToast({ title: 'User created successfully', variant: 'success' })
          navigate('/user-management/users')
        })
        .catch(() => showToast({ title: 'Failed to create user', variant: 'error' }))
    } else if (loadedUser) {
      dispatch(updateUser({ id: loadedUser.id, data: { ...payload, access } }))
        .unwrap()
        .then(() => {
          showToast({ title: 'User updated successfully', variant: 'success' })
          navigate('/user-management/users')
        })
        .catch(() => showToast({ title: 'Failed to update user', variant: 'error' }))
    }
  }

  const breadcrumbLast = isCreate ? 'Add User' : loadedUser ? `Edit ${loadedUser.name}` : 'Edit User'

  const pageTitle = isCreate ? 'Add User' : 'Edit User'

  if (!isCreate && loadUserState === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (!isCreate && loadUserState === 'error') {
    return (
      <Stack gap={2}>
        <Typography color="error">User not found.</Typography>
        <Button variant="outlined" color="secondary" size="sm" onClick={handleCancel} sx={{ mt: 2 }}>
          Back to Users
        </Button>
      </Stack>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'User Management', href: '/user-management/users' },
          { label: 'Users', href: '/user-management/users' },
          { label: breadcrumbLast },
        ]}
        title={pageTitle}
        actions={
          <Stack direction="row" gap={1}>
            <Button variant="outlined" color="secondary" size="sm" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={saving}
              sx={{ bgcolor: tokens.color.success[600], '&:hover': { bgcolor: tokens.color.success[700] } }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        }
      />

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          p: { xs: 2, md: 3 },
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} gap={3} alignItems="flex-start">
          <Box sx={{ width: { xs: 1, md: 400 }, flexShrink: 0 }}>
            <FormSection title="Basic Info" columns={1} divider={false}>
              <FormField label="Name" required error={touched.name ? errors.name : undefined}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="e.g. Rajan Mehta"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  error={Boolean(touched.name && errors.name)}
                  inputProps={{ style: { fontSize: 13 } }}
                />
              </FormField>
              {isCreate && (
                <FormField
                  label="Password"
                  required
                  error={touched.password ? errors.password : undefined}
                  hint="Min 8 characters, with uppercase, lowercase, number, and special character"
                >
                  <TextField
                    size="small"
                    fullWidth
                    type="password"
                    autoComplete="new-password"
                    placeholder="Set a login password"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    error={Boolean(touched.password && errors.password)}
                    inputProps={{ style: { fontSize: 13 } }}
                  />
                </FormField>
              )}
              <FormField label="Email" required error={touched.email ? errors.email : undefined} hint="Used for login">
                <TextField
                  size="small"
                  fullWidth
                  type="email"
                  placeholder="e.g. rajan@interics.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  error={Boolean(touched.email && errors.email)}
                  inputProps={{ style: { fontSize: 13 } }}
                />
              </FormField>
              <FormField label="Phone">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="+91 98200 00000"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  inputProps={{ style: { fontSize: 13 } }}
                />
              </FormField>
              <FormField label="Employee ID">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="e.g. EMP-001"
                  value={form.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  inputProps={{ style: { fontSize: 13 } }}
                />
              </FormField>
            </FormSection>

            <FormSection title="Role" columns={1}>
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
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {r.name}
                        </Typography>
                        <MuiChip
                          label={LEVEL_LABELS[r.level]}
                          size="small"
                          sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                        />
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Role is for display and grouping only — it does not change permissions automatically.
                </Typography>
              </FormField>
              <FormField label="Permission Template">
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  inputProps={{ style: { fontSize: 13 } }}
                >
                  <MenuItem value="">
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      Custom permissions
                    </Typography>
                  </MenuItem>
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      <Typography variant="body2" sx={{ fontSize: 13 }}>
                        {template.templateName}
                      </Typography>
                    </MenuItem>
                  ))}
                </TextField>
              </FormField>
            </FormSection>

            {!isCreate && loadedUser && (
              <FormSection title="Status" columns={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={status === 'active'}
                      onChange={(_, c) => setStatus(c ? 'active' : 'inactive')}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">{status === 'active' ? 'Active' : 'Inactive'}</Typography>}
                />
              </FormSection>
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <RolePermissionsPanel
              value={permissions}
              readOnly={false}
              expandedModules={expandedModules}
              onExpandChange={(modId, expanded) => {
                setExpandedModules((prev) =>
                  expanded ? [...new Set([...prev, modId])] : prev.filter((x) => x !== modId),
                )
              }}
              onChange={(next) => {
                setPermissions(next)
                setSelectedTemplateId('')
              }}
              onExpandAll={() => setExpandedModules(MODULE_DEFS.map((m) => m.id))}
              onCollapseAll={() => setExpandedModules([])}
            />
          </Box>
        </Stack>
      </Box>
    </>
  )
}

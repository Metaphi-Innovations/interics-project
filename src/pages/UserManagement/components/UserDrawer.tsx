import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Autocomplete,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createUser, updateUser } from '@/slices/users/thunk'
import type { User } from '@/slices/users/reducer'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import { useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import client from '@/api/client'

export interface ProjectOption {
  id: string
  name: string
  clientName: string
}

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
  employeeId: string
  role: string
  projectAccess: 'all' | 'selected'
  assignedProjects: ProjectOption[]
}

const defaultForm: FormState = {
  name: '',
  email: '',
  phone: '',
  employeeId: '',
  role: '',
  projectAccess: 'all',
  assignedProjects: [],
}

function validateForm(form: FormState, allUsers: User[], editId?: string): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim() || form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  } else {
    const dup = allUsers.find((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editId)
    if (dup) errors.email = 'Email is already in use'
  }
  if (!form.role) errors.role = 'Role is required'
  if (form.projectAccess === 'selected' && form.assignedProjects.length === 0) {
    errors.assignedProjects = 'Select at least one project'
  }
  return errors
}

export function UserDrawer({ open, onClose, mode, user }: UserDrawerProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.users.saving)
  const allUsers = useAppSelector((s) => s.users.items)
  const roles = useAppSelector((s) => s.roles.items)
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    client.get<ProjectOption[]>('/projects-list').then((r) => setProjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && user) {
      const assignedObjs = user.assignedProjects
        .map((id) => projects.find((p) => p.id === id))
        .filter(Boolean) as ProjectOption[]
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        employeeId: user.employeeId ?? '',
        role: user.role,
        projectAccess: user.projectAccess,
        assignedProjects: assignedObjs,
      })
    } else {
      setForm(defaultForm)
    }
    setErrors({})
    setTouched({})
  }, [open, mode, user, projects])

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    const updated = { ...form, [field]: value }
    if (field === 'projectAccess' && value === 'all') {
      updated.assignedProjects = []
    }
    setForm(updated)
    if (touched[field]) {
      const newErrors = validateForm(updated, allUsers, user?.id)
      setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? '' }))
    }
  }

  function handleBlur(field: keyof FormState) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const newErrors = validateForm(form, allUsers, user?.id)
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? '' }))
  }

  function handleSubmit() {
    const allTouched: Record<string, boolean> = { name: true, email: true, role: true, assignedProjects: true }
    setTouched(allTouched)
    const errs = validateForm(form, allUsers, user?.id)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: Omit<User, 'id' | 'createdAt' | 'lastLogin'> = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      employeeId: form.employeeId.trim() || undefined,
      role: form.role,
      projectAccess: form.projectAccess,
      assignedProjects: form.projectAccess === 'selected' ? form.assignedProjects.map((p) => p.id) : [],
      status: mode === 'edit' && user ? user.status : 'active',
    }

    if (mode === 'add') {
      dispatch(createUser(payload))
        .unwrap()
        .then(() => {
          showToast({ title: 'User created successfully', variant: 'success' })
          onClose()
        })
        .catch(() => showToast({ title: 'Failed to create user', variant: 'error' }))
    } else if (user) {
      dispatch(updateUser({ id: user.id, data: payload }))
        .unwrap()
        .then(() => {
          showToast({ title: 'User updated successfully', variant: 'success' })
          onClose()
        })
        .catch(() => showToast({ title: 'Failed to update user', variant: 'error' }))
    }
  }

  const selectedRole = roles.find((r) => r.id === form.role)

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add User' : 'Edit User'}
      subtitle={mode === 'add' ? 'Create a new system user' : user?.name}
      onSubmit={handleSubmit}
      submitLabel={mode === 'add' ? 'Create User' : 'Save Changes'}
      submitLoading={saving}
      width={520}
    >
      <FormSection title="Basic Info" columns={2} divider={false}>
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Full Name" required error={touched.name ? errors.name : undefined}>
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
        </Box>
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Email Address" required error={touched.email ? errors.email : undefined} hint="Used for login">
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
        </Box>
        <Box sx={{ gridColumn: 'span 1' }}>
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
        </Box>
        <Box sx={{ gridColumn: 'span 1' }}>
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
        </Box>
      </FormSection>

      <FormSection title="Role Assignment" columns={1}>
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
                <Box>
                  <Typography variant="body2" sx={{ fontSize: 13 }}>
                    {r.name}
                  </Typography>
                  {r.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {r.description}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          {selectedRole?.id === 'r-001' && (
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: tokens.color.success[50],
                borderRadius: 1,
                border: `1px solid ${tokens.color.success[200]}`,
              }}
            >
              <Typography variant="caption" sx={{ color: tokens.color.success[700], fontWeight: 600 }}>
                Full System Access
              </Typography>
            </Box>
          )}
          {selectedRole && selectedRole.id !== 'r-001' && (
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: tokens.color.neutral[50],
                borderRadius: 1,
                border: `1px solid ${tokens.color.neutral[200]}`,
              }}
            >
              <Typography variant="caption" color="text.secondary">{selectedRole.description}</Typography>
            </Box>
          )}
        </FormField>
      </FormSection>

      <FormSection title="Project Access" columns={1}>
        <FormField label="Access Scope" required>
          <RadioGroup
            value={form.projectAccess}
            onChange={(e) => handleChange('projectAccess', e.target.value as 'all' | 'selected')}
          >
            <FormControlLabel
              value="all"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: 13 }}>All Projects</Typography>}
            />
            <FormControlLabel
              value="selected"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: 13 }}>Selected Projects</Typography>}
            />
          </RadioGroup>
        </FormField>

        {form.projectAccess === 'selected' && (
          <FormField label="Assigned Projects" required error={touched.assignedProjects ? errors.assignedProjects : undefined}>
            <Autocomplete
              multiple
              size="small"
              options={projects}
              value={form.assignedProjects}
              onChange={(_, val) => {
                handleChange('assignedProjects', val)
                setTouched((p) => ({ ...p, assignedProjects: true }))
              }}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.clientName}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select projects..."
                  error={Boolean(touched.assignedProjects && errors.assignedProjects)}
                  inputProps={{ ...params.inputProps, style: { fontSize: 13 } }}
                />
              )}
            />
          </FormField>
        )}
      </FormSection>
    </DrawerForm>
  )
}

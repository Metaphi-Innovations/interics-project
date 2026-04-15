import { useState, useEffect } from 'react'
import { TextField, MenuItem, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createRole, updateRole } from '@/slices/roles/thunk'
import type { Role } from '@/types/permissions'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import { useToast } from '@/design-system/components'

const LEVEL_OPTIONS: { value: 0 | 1 | 2 | 3; label: string }[] = [
  { value: 0, label: '0 — Admin' },
  { value: 1, label: '1 — Power User' },
  { value: 2, label: '2 — Project User' },
  { value: 3, label: '3 — Viewer' },
]

interface RoleDrawerProps {
  open: boolean
  mode: 'create' | 'edit' | null
  roleId: string | null
  onClose: () => void
}

export function RoleDrawer({ open, mode, roleId, onClose }: RoleDrawerProps) {
  const dispatch = useAppDispatch()
  const { items: roles, saving } = useAppSelector((s) => s.roles)
  const { showToast } = useToast()

  const existing = mode === 'edit' && roleId ? roles.find((r) => r.id === roleId) : undefined

  const [name, setName] = useState('')
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(2)
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && existing) {
      setName(existing.name)
      setLevel(existing.level)
      setDescription(existing.description ?? '')
    } else {
      setName('')
      setLevel(2)
      setDescription('')
    }
    setNameError('')
  }, [open, mode, existing])

  function handleSubmit() {
    if (!name.trim()) {
      setNameError('Role name is required')
      return
    }
    setNameError('')

    if (mode === 'create') {
      dispatch(
        createRole({
          name: name.trim(),
          level,
          description: description.trim() || undefined,
          isSystem: false,
        } as Omit<Role, 'id' | 'userCount'>),
      )
        .unwrap()
        .then(() => {
          showToast({ title: 'Role created', variant: 'success' })
          onClose()
        })
        .catch(() => showToast({ title: 'Failed to create role', variant: 'error' }))
    } else if (mode === 'edit' && roleId && existing && !existing.isSystem) {
      dispatch(
        updateRole({
          id: roleId,
          data: {
            name: name.trim(),
            level,
            description: description.trim() || undefined,
          },
        }),
      )
        .unwrap()
        .then(() => {
          showToast({ title: 'Role updated', variant: 'success' })
          onClose()
        })
        .catch(() => showToast({ title: 'Failed to update role', variant: 'error' }))
    }
  }

  const readOnly = mode === 'edit' && existing?.isSystem

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create Role' : existing?.name ?? 'Edit Role'}
      subtitle={mode === 'create' ? 'Add a custom role' : undefined}
      onSubmit={readOnly ? undefined : handleSubmit}
      submitLabel={mode === 'create' ? 'Create' : 'Save'}
      submitLoading={saving}
      submitDisabled={readOnly}
      width={400}
      hideFooter={readOnly}
    >
      {readOnly && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          System roles cannot be edited.
        </Typography>
      )}

      <FormSection title="Role" columns={1} divider={false}>
        <FormField label="Role Name" required error={nameError || undefined}>
          <TextField
            size="small"
            fullWidth
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError('')
            }}
            disabled={readOnly}
            inputProps={{ style: { fontSize: 13 } }}
          />
        </FormField>
        <FormField label="Level" required>
          <TextField
            select
            size="small"
            fullWidth
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as 0 | 1 | 2 | 3)}
            disabled={readOnly}
            inputProps={{ style: { fontSize: 13 } }}
          >
            {LEVEL_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </FormField>
        <FormField label="Description">
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
            inputProps={{ style: { fontSize: 13 } }}
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

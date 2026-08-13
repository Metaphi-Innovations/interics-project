import { useState, useEffect } from 'react'
import { Box, TextField, MenuItem, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createRole, updateRole } from '@/slices/roles/thunk'
import type { Role } from '@/types/permissions'
import { FormSection, FormField } from '@/components/templates'
import { Button, Modal, useToast } from '@/design-system/components'

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
  const { items: rawRoles, saving } = useAppSelector((s) => s.roles)
  const roles = rawRoles ?? []
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
          status: 'active',
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
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create Role' : existing?.name ?? 'Edit Role'}
      subtitle={mode === 'create' ? 'Add a custom role' : undefined}
      size="xs"
      loading={saving}
      footer={
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button size="sm" variant="outlined" color="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!readOnly ? (
            <Button size="sm" variant="contained" color="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </Button>
          ) : null}
        </Box>
      }
    >
      {readOnly ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          System roles cannot be edited.
        </Typography>
      ) : null}

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
        <FormField
          label="Description"
          error={description.length > 500 ? 'Maximum 500 characters' : undefined}
        >
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            disabled={readOnly}
            helperText={`${description.length}/500`}
            inputProps={{ maxLength: 500, style: { fontSize: 13 } }}
          />
        </FormField>
      </FormSection>
    </Modal>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Box, Stack, Typography, TextField, Button as MuiButton, Paper, Alert, Divider } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRoles, createRole, updateRole, cloneRole } from '@/slices/roles/thunk'
import { tokens } from '@/design-system/tokens'
import { useToast } from '@/design-system/components'
import type { PermissionKey, RolePermissions, DataScope } from '@/types/permissions'
import { makeEmptyPermissions } from '@/types/permissions'
import {
  RolePermissionsPanel,
  RoleModuleSummary,
  MODULE_DEFS,
  applyDependencies,
  applyFullAccess,
} from './components/RolePermissionsPanel'

export default function RoleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { items: roles, saving } = useAppSelector((s) => s.roles)
  const { showToast } = useToast()

  const isCreate = !id
  const existingRole = id ? roles.find((r) => r.id === id) : undefined

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [perms, setPerms] = useState<RolePermissions>(makeEmptyPermissions())
  const [isDirty, setIsDirty] = useState(false)
  const [expandedModules, setExpandedModules] = useState<string[]>(['projects'])
  const [nameError, setNameError] = useState('')

  const isSystem = existingRole?.isSystem ?? false
  const readOnly = isSystem

  useEffect(() => {
    if (roles.length === 0) dispatch(fetchRoles())
  }, [dispatch, roles.length])

  useEffect(() => {
    if (existingRole) {
      setName(existingRole.name)
      setDescription(existingRole.description ?? '')
      setPerms({ ...existingRole.permissions })
      setIsDirty(false)
    } else if (isCreate) {
      setName('')
      setDescription('')
      setPerms(makeEmptyPermissions())
      setIsDirty(false)
    }
  }, [existingRole, isCreate])

  const handlePermChange = useCallback((key: string, val: boolean | DataScope) => {
    setPerms((prev) => {
      let updated: RolePermissions
      if (key.startsWith('__fullAccess__')) {
        const modId = key.replace('__fullAccess__', '')
        const mod = MODULE_DEFS.find((m) => m.id === modId)
        if (!mod) return prev
        updated = applyFullAccess(prev, mod, val as boolean)
      } else if (key.endsWith('_dataScope')) {
        updated = { ...prev, [key]: val }
      } else {
        updated = applyDependencies(prev, key as PermissionKey, val as boolean)
      }
      return updated
    })
    setIsDirty(true)
  }, [])

  function handleExpandModule(modId: string, expanded: boolean) {
    setExpandedModules((prev) => (expanded ? [...prev, modId] : prev.filter((x) => x !== modId)))
  }

  function handleExpandAll() {
    setExpandedModules(MODULE_DEFS.map((m) => m.id))
  }
  function handleCollapseAll() {
    setExpandedModules([])
  }

  function handleSave() {
    if (!name.trim()) {
      setNameError('Role name is required')
      return
    }
    setNameError('')

    const payload = { name: name.trim(), description: description.trim(), permissions: perms, isSystem: false }

    if (isCreate) {
      dispatch(createRole(payload))
        .unwrap()
        .then(() => {
          showToast({ title: 'Role created successfully', variant: 'success' })
          navigate('/user-management/roles')
        })
        .catch(() => showToast({ title: 'Failed to create role', variant: 'error' }))
    } else if (id) {
      dispatch(updateRole({ id, data: payload }))
        .unwrap()
        .then(() => {
          showToast({ title: 'Role updated successfully', variant: 'success' })
          setIsDirty(false)
        })
        .catch(() => showToast({ title: 'Failed to update role', variant: 'error' }))
    }
  }

  function handleClone() {
    if (!id) return
    dispatch(cloneRole(id))
      .unwrap()
      .then((cloned) => {
        showToast({ title: `Cloned as "${cloned.name}"`, variant: 'success' })
        navigate(`/user-management/roles/${cloned.id}/edit`)
      })
      .catch(() => showToast({ title: 'Failed to clone role', variant: 'error' }))
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3, lg: 4 }, pb: isDirty && !readOnly ? 10 : undefined }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <MuiButton
            size="small"
            onClick={() => navigate('/user-management/roles')}
            sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 500, minWidth: 0, px: 1 }}
          >
            ← Back to Roles
          </MuiButton>
          <Typography variant="body2" color="text.disabled">
            /
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
            {isCreate ? 'Create Role' : existingRole?.name ?? 'Edit Role'}
          </Typography>
        </Stack>
        {isSystem && (
          <MuiButton variant="outlined" size="small" onClick={handleClone} disabled={saving} sx={{ fontSize: 13, fontWeight: 600 }}>
            Clone Role
          </MuiButton>
        )}
      </Stack>

      {isSystem && (
        <Alert severity="info" sx={{ mb: 3, fontSize: 13 }}>
          <strong>System Role — Read Only.</strong> System roles cannot be edited. Clone this role to create a customized version.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', lg: 'row' }} gap={3} alignItems="flex-start">
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2,
            width: { xs: '100%', lg: 320 },
            flexShrink: 0,
            position: { lg: 'sticky' },
            top: { lg: 16 },
            alignSelf: 'flex-start',
          }}
        >
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ mb: 2, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: tokens.color.neutral[500] }}
          >
            Role Info
          </Typography>
          <Stack gap={2}>
            <Box>
              <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                Role Name *
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={name}
                disabled={readOnly}
                onChange={(e) => {
                  setName(e.target.value)
                  setIsDirty(true)
                  if (e.target.value.trim()) setNameError('')
                }}
                error={Boolean(nameError)}
                helperText={nameError}
                placeholder="e.g. Site Manager"
                inputProps={{ style: { fontSize: 13 } }}
              />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                Description
              </Typography>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={2}
                value={description}
                disabled={readOnly}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="Describe what this role can do..."
                inputProps={{ style: { fontSize: 13 } }}
              />
            </Box>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <RoleModuleSummary perms={perms} isSystem={isSystem} />
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <RolePermissionsPanel
            perms={perms}
            readOnly={readOnly}
            expandedModules={expandedModules}
            onExpandChange={handleExpandModule}
            onChange={handlePermChange}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />
        </Box>
      </Stack>

      {isDirty && !readOnly && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderTop: `1px solid ${tokens.color.neutral[200]}`,
            px: 4,
            py: 2,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={2}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              You have unsaved changes
            </Typography>
            <MuiButton
              size="small"
              onClick={() => {
                if (existingRole) {
                  setName(existingRole.name)
                  setDescription(existingRole.description ?? '')
                  setPerms({ ...existingRole.permissions })
                } else {
                  setName('')
                  setDescription('')
                  setPerms(makeEmptyPermissions())
                }
                setIsDirty(false)
              }}
              sx={{ fontWeight: 600, color: 'text.secondary' }}
            >
              Cancel
            </MuiButton>
            <MuiButton variant="contained" size="small" onClick={handleSave} disabled={saving} sx={{ fontWeight: 600, minWidth: 120 }}>
              {saving ? 'Saving…' : isCreate ? 'Create Role' : 'Save Role'}
            </MuiButton>
          </Stack>
        </Box>
      )}
    </Box>
  )
}

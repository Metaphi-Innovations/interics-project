import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Box, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { modulesApi } from '@/api/modulesApi'
import { permissionTemplatesApi, type PermissionTemplate } from '@/api/permissionTemplatesApi'
import PageHeader from '@/components/layout/PageHeader'
import { FormField, FormSection } from '@/components/templates'
import { Button, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { usePermission } from '@/hooks/usePermission'
import {
  accessInputToUserPermissions,
  makeEmptyUserPermissions,
  userPermissionsToAccessInput,
  type PermissionModuleTree,
  type UserPermissions,
} from '@/types/permissions'
import { MODULE_DEFS, RolePermissionsPanel } from './components/RolePermissionsPanel'

export default function TemplateFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isCreate = !id
  const isEdit = Boolean(id) && location.pathname.endsWith('/edit')
  const readOnly = Boolean(id) && !isEdit
  const { showToast } = useToast()
  const canCreate = usePermission('userManagementTemplates', 'create') || usePermission('userManagement', 'create')
  const canEdit = usePermission('userManagementTemplates', 'edit') || usePermission('userManagement', 'edit')
  const canSave = isCreate ? canCreate : canEdit

  const [templateName, setTemplateName] = useState('')
  const [permissions, setPermissions] = useState<UserPermissions>(() => makeEmptyUserPermissions())
  const [expandedModules, setExpandedModules] = useState<string[]>(() => MODULE_DEFS.map((m) => m.id))
  const [moduleTree, setModuleTree] = useState<PermissionModuleTree | null>(null)
  const [template, setTemplate] = useState<PermissionTemplate | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')

    const moduleRequest = modulesApi.getTree()
    const templateRequest = id ? permissionTemplatesApi.getById(id) : Promise.resolve(null)

    Promise.all([moduleRequest, templateRequest])
      .then(([tree, loadedTemplate]) => {
        if (cancelled) return
        setModuleTree(tree)
        setTemplate(loadedTemplate)
        setTemplateName(loadedTemplate?.templateName ?? '')
        setPermissions(
          loadedTemplate ? accessInputToUserPermissions(loadedTemplate.access, tree) : makeEmptyUserPermissions(),
        )
        setExpandedModules(MODULE_DEFS.map((m) => m.id))
        setLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  function handleCancel() {
    navigate('/user-management/templates')
  }

  function handleSubmit() {
    setTouched(true)
    if (!canSave) {
      showToast({ title: 'You do not have permission to save templates', variant: 'error' })
      return
    }
    if (!templateName.trim()) return
    if (!moduleTree) {
      showToast({ title: 'Permission modules are still loading', variant: 'error' })
      return
    }

    const access = userPermissionsToAccessInput(permissions, moduleTree)
    setSaving(true)

    const request =
      isCreate || !id
        ? permissionTemplatesApi.create({ templateName: templateName.trim(), access })
        : permissionTemplatesApi.update(id, { templateName: templateName.trim(), access })

    request
      .then(() => {
        showToast({ title: isCreate ? 'Template created' : 'Template updated', variant: 'success' })
        navigate('/user-management/templates')
      })
      .catch((err: unknown) => {
        const error = err as { response?: { data?: { message?: string } } }
        showToast({ title: error.response?.data?.message ?? 'Failed to save template', variant: 'error' })
      })
      .finally(() => setSaving(false))
  }

  const title = isCreate ? 'Create Template' : readOnly ? 'View Template' : 'Edit Template'
  const breadcrumbLast = isCreate ? 'Create Template' : template ? template.templateName : title
  const nameError = touched && !templateName.trim() ? 'Template name is required' : undefined

  if (loadState === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (loadState === 'error') {
    return (
      <Stack gap={2}>
        <Typography color="error">Template not found.</Typography>
        <Button variant="outlined" color="secondary" size="sm" onClick={handleCancel} sx={{ mt: 2 }}>
          Back to Templates
        </Button>
      </Stack>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'User Management', href: '/user-management/users' },
          { label: 'Templates', href: '/user-management/templates' },
          { label: breadcrumbLast },
        ]}
        title={title}
        actions={
          <Stack direction="row" gap={1}>
            <Button variant="outlined" color="secondary" size="sm" onClick={handleCancel} disabled={saving}>
              {readOnly ? 'Back' : 'Cancel'}
            </Button>
            {readOnly && id && canEdit ? (
              <Button
                variant="contained"
                color="primary"
                size="sm"
                onClick={() => navigate(`/user-management/templates/${id}/edit`)}
                sx={{ bgcolor: tokens.color.success[600], '&:hover': { bgcolor: tokens.color.success[700] } }}
              >
                Edit
              </Button>
            ) : null}
            {!readOnly ? (
              <Button
                variant="contained"
                color="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={saving || !canSave}
                sx={{ bgcolor: tokens.color.success[600], '&:hover': { bgcolor: tokens.color.success[700] } }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            ) : null}
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
              <FormField label="Template Name" required error={nameError}>
                <TextField
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="e.g. Project Pitch Team"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  error={Boolean(nameError)}
                  inputProps={{ style: { fontSize: 13 } }}
                />
              </FormField>
            </FormSection>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <RolePermissionsPanel
              value={permissions}
              readOnly={readOnly}
              expandedModules={expandedModules}
              onExpandChange={(modId, expanded) => {
                setExpandedModules((prev) =>
                  expanded ? [...new Set([...prev, modId])] : prev.filter((x) => x !== modId),
                )
              }}
              onChange={setPermissions}
              onExpandAll={() => setExpandedModules(MODULE_DEFS.map((m) => m.id))}
              onCollapseAll={() => setExpandedModules([])}
            />
          </Box>
        </Stack>
      </Box>
    </>
  )
}

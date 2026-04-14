import {
  Box,
  Stack,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button as MuiButton,
  Chip as MuiChip,
  Paper,
  Alert,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { FolderKanban, DollarSign, Shield, Users, Settings2 } from 'lucide-react'
import { tokens } from '@/design-system/tokens'
import type { PermissionKey, RolePermissions, DataScope } from '@/types/permissions'

type SectionKey = 'basic' | 'advanced' | 'data'

interface PermDef {
  key: PermissionKey
  label: string
  section: SectionKey
}

export interface ModuleDef {
  id: string
  label: string
  icon: React.ReactNode
  permissions: PermDef[]
  dataScopeKey?: 'projects_dataScope' | 'financial_dataScope' | 'compliance_dataScope'
}

export const MODULE_DEFS: ModuleDef[] = [
  {
    id: 'projects',
    label: 'Projects',
    icon: <FolderKanban size={16} strokeWidth={1.75} />,
    dataScopeKey: 'projects_dataScope',
    permissions: [
      { key: 'projects.view', label: 'View', section: 'basic' },
      { key: 'projects.create', label: 'Create', section: 'basic' },
      { key: 'projects.edit', label: 'Edit', section: 'basic' },
      { key: 'projects.delete', label: 'Delete', section: 'basic' },
      { key: 'projects.approve', label: 'Approve', section: 'advanced' },
      { key: 'projects.assign', label: 'Assign', section: 'advanced' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: <DollarSign size={16} strokeWidth={1.75} />,
    dataScopeKey: 'financial_dataScope',
    permissions: [
      { key: 'financial.view', label: 'View', section: 'basic' },
      { key: 'financial.create', label: 'Create', section: 'basic' },
      { key: 'financial.edit', label: 'Edit', section: 'basic' },
      { key: 'financial.delete', label: 'Delete', section: 'basic' },
      { key: 'financial.approve', label: 'Approve', section: 'advanced' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: <Shield size={16} strokeWidth={1.75} />,
    dataScopeKey: 'compliance_dataScope',
    permissions: [
      { key: 'compliance.view', label: 'View', section: 'basic' },
      { key: 'compliance.create', label: 'Create', section: 'basic' },
      { key: 'compliance.approve', label: 'Approve', section: 'advanced' },
    ],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: <Users size={16} strokeWidth={1.75} />,
    permissions: [
      { key: 'users.view', label: 'View Users', section: 'basic' },
      { key: 'users.create', label: 'Create Users', section: 'basic' },
      { key: 'users.edit', label: 'Edit Users', section: 'basic' },
      { key: 'users.delete', label: 'Delete Users', section: 'basic' },
      { key: 'roles.view', label: 'View Roles', section: 'advanced' },
      { key: 'roles.create', label: 'Create Roles', section: 'advanced' },
      { key: 'roles.edit', label: 'Edit Roles', section: 'advanced' },
      { key: 'roles.delete', label: 'Delete Roles', section: 'advanced' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings2 size={16} strokeWidth={1.75} />,
    permissions: [{ key: 'settings.manage', label: 'Manage Settings', section: 'basic' }],
  },
]

export type ModStatus = 'full' | 'partial' | 'none'

export function getModuleStatus(perms: RolePermissions, mod: ModuleDef): ModStatus {
  const allTrue = mod.permissions.every((p) => perms[p.key])
  const anyTrue = mod.permissions.some((p) => perms[p.key])
  const scopeAll = !mod.dataScopeKey || (perms[mod.dataScopeKey] as DataScope) === 'all'
  if (allTrue && scopeAll) return 'full'
  if (anyTrue) return 'partial'
  return 'none'
}

function ModuleStatusBadge({ status }: { status: ModStatus }) {
  const map: Record<ModStatus, { label: string; bg: string; color: string }> = {
    full: { label: 'Full', bg: tokens.color.success[100], color: tokens.color.success[800] },
    partial: { label: 'Partial', bg: tokens.color.warning[100], color: tokens.color.warning[800] },
    none: { label: 'None', bg: tokens.color.neutral[100], color: tokens.color.neutral[500] },
  }
  const c = map[status]
  return (
    <MuiChip
      label={c.label}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontSize: 11, height: 20, fontWeight: 600, '& .MuiChip-label': { px: 1 } }}
    />
  )
}

export function applyDependencies(perms: RolePermissions, changedKey: PermissionKey, newVal: boolean): RolePermissions {
  const updated = { ...perms, [changedKey]: newVal }
  const mod = changedKey.split('.')[0]

  if (newVal && (changedKey.endsWith('.create') || changedKey.endsWith('.edit'))) {
    const viewKey = `${mod}.view` as PermissionKey
    if (viewKey in updated) updated[viewKey] = true
  }

  if (!newVal && changedKey.endsWith('.view')) {
    for (const key of Object.keys(updated) as PermissionKey[]) {
      if (key !== changedKey && key.startsWith(`${mod}.`)) {
        (updated as Record<string, unknown>)[key] = false
      }
    }
  }

  return updated
}

export function applyFullAccess(perms: RolePermissions, mod: ModuleDef, checked: boolean): RolePermissions {
  const updated = { ...perms }
  for (const p of mod.permissions) {
    (updated as Record<string, unknown>)[p.key] = checked
  }
  if (checked && mod.dataScopeKey) {
    (updated as Record<string, unknown>)[mod.dataScopeKey] = 'all'
  }
  return updated
}

function moduleViewState(mod: ModuleDef, perms: RolePermissions): { viewPerm: PermDef | undefined; viewGateOn: boolean } {
  const viewPerm = mod.permissions.find((p) => p.key.endsWith('.view'))
  const viewGateOn = viewPerm ? perms[viewPerm.key] === true : true
  return { viewPerm, viewGateOn }
}

function ModulePanel({
  mod,
  perms,
  readOnly,
  expanded,
  onExpandChange,
  onChange,
}: {
  mod: ModuleDef
  perms: RolePermissions
  readOnly: boolean
  expanded: boolean
  onExpandChange: (val: boolean) => void
  onChange: (key: PermissionKey | string, val: boolean | DataScope) => void
}) {
  const status = getModuleStatus(perms, mod)
  const { viewPerm, viewGateOn } = moduleViewState(mod, perms)

  const basicPerms = mod.permissions.filter((p) => p.section === 'basic')
  const advancedPerms = mod.permissions.filter((p) => p.section === 'advanced')

  const allChecked = mod.permissions.every((p) => perms[p.key])
  const noneChecked = mod.permissions.every((p) => !perms[p.key])
  const fullAccessIndeterminate = !allChecked && !noneChecked

  const scopeDisabled = readOnly || (viewPerm ? !viewGateOn : false)

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, val) => onExpandChange(val)}
      disableGutters
      elevation={0}
      sx={{
        border: `1px solid ${tokens.color.neutral[200]}`,
        borderRadius: 1,
        mb: 1,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, py: 0.5, minHeight: 48 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ width: '100%', pr: 1 }}>
          <Box sx={{ color: tokens.color.primary[500], display: 'flex' }}>{mod.icon}</Box>
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
            {mod.label}
          </Typography>
          <ModuleStatusBadge status={status} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2 }}>
        <Divider sx={{ mb: 2 }} />

        <FormControlLabel
          sx={{ mb: 1 }}
          control={
            <Checkbox
              size="small"
              checked={allChecked}
              indeterminate={fullAccessIndeterminate}
              disabled={readOnly}
              onChange={(e) => onChange('__fullAccess__' + mod.id, e.target.checked as unknown as DataScope)}
            />
          }
          label={
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
              Full Access
            </Typography>
          }
        />

        {basicPerms.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: tokens.color.neutral[500],
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: 10,
                display: 'block',
                mb: 0.5,
              }}
            >
              Basic Actions
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0}>
              {basicPerms.map((p) => {
                const isView = p.key.endsWith('.view')
                const disabled = readOnly || (!isView && !viewGateOn)
                return (
                  <FormControlLabel
                    key={p.key}
                    sx={{ width: '50%', m: 0 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={perms[p.key] === true}
                        disabled={disabled}
                        onChange={(e) => onChange(p.key, e.target.checked as unknown as DataScope)}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{ fontSize: 13, color: disabled && !readOnly ? 'text.disabled' : undefined }}
                      >
                        {p.label}
                      </Typography>
                    }
                  />
                )
              })}
            </Stack>
          </Box>
        )}

        {advancedPerms.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: tokens.color.neutral[500],
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: 10,
                display: 'block',
                mb: 0.5,
              }}
            >
              Advanced Actions
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0}>
              {advancedPerms.map((p) => (
                <FormControlLabel
                  key={p.key}
                  sx={{ width: '50%', m: 0 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={perms[p.key] === true}
                      disabled={readOnly || !viewGateOn}
                      onChange={(e) => onChange(p.key, e.target.checked as unknown as DataScope)}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: 13,
                        color: !viewGateOn && !readOnly ? 'text.disabled' : undefined,
                      }}
                    >
                      {p.label}
                    </Typography>
                  }
                />
              ))}
            </Stack>
          </Box>
        )}

        {mod.dataScopeKey && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: tokens.color.neutral[500],
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: 10,
                display: 'block',
                mb: 0.5,
              }}
            >
              Data Scope
            </Typography>
            <RadioGroup
              value={(perms[mod.dataScopeKey] as DataScope) ?? 'assigned'}
              onChange={(e) => onChange(mod.dataScopeKey!, e.target.value as unknown as DataScope)}
            >
              <FormControlLabel
                value="all"
                disabled={scopeDisabled}
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: 13 }}>All Data</Typography>}
              />
              <FormControlLabel
                value="assigned"
                disabled={scopeDisabled}
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: 13 }}>Assigned Only</Typography>}
              />
              <FormControlLabel
                value="own"
                disabled={scopeDisabled}
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: 13 }}>Own Data Only</Typography>}
              />
            </RadioGroup>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export interface RoleModuleSummaryProps {
  perms: RolePermissions
  isSystem: boolean
}

/** Live module summary for the left column (read-only chips). */
export function RoleModuleSummary({ perms, isSystem }: RoleModuleSummaryProps) {
  return (
    <>
      <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.color.neutral[500], textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10 }}>
        Module Summary
      </Typography>
      <Stack gap={1} sx={{ mt: 1 }}>
        {MODULE_DEFS.map((mod) => {
          const status = getModuleStatus(perms, mod)
          return (
            <Stack key={mod.id} direction="row" alignItems="center" gap={1.5}>
              <Box sx={{ color: tokens.color.primary[400], display: 'flex' }}>{mod.icon}</Box>
              <Typography variant="body2" sx={{ fontSize: 13, flex: 1 }}>
                {mod.label}
              </Typography>
              <ModuleStatusBadge status={status} />
            </Stack>
          )
        })}
      </Stack>
      {isSystem && (
        <MuiChip
          label="System Role"
          size="small"
          sx={{
            mt: 2,
            bgcolor: tokens.color.neutral[100],
            color: tokens.color.neutral[600],
            fontSize: 11,
            height: 22,
            fontWeight: 600,
          }}
        />
      )}
    </>
  )
}

export interface RolePermissionsPanelProps {
  perms: RolePermissions
  readOnly: boolean
  expandedModules: string[]
  onExpandChange: (modId: string, expanded: boolean) => void
  onChange: (key: string, val: boolean | DataScope) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function RolePermissionsPanel({
  perms,
  readOnly,
  expandedModules,
  onExpandChange,
  onChange,
  onExpandAll,
  onCollapseAll,
}: RolePermissionsPanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: tokens.color.neutral[500] }}
        >
          Permissions
        </Typography>
        {!readOnly && (
          <Stack direction="row" gap={1}>
            <MuiButton size="small" onClick={onExpandAll} sx={{ fontSize: 12, color: 'text.secondary' }}>
              Expand All
            </MuiButton>
            <MuiButton size="small" onClick={onCollapseAll} sx={{ fontSize: 12, color: 'text.secondary' }}>
              Collapse All
            </MuiButton>
          </Stack>
        )}
      </Stack>

      {readOnly && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
          Full System Access — Read Only. All permissions are granted for this role and cannot be modified.
        </Alert>
      )}

      {MODULE_DEFS.map((mod) => (
        <ModulePanel
          key={mod.id}
          mod={mod}
          perms={perms}
          readOnly={readOnly}
          expanded={expandedModules.includes(mod.id)}
          onExpandChange={(val) => onExpandChange(mod.id, val)}
          onChange={onChange}
        />
      ))}
    </Paper>
  )
}

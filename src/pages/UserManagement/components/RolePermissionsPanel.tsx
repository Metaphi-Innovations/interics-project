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
  Button as MuiButton,
  Chip as MuiChip,
  Paper,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { FolderKanban, DollarSign, Shield, Users, Settings2 } from 'lucide-react'
import { tokens } from '@/design-system/tokens'
import type {
  ModuleCrudAction,
  UserPermissions,
  UserPermissionModuleKey,
} from '@/types/permissions'
import { MODULE_CRUD_ACTIONS, cloneUserPermissions } from '@/types/permissions'

const ACTION_LABELS: Record<ModuleCrudAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

export interface ModuleDef {
  id: UserPermissionModuleKey
  label: string
  icon: React.ReactNode
}

export const MODULE_DEFS: ModuleDef[] = [
  {
    id: 'projects',
    label: 'Projects',
    icon: <FolderKanban size={16} strokeWidth={1.75} />,
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: <DollarSign size={16} strokeWidth={1.75} />,
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: <Shield size={16} strokeWidth={1.75} />,
  },
  {
    id: 'userManagement',
    label: 'User Management',
    icon: <Users size={16} strokeWidth={1.75} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings2 size={16} strokeWidth={1.75} />,
  },
]

export type ModStatus = 'full' | 'partial' | 'none'

function bundleFor(perms: UserPermissions, modId: UserPermissionModuleKey) {
  return perms[modId]
}

export function getModuleStatus(perms: UserPermissions, mod: ModuleDef): ModStatus {
  const b = bundleFor(perms, mod.id)
  const allTrue = MODULE_CRUD_ACTIONS.every((a) => b[a] === true)
  const anyTrue = MODULE_CRUD_ACTIONS.some((a) => b[a] === true)
  if (allTrue) return 'full'
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

export function applyDependencies(
  perms: UserPermissions,
  modId: UserPermissionModuleKey,
  changed: ModuleCrudAction,
  newVal: boolean,
): UserPermissions {
  const next = cloneUserPermissions(perms)
  const b = next[modId]

  if (changed === 'view' && !newVal) {
    b.view = false
    b.create = false
    b.edit = false
    b.delete = false
    return next
  }

  b[changed] = newVal

  if (newVal && (changed === 'create' || changed === 'edit')) {
    b.view = true
  }

  return next
}

/** Full Access checked → all four true. Unchecked → no automatic change. */
export function applyFullAccess(
  perms: UserPermissions,
  modId: UserPermissionModuleKey,
  checked: boolean,
): UserPermissions {
  const next = cloneUserPermissions(perms)
  if (!checked) return next
  const b = next[modId]
  b.view = true
  b.create = true
  b.edit = true
  b.delete = true
  return next
}

function ModulePanel({
  mod,
  perms,
  readOnly,
  expanded,
  onExpandChange,
  onFullAccessChange,
  onCrudChange,
}: {
  mod: ModuleDef
  perms: UserPermissions
  readOnly: boolean
  expanded: boolean
  onExpandChange: (val: boolean) => void
  onFullAccessChange: (modId: UserPermissionModuleKey, checked: boolean) => void
  onCrudChange: (modId: UserPermissionModuleKey, action: ModuleCrudAction, val: boolean) => void
}) {
  const status = getModuleStatus(perms, mod)
  const b = bundleFor(perms, mod.id)
  const viewGateOn = b.view === true

  const allChecked = MODULE_CRUD_ACTIONS.every((a) => b[a] === true)
  const noneChecked = MODULE_CRUD_ACTIONS.every((a) => !b[a])
  const fullAccessIndeterminate = !allChecked && !noneChecked

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

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            columnGap: 1,
            rowGap: 0.5,
          }}
        >
          <FormControlLabel
            sx={{ m: 0, minWidth: 0 }}
            control={
              <Checkbox
                size="small"
                checked={allChecked}
                indeterminate={fullAccessIndeterminate}
                disabled={readOnly}
                onChange={(e) => onFullAccessChange(mod.id, e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                Full Access
              </Typography>
            }
          />

          {MODULE_CRUD_ACTIONS.map((action) => {
            const isView = action === 'view'
            const disabled = readOnly || (!isView && !viewGateOn)
            return (
              <FormControlLabel
                key={action}
                sx={{ m: 0, minWidth: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={b[action]}
                    disabled={disabled}
                    onChange={(e) => onCrudChange(mod.id, action, e.target.checked)}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{ fontSize: 13, color: disabled && !readOnly ? 'text.disabled' : undefined }}
                  >
                    {ACTION_LABELS[action]}
                  </Typography>
                }
              />
            )
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

export interface UserPermissionsSummaryProps {
  perms: UserPermissions
}

/** Read-only module summary chips. */
export function UserPermissionsSummary({ perms }: UserPermissionsSummaryProps) {
  return (
    <>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: tokens.color.neutral[500],
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: 10,
        }}
      >
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
    </>
  )
}

/** @deprecated Use UserPermissionsSummary */
export const RoleModuleSummary = UserPermissionsSummary

export interface RolePermissionsPanelProps {
  value: UserPermissions
  readOnly: boolean
  expandedModules: string[]
  onExpandChange: (modId: string, expanded: boolean) => void
  onChange: (next: UserPermissions) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function RolePermissionsPanel({
  value,
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

      {MODULE_DEFS.map((mod) => (
        <ModulePanel
          key={mod.id}
          mod={mod}
          perms={value}
          readOnly={readOnly}
          expanded={expandedModules.includes(mod.id)}
          onExpandChange={(val) => onExpandChange(mod.id, val)}
          onFullAccessChange={(modId, checked) => onChange(applyFullAccess(value, modId, checked))}
          onCrudChange={(modId, action, val) => onChange(applyDependencies(value, modId, action, val))}
        />
      ))}
    </Paper>
  )
}

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button as MuiButton,
  Checkbox,
  Chip as MuiChip,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import {
  Building2,
  FolderKanban,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  Receipt,
  TrendingDown,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { tokens } from '@/design-system/tokens'
import type { ModuleCrudAction, UserPermissions, UserPermissionModuleKey } from '@/types/permissions'
import { MODULE_CRUD_ACTIONS, cloneUserPermissions } from '@/types/permissions'

const ACTION_LABELS: Record<ModuleCrudAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

const SINGLE_CHECKBOX_MODULES = new Set<UserPermissionModuleKey>(['dashboard', 'compliance'])

export interface ModuleDef {
  id: UserPermissionModuleKey
  label: string
  icon: ReactNode
  children?: Array<{
    id: UserPermissionModuleKey
    label: string
  }>
}

export const MODULE_DEFS: ModuleDef[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={16} strokeWidth={1.75} />,
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: <FolderKanban size={16} strokeWidth={1.75} />,
    children: [
      { id: 'projectOverview', label: 'Overview' },
      { id: 'projectPitch', label: 'Pitch' },
      { id: 'projectLive', label: 'Live' },
      { id: 'projectFinancials', label: 'Financials' },
      { id: 'projectDocuments', label: 'Documents' },
      { id: 'projectActivity', label: 'Activity' },
      { id: 'projectManagement', label: 'Project Management' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: <Building2 size={16} strokeWidth={1.75} />,
  },
  {
    id: 'vendors',
    label: 'Vendors',
    icon: <Truck size={16} strokeWidth={1.75} />,
  },
  {
    id: 'team',
    label: 'Team',
    icon: <UserPlus size={16} strokeWidth={1.75} />,
  },
  {
    id: 'receivables',
    label: 'Receivables',
    icon: <TrendingUp size={16} strokeWidth={1.75} />,
  },
  {
    id: 'payables',
    label: 'Payables',
    icon: <TrendingDown size={16} strokeWidth={1.75} />,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: <Receipt size={16} strokeWidth={1.75} />,
  },
  {
    id: 'compliance',
    label: 'Compliance & Tax',
    icon: <ReceiptText size={16} strokeWidth={1.75} />,
  },
  {
    id: 'userManagement',
    label: 'User Management',
    icon: <Users size={16} strokeWidth={1.75} />,
    children: [
      { id: 'userManagementUsers', label: 'Users' },
      { id: 'userManagementRoles', label: 'Roles' },
      { id: 'userManagementTemplates', label: 'Templates' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings2 size={16} strokeWidth={1.75} />,
  },
]

export type ModStatus = 'full' | 'partial' | 'none'

const CHILD_TO_PARENT = new Map<UserPermissionModuleKey, UserPermissionModuleKey>(
  MODULE_DEFS.flatMap((mod) => (mod.children ?? []).map((child) => [child.id, mod.id])),
)

function keysForModule(mod: ModuleDef): UserPermissionModuleKey[] {
  return [mod.id, ...(mod.children ?? []).map((child) => child.id)]
}

function bundleFor(perms: UserPermissions, modId: UserPermissionModuleKey) {
  return perms[modId]
}

function isFull(perms: UserPermissions, key: UserPermissionModuleKey): boolean {
  const b = bundleFor(perms, key)
  return MODULE_CRUD_ACTIONS.every((a) => b[a] === true)
}

function isAny(perms: UserPermissions, key: UserPermissionModuleKey): boolean {
  const b = bundleFor(perms, key)
  return MODULE_CRUD_ACTIONS.some((a) => b[a] === true)
}

function emptyPermissions() {
  return { view: false, create: false, edit: false, delete: false }
}

export function getModuleStatus(perms: UserPermissions, mod: ModuleDef): ModStatus {
  if (SINGLE_CHECKBOX_MODULES.has(mod.id)) {
    return perms[mod.id].view ? 'full' : 'none'
  }

  const keys = keysForModule(mod)
  if (keys.every((key) => isFull(perms, key))) return 'full'
  if (keys.some((key) => isAny(perms, key))) return 'partial'
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
  const moduleDef = MODULE_DEFS.find((mod) => mod.id === modId)

  if (changed === 'view' && !newVal) {
    next[modId] = emptyPermissions()
    for (const child of moduleDef?.children ?? []) {
      next[child.id] = emptyPermissions()
    }
    return next
  }

  b[changed] = newVal

  for (const child of moduleDef?.children ?? []) {
    if (next[child.id].view) {
      next[child.id] = { ...b }
      next[child.id].view = true
    }
  }

  return next
}

function applySubModuleScope(
  perms: UserPermissions,
  childId: UserPermissionModuleKey,
  checked: boolean,
): UserPermissions {
  const next = cloneUserPermissions(perms)
  const parent = CHILD_TO_PARENT.get(childId)
  if (!parent) return next

  if (!checked) {
    next[childId] = emptyPermissions()
    return next
  }

  next[childId] = { ...next[parent], view: true }
  return next
}

/** Full Access checked sets all flags; unchecked clears the module and its displayed children. */
export function applyFullAccess(
  perms: UserPermissions,
  modId: UserPermissionModuleKey,
  checked: boolean,
): UserPermissions {
  const next = cloneUserPermissions(perms)
  const moduleDef = MODULE_DEFS.find((mod) => mod.id === modId)
  for (const key of moduleDef ? keysForModule(moduleDef) : [modId]) {
    next[key] = checked ? { view: true, create: true, edit: true, delete: true } : emptyPermissions()
  }
  return next
}

function ModuleActionRow({
  label,
  modId,
  perms,
  readOnly,
  onCrudChange,
}: {
  label: string
  modId: UserPermissionModuleKey
  perms: UserPermissions
  readOnly: boolean
  onCrudChange: (modId: UserPermissionModuleKey, action: ModuleCrudAction, val: boolean) => void
}) {
  const b = bundleFor(perms, modId)
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'minmax(120px, 1fr) repeat(4, minmax(68px, max-content))',
        },
        gap: { xs: 0.5, sm: 1 },
        alignItems: 'center',
        py: 0.5,
        minWidth: 0,
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, minWidth: 0 }}>
        {label}
      </Typography>
      {MODULE_CRUD_ACTIONS.map((action) => {
        const disabled = readOnly
        return (
          <FormControlLabel
            key={action}
            sx={{
              m: 0,
              minWidth: 0,
              '& .MuiFormControlLabel-label': { minWidth: 0 },
            }}
            control={
              <Checkbox
                size="small"
                checked={b[action]}
                disabled={disabled}
                onChange={(e) => onCrudChange(modId, action, e.target.checked)}
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{ fontSize: 13, overflowWrap: 'anywhere' }}
              >
                {ACTION_LABELS[action]}
              </Typography>
            }
          />
        )
      })}
    </Box>
  )
}

function SubModuleScopeGrid({
  childrenDefs,
  perms,
  readOnly,
  onScopeChange,
}: {
  childrenDefs: NonNullable<ModuleDef['children']>
  perms: UserPermissions
  readOnly: boolean
  onScopeChange: (childId: UserPermissionModuleKey, checked: boolean) => void
}) {
  return (
    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px solid ${tokens.color.neutral[100]}` }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: tokens.color.neutral[500],
          mb: 0.75,
        }}
      >
        Sub Modules
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(140px, 1fr))' },
          columnGap: 2,
          rowGap: 0.25,
          minWidth: 0,
        }}
      >
        {childrenDefs.map((child) => {
          const disabled = readOnly
          return (
            <FormControlLabel
              key={child.id}
              sx={{
                m: 0,
                minWidth: 0,
                '& .MuiFormControlLabel-label': { minWidth: 0 },
              }}
              control={
                <Checkbox
                  size="small"
                  checked={perms[child.id].view}
                  disabled={disabled}
                  onChange={(e) => onScopeChange(child.id, e.target.checked)}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' }}
                >
                  {child.label}
                </Typography>
              }
            />
          )
        })}
      </Box>
    </Box>
  )
}

function ModulePanel({
  mod,
  perms,
  readOnly,
  expanded,
  onExpandChange,
  onFullAccessChange,
  onCrudChange,
  onScopeChange,
}: {
  mod: ModuleDef
  perms: UserPermissions
  readOnly: boolean
  expanded: boolean
  onExpandChange: (val: boolean) => void
  onFullAccessChange: (modId: UserPermissionModuleKey, checked: boolean) => void
  onCrudChange: (modId: UserPermissionModuleKey, action: ModuleCrudAction, val: boolean) => void
  onScopeChange: (childId: UserPermissionModuleKey, checked: boolean) => void
}) {
  const status = getModuleStatus(perms, mod)
  const keys = keysForModule(mod)
  const allChecked = keys.every((key) => isFull(perms, key))
  const noneChecked = keys.every((key) => !isAny(perms, key))
  const fullAccessIndeterminate = !allChecked && !noneChecked
  const singleCheckbox = SINGLE_CHECKBOX_MODULES.has(mod.id)

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
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, py: 0.5, minHeight: 48, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ width: '100%', minWidth: 0, pr: 1 }}>
          <Box sx={{ color: tokens.color.primary[500], display: 'flex' }}>{mod.icon}</Box>
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
            {mod.label}
          </Typography>
          <ModuleStatusBadge status={status} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2 }}>
        <Divider sx={{ mb: 1.5 }} />
        {singleCheckbox ? (
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                size="small"
                checked={perms[mod.id].view}
                disabled={readOnly}
                onChange={(e) => onCrudChange(mod.id, 'view', e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                {mod.label}
              </Typography>
            }
          />
        ) : (
          <>
            <FormControlLabel
              sx={{ m: 0, mb: 1 }}
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
            <ModuleActionRow
              label={mod.label}
              modId={mod.id}
              perms={perms}
              readOnly={readOnly}
              onCrudChange={onCrudChange}
            />
            {mod.children?.length ? (
              <SubModuleScopeGrid
                childrenDefs={mod.children}
                perms={perms}
                readOnly={readOnly}
                onScopeChange={onScopeChange}
              />
            ) : null}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export interface UserPermissionsSummaryProps {
  perms: UserPermissions
}

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
    <Paper variant="outlined" sx={{ width: '100%', minWidth: 0, p: { xs: 1.5, sm: 2.5 }, borderRadius: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        gap={1}
        sx={{ mb: 2, minWidth: 0 }}
      >
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: tokens.color.neutral[500] }}
        >
          Permissions
        </Typography>
        {!readOnly && (
          <Stack direction="row" gap={1} flexWrap="wrap">
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
          onScopeChange={(childId, checked) => onChange(applySubModuleScope(value, childId, checked))}
        />
      ))}
    </Paper>
  )
}

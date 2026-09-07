import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Chip as MuiChip,
  FormControl,
  IconButton as MuiIconButton,
  MenuItem,
  Select as MuiSelect,
  Stack,
  Typography,
} from '@mui/material'
import { Close, PersonOutline } from '@mui/icons-material'
import { alpha } from '@mui/material/styles'
import { DrawerForm, FormField } from '@/components/templates/DrawerForm'
import { useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { updateProject } from '@/slices/projects/thunk'
import { fetchUsers } from '@/slices/users/thunk'
import { fetchRoles } from '@/slices/roles/thunk'
import type { Project } from '@/slices/projects/reducer'
import type { User } from '@/slices/users/reducer'
import {
  buildAssignedTeamPayload,
  getProjectAdditionalTeamMembers,
} from '@/utils/projectAssignedTeam'
import { getAvatarColor, getInitials } from '@/utils/formatters'
import { tokens } from '@/design-system/tokens'
import { makeEmptyUserPermissions } from '@/types/permissions'
import { isProjectLeadRole } from '../projectManagerRoles'

function toTeamUserStub(member: { userId: string; name: string; isActive?: boolean }): User {
  return {
    id: member.userId,
    name: member.name,
    email: '',
    role: '',
    permissions: makeEmptyUserPermissions(),
    projectAccess: 'selected',
    assignedProjects: [],
    status: member.isActive === false ? 'inactive' : 'active',
    lastLogin: null,
    createdAt: '',
  }
}

interface EditProjectTeamDrawerProps {
  open: boolean
  onClose: () => void
  project: Project
}

export function EditProjectTeamDrawer({
  open,
  onClose,
  project,
}: EditProjectTeamDrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const users = useAppSelector((s) => s.users.items ?? [])
  const roles = useAppSelector((s) => s.roles.items ?? [])
  const saving = useAppSelector((s) => s.projects.saving)

  const [projectManagerId, setProjectManagerId] = useState('')
  const [projectManagerName, setProjectManagerName] = useState('')
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [leadError, setLeadError] = useState<string | undefined>()

  const managers = useMemo(
    () => users.filter((u) => u.status === 'active' && isProjectLeadRole(u.role, roles)),
    [users, roles],
  )

  const currentLeadOutsideManagers = useMemo(() => {
    if (!projectManagerId) return null
    if (managers.some((m) => m.id === projectManagerId)) return null
    const fromUsers = users.find((u) => u.id === projectManagerId)
    if (fromUsers) return fromUsers
    if (project.projectManagerId === projectManagerId && project.projectManager) {
      const leadMeta = (project.assignedTeam ?? []).find((m) => m.userId === projectManagerId)
      return toTeamUserStub({
        userId: projectManagerId,
        name: projectManagerName || project.projectManager,
        isActive: leadMeta?.isActive !== false,
      })
    }
    return null
  }, [
    managers,
    users,
    projectManagerId,
    projectManagerName,
    project.projectManagerId,
    project.projectManager,
    project.assignedTeam,
  ])

  const teamOptions = useMemo(() => {
    const active = users.filter((u) => u.status === 'active' && u.id !== projectManagerId)
    const existingInactive = getProjectAdditionalTeamMembers(project)
      .filter((m) => m.isActive === false && m.userId !== projectManagerId)
      .map((m) => users.find((u) => u.id === m.userId) ?? toTeamUserStub(m))
    const byId = new Map<string, User>()
    for (const user of [...active, ...existingInactive]) byId.set(user.id, user)
    return Array.from(byId.values())
  }, [users, projectManagerId, project])

  function getRoleLabel(roleId: string) {
    return roles.find((r) => r.id === roleId)?.name ?? roleId
  }

  useEffect(() => {
    if (!open) return
    void dispatch(fetchUsers({}))
    void dispatch(fetchRoles(undefined))
  }, [open, dispatch])

  useEffect(() => {
    if (!open) return
    setProjectManagerId(project.projectManagerId ?? '')
    setProjectManagerName(project.projectManager ?? '')
    setLeadError(undefined)

    const additional = getProjectAdditionalTeamMembers(project)
    const mapped = additional.map((m) => {
      const found = users.find((u) => u.id === m.userId)
      return found ?? toTeamUserStub(m)
    })
    setTeamMembers(mapped)
  }, [open, project, users])

  async function handleSave() {
    if (!projectManagerId.trim()) {
      setLeadError('Project lead is required')
      return
    }

    try {
      await dispatch(
        updateProject({
          id: project.id,
          data: {
            projectManagerId,
            projectManager: projectManagerName,
            assignedTeam: buildAssignedTeamPayload(
              projectManagerId,
              projectManagerName,
              teamMembers,
              getRoleLabel,
            ),
          },
        }),
      ).unwrap()
      showToast({ title: 'Team updated', variant: 'success' })
      onClose()
    } catch (err: unknown) {
      const message = typeof err === 'string' ? err : 'Failed to update team'
      showToast({ title: message, variant: 'error' })
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Edit Team"
      subtitle="Update project lead and team members"
      onSubmit={() => void handleSave()}
      submitLabel="Save Team"
      cancelLabel="Cancel"
      submitLoading={saving}
      width={480}
    >
      <Stack gap={2}>
        <FormField label="Project Lead" required error={leadError}>
          <FormControl fullWidth size="small" error={Boolean(leadError)}>
            <MuiSelect
              value={projectManagerId}
              onChange={(e) => {
                const mgr = managers.find((m) => m.id === e.target.value)
                setProjectManagerId(e.target.value)
                setProjectManagerName(mgr?.name ?? '')
                setTeamMembers((prev) => prev.filter((m) => m.id !== e.target.value))
                setLeadError(undefined)
              }}
              displayEmpty
              sx={{ fontSize: 13 }}
              renderValue={(val) => {
                if (!val) {
                  return (
                    <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
                      Select project lead…
                    </Typography>
                  )
                }
                const mgr =
                  managers.find((m) => m.id === val) ??
                  (currentLeadOutsideManagers?.id === val ? currentLeadOutsideManagers : null)
                const name = mgr?.name ?? projectManagerName ?? String(val)
                const inactive = mgr?.status === 'inactive'
                return (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <PersonOutline sx={{ fontSize: 14, color: inactive ? 'text.disabled' : undefined }} />
                    <Typography sx={{ fontSize: 13, color: inactive ? 'text.disabled' : undefined }}>
                      {name}
                    </Typography>
                  </Stack>
                )
              }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>
                Select project lead…
              </MenuItem>
              {currentLeadOutsideManagers ? (
                <MenuItem
                  value={currentLeadOutsideManagers.id}
                  sx={{
                    fontSize: 13,
                    gap: 1,
                    color: currentLeadOutsideManagers.status === 'inactive' ? 'text.disabled' : undefined,
                  }}
                >
                  <PersonOutline sx={{ fontSize: 14 }} />
                  {currentLeadOutsideManagers.name}
                  <MuiChip
                    label={
                      currentLeadOutsideManagers.status === 'inactive'
                        ? 'Inactive'
                        : getRoleLabel(currentLeadOutsideManagers.role)
                    }
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 10,
                      ml: 'auto',
                      '& .MuiChip-label': { px: '6px' },
                    }}
                  />
                </MenuItem>
              ) : null}
              {managers.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13, gap: 1 }}>
                  <PersonOutline sx={{ fontSize: 14 }} />
                  {m.name}
                  <MuiChip
                    label={getRoleLabel(m.role)}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 10,
                      ml: 'auto',
                      '& .MuiChip-label': { px: '6px' },
                    }}
                  />
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        </FormField>

        <FormField label="Add Team Members">
          <Autocomplete
            multiple
            size="small"
            options={teamOptions}
            disabled={!projectManagerId}
            getOptionLabel={(u) => u.name}
            getOptionDisabled={(u) => u.status === 'inactive'}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={teamMembers}
            onChange={(_, val) => setTeamMembers(val)}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  gap: 1,
                  color: option.status === 'inactive' ? 'text.disabled' : undefined,
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor:
                      option.status === 'inactive'
                        ? tokens.color.neutral[200]
                        : alpha(getAvatarColor(option.name).bg, 0.15),
                    color:
                      option.status === 'inactive'
                        ? tokens.color.neutral[500]
                        : getAvatarColor(option.name).text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(option.name)}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, color: option.status === 'inactive' ? 'text.disabled' : undefined }}>
                    {option.name}
                  </Typography>
                </Box>
                <MuiChip
                  label={option.status === 'inactive' ? 'Inactive' : getRoleLabel(option.role)}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 10,
                    ml: 'auto',
                    '& .MuiChip-label': { px: '6px' },
                  }}
                />
              </Box>
            )}
            renderTags={() => null}
            renderInput={(params) => (
              <Box
                component="div"
                ref={params.InputProps.ref}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.75,
                  minHeight: 40,
                  bgcolor: projectManagerId ? 'background.paper' : 'action.hover',
                }}
              >
                <Box
                  component="input"
                  {...params.inputProps}
                  placeholder={
                    projectManagerId
                      ? 'Search users…'
                      : 'Select a project lead first…'
                  }
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: 13,
                    background: 'transparent',
                  }}
                />
              </Box>
            )}
          />
        </FormField>

        {teamMembers.length > 0 ? (
          <Stack gap={1}>
            {teamMembers.map((member) => {
              const inactive = member.status === 'inactive'
              return (
              <Stack
                key={member.id}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: inactive ? tokens.color.neutral[50] : undefined,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: inactive
                      ? tokens.color.neutral[200]
                      : alpha(getAvatarColor(member.name).bg, 0.15),
                    color: inactive
                      ? tokens.color.neutral[500]
                      : getAvatarColor(member.name).text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(member.name)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: inactive ? 'text.disabled' : undefined,
                    }}
                  >
                    {member.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: 11, color: inactive ? 'text.disabled' : undefined }}
                  >
                    {inactive ? 'Inactive' : getRoleLabel(member.role)}
                  </Typography>
                </Box>
                <MuiIconButton
                  size="small"
                  aria-label={`Remove ${member.name}`}
                  onClick={() =>
                    setTeamMembers((prev) => prev.filter((m) => m.id !== member.id))
                  }
                  sx={{ color: 'error.main' }}
                >
                  <Close sx={{ fontSize: 16 }} />
                </MuiIconButton>
              </Stack>
              )
            })}
          </Stack>
        ) : null}
      </Stack>
    </DrawerForm>
  )
}

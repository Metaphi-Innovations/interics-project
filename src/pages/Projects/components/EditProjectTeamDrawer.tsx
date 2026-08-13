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
import { isProjectManagerRole } from '../projectManagerRoles'

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

  const managers = useMemo(() => {
    const filtered = users.filter((u) => isProjectManagerRole(u.role, roles))
    return filtered.length > 0 ? filtered : users.filter((u) => u.status === 'active')
  }, [users, roles])

  const teamOptions = useMemo(
    () => users.filter((u) => u.id !== projectManagerId),
    [users, projectManagerId],
  )

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
    const mapped = additional
      .map((m) => users.find((u) => u.id === m.userId))
      .filter((u): u is User => Boolean(u))
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
                const mgr = managers.find((m) => m.id === val)
                if (!mgr) return val
                return (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <PersonOutline sx={{ fontSize: 14 }} />
                    <Typography sx={{ fontSize: 13 }}>{mgr.name}</Typography>
                  </Stack>
                )
              }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>
                Select project lead…
              </MenuItem>
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
            value={teamMembers}
            onChange={(_, val) => setTeamMembers(val)}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ gap: 1 }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor: alpha(getAvatarColor(option.name).bg, 0.15),
                    color: getAvatarColor(option.name).text,
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
                  <Typography sx={{ fontSize: 13 }}>{option.name}</Typography>
                </Box>
                <MuiChip
                  label={getRoleLabel(option.role)}
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
            {teamMembers.map((member) => (
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
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: alpha(getAvatarColor(member.name).bg, 0.15),
                    color: getAvatarColor(member.name).text,
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
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {member.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    {getRoleLabel(member.role)}
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
            ))}
          </Stack>
        ) : null}
      </Stack>
    </DrawerForm>
  )
}

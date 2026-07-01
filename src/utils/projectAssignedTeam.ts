import type { Project, ProjectTeamMember } from '@/slices/projects/reducer'

export interface AssignedTeamUserInput {
  id: string
  name: string
  role: string
}

/** Build assignedTeam payload for create/update from project lead + additional members. */
export function buildAssignedTeamPayload(
  projectManagerId: string,
  projectManagerName: string,
  teamMembers: AssignedTeamUserInput[],
  getRoleLabel: (roleId: string) => string,
): ProjectTeamMember[] {
  const members: ProjectTeamMember[] = []
  const leadId = projectManagerId.trim()

  if (leadId && projectManagerName.trim()) {
    members.push({
      userId: leadId,
      name: projectManagerName.trim(),
      roleLabel: 'Project Lead',
    })
  }

  for (const user of teamMembers) {
    if (!user.id?.trim() || !user.name?.trim() || user.id === leadId) continue
    members.push({
      userId: user.id.trim(),
      name: user.name.trim(),
      roleLabel: getRoleLabel(user.role),
    })
  }

  return members
}

/** Additional team members (excluding project lead) for overview display. */
export function getProjectAdditionalTeamMembers(project: Project): ProjectTeamMember[] {
  const leadId = project.projectManagerId?.trim()
  return (project.assignedTeam ?? [])
    .filter((m) => Boolean(m.userId?.trim()) && Boolean(m.name?.trim()))
    .filter((m) => m.userId !== leadId)
}

export function getProjectAdditionalTeamMemberNames(project: Project): string[] {
  return getProjectAdditionalTeamMembers(project).map((m) => m.name.trim())
}

/** Team rows for Added Team listing — uses assignedTeam or falls back to project lead. */
export function getProjectAssignedMembers(project: Project): ProjectTeamMember[] {
  const fromTeam = (project.assignedTeam ?? []).filter(
    (m) => Boolean(m.userId?.trim()) && Boolean(m.name?.trim()),
  )
  if (fromTeam.length > 0) return fromTeam

  const managerId = project.projectManagerId?.trim()
  const managerName = project.projectManager?.trim()
  if (managerId && managerName) {
    return [{ userId: managerId, name: managerName, roleLabel: 'Project Lead' }]
  }

  return []
}

export function projectHasAssignedMembers(project: Project): boolean {
  return getProjectAssignedMembers(project).length > 0
}

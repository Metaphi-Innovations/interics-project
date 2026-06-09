import type { Project, ProjectTeamMember } from '@/slices/projects/reducer'

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

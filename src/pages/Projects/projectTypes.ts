/** Selectable project type tags (project setup + listing). */
export const PROJECT_TYPE_OPTIONS = [
  'TDD',
  'ID',
  'MEP',
  'Local Approvals',
  'Acoustic',
  'Lighting',
  'Kitchen',
  'Structural',
  'LEED',
  'AV',
  'IT',
  'Security',
  'Build',
  'Branding & Styling',
  'Other',
] as const

export type ProjectTypeOption = (typeof PROJECT_TYPE_OPTIONS)[number]

/** Read project types from API/mock shape (supports legacy single `type`). */
export function getProjectTypes(project: {
  projectTypes?: string[]
  type?: string
}): string[] {
  if (project.projectTypes?.length) return project.projectTypes
  if (project.type) return [project.type]
  return []
}

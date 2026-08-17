/**
 * Project lead dropdown: users whose role is Project Lead / PROJECT_LEAD / project_lead.
 * Backend role names are stored uppercase with underscores (e.g. PROJECT_LEAD).
 */
export const PROJECT_LEAD_ROLE_NAME = 'Project Lead'
export const PROJECT_LEAD_ROLE_KEY = 'PROJECT_LEAD'

export function normalizeRoleKey(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

export function isProjectLeadRoleName(name: string): boolean {
  return normalizeRoleKey(name) === PROJECT_LEAD_ROLE_KEY
}

export function isProjectLeadRole(
  roleIdOrName: string,
  roles?: Array<{ id: string; name: string }>,
): boolean {
  const value = roleIdOrName?.trim()
  if (!value) return false
  if (isProjectLeadRoleName(value)) return true
  const matched = roles?.find(
    (role) => role.id === value || normalizeRoleKey(role.name) === normalizeRoleKey(value),
  )
  return Boolean(matched && isProjectLeadRoleName(matched.name))
}

/** @deprecated use isProjectLeadRole */
export function isProjectManagerRole(
  roleIdOrName: string,
  roles?: Array<{ id: string; name: string }>,
): boolean {
  return isProjectLeadRole(roleIdOrName, roles)
}

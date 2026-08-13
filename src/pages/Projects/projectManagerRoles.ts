/**
 * Project lead dropdown: only users whose role name is "Project Lead".
 */
export const PROJECT_LEAD_ROLE_NAME = 'Project Lead'

export function isProjectLeadRole(
  roleIdOrName: string,
  roles?: Array<{ id: string; name: string }>,
): boolean {
  const value = roleIdOrName?.trim()
  if (!value) return false
  if (value.toLowerCase() === PROJECT_LEAD_ROLE_NAME.toLowerCase()) return true
  const matched = roles?.find((role) => role.id === value)
  return Boolean(matched && matched.name.trim().toLowerCase() === PROJECT_LEAD_ROLE_NAME.toLowerCase())
}

/** @deprecated use isProjectLeadRole */
export function isProjectManagerRole(
  roleIdOrName: string,
  roles?: Array<{ id: string; name: string }>,
): boolean {
  return isProjectLeadRole(roleIdOrName, roles)
}

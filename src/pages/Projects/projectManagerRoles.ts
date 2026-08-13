/**
 * Roles that may act as project lead in create/edit flows.
 * Supports mock role ids (MSW) and real backend role names/codes.
 */
export const PROJECT_MANAGER_ROLE_IDS = new Set(['r-001', 'r-002', 'r-003'])

export const PROJECT_MANAGER_ROLE_NAMES = new Set([
  'Admin',
  'Power User',
  'Project User',
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'OPERATIONS',
])

export function isProjectManagerRole(
  roleIdOrName: string,
  roles?: Array<{ id: string; name: string }>,
): boolean {
  const value = roleIdOrName?.trim()
  if (!value) return false
  if (PROJECT_MANAGER_ROLE_IDS.has(value)) return true
  if (PROJECT_MANAGER_ROLE_NAMES.has(value)) return true
  const matched = roles?.find((role) => role.id === value)
  return Boolean(matched && PROJECT_MANAGER_ROLE_NAMES.has(matched.name))
}

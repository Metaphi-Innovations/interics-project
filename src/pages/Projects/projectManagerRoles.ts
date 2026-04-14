/**
 * User.role stores role ids (e.g. r-003), not display names.
 * These roles may act as project manager in create/edit flows.
 */
export const PROJECT_MANAGER_ROLE_IDS = new Set(['r-001', 'r-002', 'r-003'])

export function isProjectManagerRole(roleId: string): boolean {
  return PROJECT_MANAGER_ROLE_IDS.has(roleId)
}

/** Role chip styling keyed by role ID (mock / API ids). */
export const ROLE_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  'r-001': { label: 'Admin', bg: '#CCFBF1', color: '#0D9488' },
  'r-002': { label: 'Power User', bg: '#DBEAFE', color: '#1D4ED8' },
  'r-003': { label: 'Project User', bg: '#DCFCE7', color: '#15803D' },
  'r-004': { label: 'Viewer', bg: '#F3F4F6', color: '#6B7280' },
}

export function getRoleChip(roleId: string) {
  return ROLE_CHIP[roleId] ?? { label: roleId, bg: '#F3F4F6', color: '#6B7280' }
}

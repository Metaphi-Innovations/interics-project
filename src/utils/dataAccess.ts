import type { DataScope } from '@/types/permissions'
import type { User } from '@/slices/users/reducer'

const ADMIN_ROLE_ID = 'r-001'

export interface ResolvedDataAccess {
  projectsDataScope: DataScope
  financialDataScope: DataScope
  complianceDataScope: DataScope
  /** Project IDs the user may access; `'all'` when unconstrained by assignment */
  effectiveProjectIds: string[] | 'all'
}

function defaultScopes(): ResolvedDataAccess {
  return {
    projectsDataScope: 'assigned',
    financialDataScope: 'assigned',
    complianceDataScope: 'assigned',
    effectiveProjectIds: [],
  }
}

/**
 * Effective data scope from project access only (V2 — no per-module dataScope on permissions).
 * When projectAccess is `selected`, effectiveProjectIds is assignedProjects only.
 * Admin bypasses to full access.
 */
export function resolveDataAccess(user: User): ResolvedDataAccess {
  if (user.role === ADMIN_ROLE_ID) {
    return {
      projectsDataScope: 'all',
      financialDataScope: 'all',
      complianceDataScope: 'all',
      effectiveProjectIds: 'all',
    }
  }

  if (user.projectAccess === 'all') {
    return {
      projectsDataScope: 'all',
      financialDataScope: 'all',
      complianceDataScope: 'all',
      effectiveProjectIds: 'all',
    }
  }

  return {
    ...defaultScopes(),
    effectiveProjectIds: [...user.assignedProjects],
  }
}

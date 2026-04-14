import type { Role, DataScope } from '@/types/permissions'
import type { User } from '@/slices/users/reducer'

const ADMIN_ROLE_ID = 'r-001'

export interface ResolvedDataAccess {
  /** Effective data scope per domain after role ∩ user project access */
  projectsDataScope: DataScope
  financialDataScope: DataScope
  complianceDataScope: DataScope
  /** Project IDs the user may access; `'all'` when unconstrained by assignment */
  effectiveProjectIds: string[] | 'all'
}

/**
 * Final access = role permissions/dataScope ∩ user project access.
 * Admin users bypass to full access.
 */
export function resolveDataAccess(role: Role | null | undefined, user: User): ResolvedDataAccess {
  if (user.role === ADMIN_ROLE_ID || !role) {
    return {
      projectsDataScope: 'all',
      financialDataScope: 'all',
      complianceDataScope: 'all',
      effectiveProjectIds: 'all',
    }
  }

  const { permissions: p } = role

  let projectsDataScope = p.projects_dataScope
  let financialDataScope = p.financial_dataScope
  let complianceDataScope = p.compliance_dataScope

  if (user.projectAccess === 'selected') {
    const ids = user.assignedProjects
    const narrow = (scope: DataScope): DataScope => {
      if (scope === 'all') return 'assigned'
      return scope
    }
    projectsDataScope = narrow(projectsDataScope)
    financialDataScope = narrow(financialDataScope)
    complianceDataScope = narrow(complianceDataScope)
    return {
      projectsDataScope,
      financialDataScope,
      complianceDataScope,
      effectiveProjectIds: ids,
    }
  }

  return {
    projectsDataScope,
    financialDataScope,
    complianceDataScope,
    effectiveProjectIds: 'all',
  }
}

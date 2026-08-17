import { describe, expect, it } from 'vitest'
import { isProjectLeadRole } from './projectManagerRoles'

const roles = [{ id: 'role-uuid-1', name: 'PROJECT_LEAD' }]

describe('isProjectLeadRole', () => {
  it('matches stored role codes and display names', () => {
    expect(isProjectLeadRole('PROJECT_LEAD')).toBe(true)
    expect(isProjectLeadRole('project_lead')).toBe(true)
    expect(isProjectLeadRole('Project Lead')).toBe(true)
  })

  it('matches a user whose role field is the role id', () => {
    expect(isProjectLeadRole('role-uuid-1', roles)).toBe(true)
  })

  it('does not match other roles', () => {
    expect(isProjectLeadRole('ADMIN', roles)).toBe(false)
    expect(isProjectLeadRole('role-uuid-2', [{ id: 'role-uuid-2', name: 'SALES' }])).toBe(false)
  })
})

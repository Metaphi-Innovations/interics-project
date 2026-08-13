import { describe, expect, it } from 'vitest'
import {
  validateProjectManagementCategory,
  validateProjectManagementForm,
} from './project-management.validation'
import { toProjectManagementMaster } from './project-management.service'

describe('project-management.validation', () => {
  it('rejects missing/blank category', () => {
    expect(validateProjectManagementCategory('')).toBe('Category is required')
    expect(validateProjectManagementCategory('   ')).toBe('Category is required')
  })

  it('rejects non-alphabetic category', () => {
    expect(validateProjectManagementCategory('123')).toBe(
      'Category must contain only alphabetic characters.',
    )
    expect(validateProjectManagementCategory('Category123')).toBe(
      'Category must contain only alphabetic characters.',
    )
    expect(validateProjectManagementCategory('@#$')).toBe(
      'Category must contain only alphabetic characters.',
    )
  })

  it('accepts alphabetic category with spaces', () => {
    expect(validateProjectManagementCategory('Implementation')).toBeUndefined()
    expect(validateProjectManagementCategory('Project Management')).toBeUndefined()
  })

  it('requires at least one complete checkpoint', () => {
    const errors = validateProjectManagementForm({
      name: 'Design',
      checkpoints: [{ name: '' }],
    })
    expect(errors.checkpoints).toBe('Add at least one checkpoint')
  })

  it('requires checkpoint name', () => {
    const errors = validateProjectManagementForm({
      name: 'Design',
      checkpoints: [{ name: '' }],
    })
    expect(errors.checkpointErrors?.[0]?.name).toBeTruthy()
  })

  it('accepts valid form with multiple checkpoints', () => {
    const errors = validateProjectManagementForm({
      name: 'Operations',
      checkpoints: [{ name: 'Owner' }, { name: 'Lead' }],
    })
    expect(errors).toEqual({})
  })

  it('rejects duplicate checkpoint names case-insensitively', () => {
    const errors = validateProjectManagementForm({
      name: 'Design',
      checkpoints: [{ name: 'Owner' }, { name: ' owner ' }],
    })
    expect(errors.checkpointErrors?.[1]?.name).toBe('Checkpoint names must be unique.')
  })
})

describe('toProjectManagementMaster', () => {
  it('maps API ACTIVE/INACTIVE and category to UI shape', () => {
    const mapped = toProjectManagementMaster({
      id: 'pm-1',
      category: 'Implementation',
      totalCheckpoints: 1,
      status: 'ACTIVE',
      checkpoints: [{ id: 'cp-1', name: 'Owner' }],
    })
    expect(mapped).toEqual({
      id: 'pm-1',
      name: 'Implementation',
      totalCheckpoints: 1,
      status: 'active',
      checkpoints: [{ id: 'cp-1', name: 'Owner' }],
    })
  })
})

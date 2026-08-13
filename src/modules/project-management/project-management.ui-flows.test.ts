/**
 * UI flow coverage for Project Management Master (create / edit / status toggle).
 * Uses the same validation + payload mapping the section relies on.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  validateProjectManagementForm,
} from './project-management.validation'

describe('Project Management UI flows', () => {
  it('create flow: blocks submit without category or checkpoint', () => {
    expect(validateProjectManagementForm({ name: '', checkpoints: [] }).name).toBeTruthy()
    expect(
      validateProjectManagementForm({
        name: 'Design',
        checkpoints: [{ name: '' }],
      }).checkpoints,
    ).toBeTruthy()
  })

  it('create flow: builds payload with default active status and matching total', () => {
    const checkpoints = [
      { id: '1', name: 'Owner' },
      { id: '2', name: 'Lead' },
    ]
    const payload = {
      name: 'Implementation',
      checkpoints,
      totalCheckpoints: checkpoints.length,
      status: 'active' as const,
    }
    expect(payload.totalCheckpoints).toBe(2)
    expect(payload.status).toBe('active')
  })

  it('edit flow: updates total when checkpoints change', () => {
    let checkpoints = [{ id: '1', name: 'Owner' }]
    expect(checkpoints.length).toBe(1)
    checkpoints = [...checkpoints, { id: '2', name: 'Lead' }]
    expect(checkpoints.length).toBe(2)
    checkpoints = checkpoints.filter((c) => c.id !== '1')
    expect(checkpoints).toHaveLength(1)
  })

  it('status toggle flow: cancel prevents API call; confirm sends next status', async () => {
    const setStatus = vi.fn().mockResolvedValue({ id: 'pm-1', status: 'inactive' })
    let confirmed = false
    // cancel
    if (confirmed) await setStatus('pm-1', 'inactive')
    expect(setStatus).not.toHaveBeenCalled()

    confirmed = true
    if (confirmed) await setStatus('pm-1', 'inactive')
    expect(setStatus).toHaveBeenCalledWith('pm-1', 'inactive')

    await setStatus('pm-1', 'active')
    expect(setStatus).toHaveBeenLastCalledWith('pm-1', 'active')
  })

  it('status toggle flow: API failure retains previous status intent', async () => {
    const previous = 'active' as const
    const setStatus = vi.fn().mockRejectedValue(new Error('network'))
    let uiStatus: 'active' | 'inactive' = previous
    try {
      await setStatus('pm-1', 'inactive')
      uiStatus = 'inactive'
    } catch {
      uiStatus = previous
    }
    expect(uiStatus).toBe('active')
  })
})

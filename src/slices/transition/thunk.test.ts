import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()

vi.mock('@/api/client', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}))

import { fetchTransition, saveTransition } from './thunk'

describe('transition thunk auth', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('fetchTransition uses authenticated API client', async () => {
    get.mockResolvedValue({
      data: { versionId: null, categories: [], plannedExpenses: [] },
    })
    const action = await fetchTransition('proj-1')(
      vi.fn(),
      () => ({}),
      undefined,
    )
    expect(get).toHaveBeenCalledWith('/projects/proj-1/transition')
    expect(action.type).toBe('transition/fetchTransition/fulfilled')
    expect(action.payload).toEqual({
      versionId: null,
      categories: [],
      plannedExpenses: [],
    })
  })

  it('saveTransition uses authenticated API client', async () => {
    const body = { versionId: 'v1', categories: [], plannedExpenses: [] }
    post.mockResolvedValue({ data: body })
    const action = await saveTransition({ projectId: 'proj-1', body })(
      vi.fn(),
      () => ({}),
      undefined,
    )
    expect(post).toHaveBeenCalledWith('/projects/proj-1/transition/save', body)
    expect(action.type).toBe('transition/saveTransition/fulfilled')
  })

  it('does not use raw fetch for transition requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    get.mockResolvedValue({
      data: { versionId: null, categories: [], plannedExpenses: [] },
    })
    await fetchTransition('proj-2')(vi.fn(), () => ({}), undefined)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

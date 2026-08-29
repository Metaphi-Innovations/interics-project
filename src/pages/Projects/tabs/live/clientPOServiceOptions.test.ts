import { describe, expect, it } from 'vitest'
import { resolveClientPOMilestoneServiceOption } from './clientPOServiceOptions'

describe('resolveClientPOMilestoneServiceOption', () => {
  const options = [
    {
      id: 'svc-a',
      label: 'Design',
      categoryId: 'cat-1',
      categoryName: 'Build',
    },
  ]

  it('returns matching option for stored service id', () => {
    expect(resolveClientPOMilestoneServiceOption('svc-a', options)).toEqual(options[0])
  })

  it('returns undefined instead of substituting another service', () => {
    expect(resolveClientPOMilestoneServiceOption('svc-unknown', options)).toBeUndefined()
  })
})

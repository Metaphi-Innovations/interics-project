import { describe, expect, it, vi } from 'vitest'
import { createLoginSubmitGuard, isSignInEnabled } from './loginSubmitGuards'

describe('isSignInEnabled (login button)', () => {
  it('empty email → disabled', () => {
    expect(isSignInEnabled('', 'secret', false)).toBe(false)
  })

  it('empty password → disabled', () => {
    expect(isSignInEnabled('a@b.com', '', false)).toBe(false)
  })

  it('whitespace-only email → disabled', () => {
    expect(isSignInEnabled('   ', 'secret', false)).toBe(false)
  })

  it('valid fields → enabled', () => {
    expect(isSignInEnabled('a@b.com', 'secret', false)).toBe(true)
  })

  it('submitting → disabled even with valid fields', () => {
    expect(isSignInEnabled('a@b.com', 'secret', true)).toBe(false)
  })
})

describe('createLoginSubmitGuard (double-click / failure)', () => {
  it('submit → one request', async () => {
    const guard = createLoginSubmitGuard()
    const action = vi.fn(async () => {})
    await guard.run(false, action)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('double click → one request', async () => {
    const guard = createLoginSubmitGuard()
    let resolveFirst!: () => void
    const firstGate = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    const action = vi.fn(async () => {
      await firstGate
    })

    const p1 = guard.run(false, action)
    const p2 = guard.run(false, action)
    resolveFirst()
    await Promise.all([p1, p2])

    expect(action).toHaveBeenCalledTimes(1)
  })

  it('login failure → guard usable again', async () => {
    const guard = createLoginSubmitGuard()
    const fail = vi.fn(async () => {
      throw new Error('bad credentials')
    })
    await expect(guard.run(false, fail)).rejects.toThrow('bad credentials')

    const ok = vi.fn(async () => {})
    await guard.run(false, ok)
    expect(ok).toHaveBeenCalledTimes(1)
  })

  it('network failure → guard usable again', async () => {
    const guard = createLoginSubmitGuard()
    await expect(
      guard.run(false, async () => {
        throw new Error('Network Error')
      }),
    ).rejects.toThrow('Network Error')

    const ok = vi.fn(async () => {})
    expect(await guard.run(false, ok)).toBe(true)
    expect(ok).toHaveBeenCalledTimes(1)
  })

  it('skips when loading flag is true', async () => {
    const guard = createLoginSubmitGuard()
    const action = vi.fn(async () => {})
    expect(await guard.run(true, action)).toBe(false)
    expect(action).not.toHaveBeenCalled()
  })
})

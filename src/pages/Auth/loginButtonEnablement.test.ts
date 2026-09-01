import { describe, expect, it, vi } from 'vitest'
import {
  attachLoginValueWatchers,
  createLoginSubmitGuard,
  isAutofilledControl,
  isSignInEnabled,
  LOGIN_AUTOFILL_SYNC_DELAYS_MS,
  mergeLoginDomIntoState,
  readLoginCredentialsFromDom,
  scheduleLoginAutofillSync,
} from './loginSubmitGuards'

/**
 * Documents Sign In enablement rules used by LoginPage:
 * canSubmit = isSignInEnabled(email, password, submitting, nativeFilled)
 * (Redux auth.loading must NOT gate the visual enabled state.)
 */
describe('Login Sign In button enablement contract', () => {
  it('1. initial empty fields → disabled', () => {
    expect(isSignInEnabled('', '', false)).toBe(false)
    expect(isSignInEnabled('', '', false, { email: false, password: false })).toBe(false)
  })

  it('2. initial normal values → enabled', () => {
    expect(isSignInEnabled('admin@interics.com', 'Admin@123456', false)).toBe(true)
  })

  it('email only → disabled', () => {
    expect(isSignInEnabled('admin@interics.com', '', false)).toBe(false)
  })

  it('password only → disabled', () => {
    expect(isSignInEnabled('', 'secret12', false)).toBe(false)
  })

  it('3. initial browser-autofilled DOM values → enabled without a user event', () => {
    const root = {
      querySelector(selector: string) {
        if (selector.includes('email')) return { value: 'admin@interics.com', matches: () => false }
        if (selector.includes('password')) return { value: 'saved-password', matches: () => false }
        return null
      },
    } as unknown as ParentNode

    let email = ''
    let password = ''
    let nativeFilled = { email: false, password: false }
    const snap = readLoginCredentialsFromDom(root)
    const merged = mergeLoginDomIntoState(email, password, snap)
    email = merged.email
    password = merged.password
    nativeFilled = merged.nativeFilled

    expect(isSignInEnabled(email, password, false, nativeFilled)).toBe(true)
  })

  it('webkit-autofilled fields with empty JS value → enabled', () => {
    const root = {
      querySelector(selector: string) {
        if (selector.includes('email')) {
          return { value: '', matches: (sel: string) => sel === ':-webkit-autofill' }
        }
        if (selector.includes('password')) {
          return { value: '', matches: (sel: string) => sel === ':-webkit-autofill' }
        }
        return null
      },
    } as unknown as ParentNode

    const snap = readLoginCredentialsFromDom(root)
    expect(snap.email).toBe('')
    expect(snap.password).toBe('')
    expect(snap.emailFilled).toBe(true)
    expect(snap.passwordFilled).toBe(true)
    expect(isSignInEnabled('', '', false, { email: snap.emailFilled, password: snap.passwordFilled })).toBe(
      true,
    )
  })

  it('isAutofilledControl uses :-webkit-autofill / :autofill', () => {
    const el = { matches: (sel: string) => sel === ':autofill' } as unknown as HTMLInputElement
    expect(isAutofilledControl(el)).toBe(true)
    expect(isAutofilledControl(null)).toBe(false)
  })

  it('reads email + password together from the form DOM (autofill sync)', () => {
    const root = {
      querySelector(selector: string) {
        if (selector.includes('email')) return { value: 'admin@interics.com', matches: () => false }
        if (selector.includes('password')) return { value: 'Admin@123456', matches: () => false }
        return null
      },
    } as unknown as ParentNode

    expect(readLoginCredentialsFromDom(root)).toMatchObject({
      email: 'admin@interics.com',
      password: 'Admin@123456',
      emailFilled: true,
      passwordFilled: true,
    })
  })

  it('does not clobber typed React state with a premature empty DOM read', () => {
    const merged = mergeLoginDomIntoState('typed@x.com', 'typed-pass', {
      email: '',
      password: '',
      emailFilled: false,
      passwordFilled: false,
    })
    expect(merged.email).toBe('typed@x.com')
    expect(merged.password).toBe('typed-pass')
  })

  it('4. autofill occurring after mount (late timeout) is scheduled', () => {
    expect(LOGIN_AUTOFILL_SYNC_DELAYS_MS).toEqual([0, 50, 150, 400, 800])
  })

  it('5. typing email/password → enabled', () => {
    expect(isSignInEnabled('a@b.com', 'secret12', false)).toBe(true)
  })

  it('6. clearing either field → disabled', () => {
    expect(isSignInEnabled('admin@interics.com', '', false, { email: true, password: false })).toBe(false)
    expect(isSignInEnabled('', 'Admin@123456', false, { email: false, password: true })).toBe(false)
  })

  it('7. submitting → disabled', () => {
    expect(isSignInEnabled('admin@interics.com', 'Admin@123456', true)).toBe(false)
    expect(
      isSignInEnabled('admin@interics.com', 'Admin@123456', true, { email: true, password: true }),
    ).toBe(false)
  })

  it('scheduleLoginAutofillSync runs immediately, on rAF, and on late one-shot timeouts', () => {
    const sync = vi.fn()
    const rafCbs: FrameRequestCallback[] = []
    const timeoutCbs: Array<{ cb: () => void; ms: number }> = []

    const stop = scheduleLoginAutofillSync(sync, {
      rAF: (cb) => {
        rafCbs.push(cb)
        return rafCbs.length
      },
      cancelRAF: vi.fn(),
      timeout: (cb, ms) => {
        timeoutCbs.push({ cb, ms })
        return timeoutCbs.length as unknown as ReturnType<typeof setTimeout>
      },
      clearTimeoutFn: vi.fn(),
    })

    expect(sync).toHaveBeenCalledTimes(1)

    rafCbs[0]?.(0)
    expect(sync).toHaveBeenCalledTimes(2)
    rafCbs[1]?.(0)
    expect(sync).toHaveBeenCalledTimes(3)

    expect(timeoutCbs.map((t) => t.ms)).toEqual([...LOGIN_AUTOFILL_SYNC_DELAYS_MS])
    timeoutCbs.find((t) => t.ms === 400)?.cb()
    expect(sync.mock.calls.length).toBeGreaterThanOrEqual(4)

    stop()
  })

  it('4b. late DOM fill after the old 100ms window still enables via scheduled sync', () => {
    let email = ''
    let password = ''
    let nativeFilled = { email: false, password: false }
    let filled = false
    const root = {
      querySelector(selector: string) {
        if (!filled) return { value: '', matches: () => false }
        if (selector.includes('email')) return { value: 'admin@interics.com', matches: () => false }
        if (selector.includes('password')) return { value: 'saved-password', matches: () => false }
        return null
      },
    } as unknown as ParentNode

    const sync = () => {
      const snap = readLoginCredentialsFromDom(root)
      const merged = mergeLoginDomIntoState(email, password, snap)
      email = merged.email
      password = merged.password
      nativeFilled = merged.nativeFilled
    }

    const timeoutCbs: Array<{ cb: () => void; ms: number }> = []
    scheduleLoginAutofillSync(sync, {
      rAF: (cb) => {
        cb(0)
        return 1
      },
      cancelRAF: vi.fn(),
      timeout: (cb, ms) => {
        timeoutCbs.push({ cb, ms })
        return timeoutCbs.length as unknown as ReturnType<typeof setTimeout>
      },
      clearTimeoutFn: vi.fn(),
    })

    expect(isSignInEnabled(email, password, false, nativeFilled)).toBe(false)

    filled = true
    timeoutCbs.find((t) => t.ms === 400)?.cb()
    expect(isSignInEnabled(email, password, false, nativeFilled)).toBe(true)
  })
  it('value watchers notify on silent native autofill writes (no input event)', async () => {
    const store = new WeakMap<object, string>()
    class FakeInput {
      name = ''
    }
    Object.defineProperty(FakeInput.prototype, 'value', {
      configurable: true,
      enumerable: true,
      get() {
        return store.get(this) ?? ''
      },
      set(next: string) {
        store.set(this, String(next))
      },
    })

    const previous = (globalThis as { HTMLInputElement?: unknown }).HTMLInputElement
    ;(globalThis as { HTMLInputElement: unknown }).HTMLInputElement = FakeInput

    try {
      const email = new FakeInput()
      email.name = 'email'
      const password = new FakeInput()
      password.name = 'password'
      const form = {
        querySelector(selector: string) {
          if (selector.includes('email')) return email
          if (selector.includes('password')) return password
          return null
        },
      } as unknown as HTMLFormElement

      const onWrite = vi.fn()
      const stop = attachLoginValueWatchers(form, onWrite)

      const protoSet = Object.getOwnPropertyDescriptor(FakeInput.prototype, 'value')!.set!
      protoSet.call(email, 'admin@interics.com')
      protoSet.call(password, 'saved-password')

      await Promise.resolve()
      expect(onWrite).toHaveBeenCalled()
      expect((email as unknown as { value: string }).value).toBe('admin@interics.com')
      expect((password as unknown as { value: string }).value).toBe('saved-password')
      stop()
    } finally {
      if (previous) {
        ;(globalThis as { HTMLInputElement: unknown }).HTMLInputElement = previous
      } else {
        delete (globalThis as { HTMLInputElement?: unknown }).HTMLInputElement
      }
    }
  })
})

describe('createLoginSubmitGuard (double-click / Enter / failure)', () => {
  it('submit → one request', async () => {
    const guard = createLoginSubmitGuard()
    const action = vi.fn(async () => {})
    await guard.run(false, action)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('10. double click → one request', async () => {
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

  it('11. Enter key uses the same guard → one request', async () => {
    const guard = createLoginSubmitGuard()
    const action = vi.fn(async () => {})
    await Promise.all([guard.run(false, action), guard.run(false, action)])
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('8. login failure → guard usable again (button can enable)', async () => {
    const guard = createLoginSubmitGuard()
    const fail = vi.fn(async () => {
      throw new Error('bad credentials')
    })
    await expect(guard.run(false, fail)).rejects.toThrow('bad credentials')

    const ok = vi.fn(async () => {})
    await guard.run(false, ok)
    expect(ok).toHaveBeenCalledTimes(1)
    expect(isSignInEnabled('a@b.com', 'secret12', false)).toBe(true)
  })

  it('9. network failure → guard usable again (button can enable)', async () => {
    const guard = createLoginSubmitGuard()
    await expect(
      guard.run(false, async () => {
        throw new Error('Network Error')
      }),
    ).rejects.toThrow('Network Error')

    const ok = vi.fn(async () => {})
    expect(await guard.run(false, ok)).toBe(true)
    expect(ok).toHaveBeenCalledTimes(1)
    expect(isSignInEnabled('a@b.com', 'secret12', false)).toBe(true)
  })
})

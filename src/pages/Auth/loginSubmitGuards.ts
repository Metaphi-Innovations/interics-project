/** Pure helpers for login submit enablement / double-submit protection. */

export type LoginDomCredentials = {
  email: string
  password: string
  emailFilled: boolean
  passwordFilled: boolean
}

export type NativeLoginFilled = {
  email: boolean
  password: boolean
}

/** One-shot delays (ms). Not a polling interval — Chrome often fills after first paint. */
export const LOGIN_AUTOFILL_SYNC_DELAYS_MS = [0, 50, 150, 400, 800] as const

export function isSignInEnabled(
  email: string,
  password: string,
  isSubmitting: boolean,
  nativeFilled?: NativeLoginFilled,
): boolean {
  if (isSubmitting) return false
  const emailOk = Boolean(email.trim()) || Boolean(nativeFilled?.email)
  const passwordOk = Boolean(password) || Boolean(nativeFilled?.password)
  return emailOk && passwordOk
}

export function isAutofilledControl(el: HTMLInputElement | null | undefined): boolean {
  if (!el) return false
  try {
    if (el.matches(':-webkit-autofill')) return true
  } catch {
    /* unknown pseudo in some engines */
  }
  try {
    if (el.matches(':autofill')) return true
  } catch {
    /* ignore */
  }
  return false
}

/** Read both credential fields together so a single controlled re-render cannot wipe autofill. */
export function readLoginCredentialsFromDom(root: ParentNode): LoginDomCredentials {
  const emailEl = root.querySelector<HTMLInputElement>('input[name="email"]')
  const passwordEl = root.querySelector<HTMLInputElement>('input[name="password"]')
  const email = emailEl?.value ?? ''
  const password = passwordEl?.value ?? ''
  return {
    email,
    password,
    emailFilled: Boolean(email.trim()) || isAutofilledControl(emailEl),
    passwordFilled: Boolean(password) || isAutofilledControl(passwordEl),
  }
}

/** Copy native values into React state without clobbering typed values with a premature empty read. */
export function mergeLoginDomIntoState(
  prevEmail: string,
  prevPassword: string,
  snap: LoginDomCredentials,
): { email: string; password: string; nativeFilled: NativeLoginFilled } {
  return {
    email: snap.email ? snap.email : prevEmail,
    password: snap.password ? snap.password : prevPassword,
    nativeFilled: {
      email: snap.emailFilled,
      password: snap.passwordFilled,
    },
  }
}

type AutofillSyncTimers = {
  rAF?: (cb: FrameRequestCallback) => number
  cancelRAF?: (id: number) => void
  timeout?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeoutFn?: (id: ReturnType<typeof setTimeout>) => void
}

/**
 * Chrome/password managers often fill native inputs after first paint without
 * firing input/change. Run a few one-shot syncs (not a polling loop).
 */
export function scheduleLoginAutofillSync(
  sync: () => void,
  timers: AutofillSyncTimers = {},
): () => void {
  const rAF =
    timers.rAF ??
    (typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame.bind(globalThis)
      : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number)
  const cancelRAF =
    timers.cancelRAF ??
    (typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame.bind(globalThis)
      : (id: number) => clearTimeout(id))
  const timeout = timers.timeout ?? setTimeout.bind(globalThis)
  const clearTimeoutFn = timers.clearTimeoutFn ?? clearTimeout.bind(globalThis)

  sync()

  let raf2 = 0
  const raf1 = rAF(() => {
    sync()
    raf2 = rAF(() => {
      sync()
    })
  })
  const timeoutIds = LOGIN_AUTOFILL_SYNC_DELAYS_MS.map((ms) => timeout(() => sync(), ms))

  return () => {
    cancelRAF(raf1)
    if (raf2) cancelRAF(raf2)
    for (const id of timeoutIds) clearTimeoutFn(id)
  }
}

/**
 * Chrome/password managers often assign input.value without input/change.
 * Patch HTMLInputElement.prototype.value while the login form is mounted so
 * both `el.value = …` and prototype `set.call(el, …)` are observed.
 * Cleanup restores the original descriptor.
 */
export function attachLoginValueWatchers(
  form: HTMLFormElement,
  onNativeValueWrite: () => void,
): () => void {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  if (!proto?.get || !proto?.set) return () => {}

  const watched = new Set(
    [
      form.querySelector<HTMLInputElement>('input[name="email"]'),
      form.querySelector<HTMLInputElement>('input[name="password"]'),
    ].filter((el): el is HTMLInputElement => Boolean(el)),
  )
  if (watched.size === 0) return () => {}

  let microQueued = false
  const notify = () => {
    if (microQueued) return
    microQueued = true
    queueMicrotask(() => {
      microQueued = false
      onNativeValueWrite()
    })
  }

  Object.defineProperty(HTMLInputElement.prototype, 'value', {
    configurable: true,
    enumerable: proto.enumerable,
    get(this: HTMLInputElement) {
      return proto.get!.call(this)
    },
    set(this: HTMLInputElement, next: string) {
      proto.set!.call(this, next)
      if (watched.has(this)) notify()
    },
  })

  return () => {
    Object.defineProperty(HTMLInputElement.prototype, 'value', proto)
  }
}

export function createLoginSubmitGuard() {
  let submitting = false

  return {
    getSubmitting: () => submitting,
    async run(loading: boolean, action: () => Promise<void>): Promise<boolean> {
      if (loading || submitting) return false
      submitting = true
      try {
        await action()
        return true
      } finally {
        submitting = false
      }
    },
  }
}

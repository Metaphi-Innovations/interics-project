import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, type AnimationEvent, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import { Box, Stack, Typography, Alert } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Eye, EyeOff } from 'lucide-react'
import { Input, Button, IconButton, Checkbox } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginThunk } from '@/slices/auth/thunk'
import type { AuthUser } from '@/slices/auth/reducer'
import AuthSplitLayout from '@/pages/Auth/components/AuthSplitLayout'
import { REMEMBER_EMAIL_KEY, SAVED_EMAIL_KEY } from '@/pages/Auth/authConstants'
import { resolveAccess } from '@/utils/resolveAccess'
import {
  attachLoginValueWatchers,
  createLoginSubmitGuard,
  isSignInEnabled,
  mergeLoginDomIntoState,
  readLoginCredentialsFromDom,
  scheduleLoginAutofillSync,
  type NativeLoginFilled,
} from '@/pages/Auth/loginSubmitGuards'

function validateEmail(value: string): string {
  if (!value) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address'
  return ''
}

function validatePassword(value: string): string {
  if (!value) return 'Password is required'
  if (value.length < 6) return 'Password must be at least 6 characters'
  return ''
}

function isAutofillAnimation(name: string): boolean {
  return name === 'mui-auto-fill' || name === 'mui-auto-fill-cancel' || name.includes('onAutoFill')
}

function resolvePostLoginPath(user: AuthUser | null | undefined): string {
  if (!user) return '/dashboard'
  if (resolveAccess(user, 'dashboard', 'view')) return '/dashboard'
  if (resolveAccess(user, 'projects', 'view')) return '/projects'
  if (resolveAccess(user, 'customers', 'view')) return '/customers'
  if (resolveAccess(user, 'vendors', 'view')) return '/vendors'
  if (resolveAccess(user, 'team', 'view')) return '/added-team'
  if (resolveAccess(user, 'receivables', 'view')) return '/finance/receivables'
  if (resolveAccess(user, 'payables', 'view')) return '/finance/payables'
  if (resolveAccess(user, 'expenses', 'view')) return '/finance/expenses'
  if (resolveAccess(user, 'compliance', 'view')) return '/finance/compliance/filing-summary'
  if (resolveAccess(user, 'settings', 'view')) return '/settings'
  if (resolveAccess(user, 'userManagementUsers', 'view') || resolveAccess(user, 'userManagement', 'view')) {
    return '/user-management/users'
  }
  if (resolveAccess(user, 'userManagementRoles', 'view')) return '/user-management/roles'
  if (resolveAccess(user, 'userManagementTemplates', 'view')) return '/user-management/templates'
  return '/dashboard'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const { loading, error: authError, user, token } = useAppSelector(s => s.auth)

  const [email, setEmail] = useState(() => {
    try {
      if (localStorage.getItem(REMEMBER_EMAIL_KEY) === '1') {
        return localStorage.getItem(SAVED_EMAIL_KEY) ?? ''
      }
    } catch {
      /* ignore */
    }
    return ''
  })
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) === '1'
    } catch {
      return false
    }
  })
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  /** Local submit lock only — do not couple Sign In enablement to Redux auth.loading (logout/etc.). */
  const [submitting, setSubmitting] = useState(false)
  /** Native autofill can be present (value or :-webkit-autofill) before React state updates. */
  const [nativeFilled, setNativeFilled] = useState<NativeLoginFilled>({ email: false, password: false })
  const submitGuard = useMemo(() => createLoginSubmitGuard(), [])
  const formRef = useRef<HTMLFormElement>(null)

  const syncCredentialsFromDom = useCallback((root: ParentNode) => {
    const snap = readLoginCredentialsFromDom(root)
    setEmail((prev) => {
      const next = mergeLoginDomIntoState(prev, '', snap).email
      return next === prev ? prev : next
    })
    setPassword((prev) => {
      const next = mergeLoginDomIntoState('', prev, snap).password
      return next === prev ? prev : next
    })
    setNativeFilled((prev) => {
      const next = { email: snap.emailFilled, password: snap.passwordFilled }
      return prev.email === next.email && prev.password === next.password ? prev : next
    })
  }, [])

  const syncFromForm = useCallback(() => {
    const form =
      formRef.current ??
      document.querySelector<HTMLFormElement>('form:has(input[name="email"])')
    if (!form) return
    syncCredentialsFromDom(form)
  }, [syncCredentialsFromDom])

  const setFormNode = useCallback(
    (node: HTMLFormElement | null) => {
      formRef.current = node
      if (node) syncCredentialsFromDom(node)
    },
    [syncCredentialsFromDom],
  )

  // Before paint: pick up autofill already present in native inputs.
  useLayoutEffect(() => {
    syncFromForm()
  }, [syncFromForm])

  // After paint: Chrome/password managers often fill later without input/focus.
  // Prototype value watchers catch silent native writes; one-shot rAF/timeouts are backup.
  useEffect(() => {
    const form =
      formRef.current ??
      document.querySelector<HTMLFormElement>('form:has(input[name="email"])')
    if (!form) return

    const syncThisForm = () => syncCredentialsFromDom(form)

    const syncFromEventTarget = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const eventForm = target.closest('form') ?? form
      if (!eventForm?.querySelector('input[name="email"]')) return
      syncCredentialsFromDom(eventForm)
    }
    const onAnimationStart = (event: globalThis.AnimationEvent) => {
      if (!isAutofillAnimation(event.animationName)) return
      syncFromEventTarget(event)
    }
    document.addEventListener('animationstart', onAnimationStart, true)
    document.addEventListener('input', syncFromEventTarget, true)
    document.addEventListener('change', syncFromEventTarget, true)
    window.addEventListener('pageshow', syncThisForm)

    const stopWatchers = attachLoginValueWatchers(form, syncThisForm)
    const stopSchedule = scheduleLoginAutofillSync(syncThisForm)
    syncThisForm()
    return () => {
      stopWatchers()
      stopSchedule()
      document.removeEventListener('animationstart', onAnimationStart, true)
      document.removeEventListener('input', syncFromEventTarget, true)
      document.removeEventListener('change', syncFromEventTarget, true)
      window.removeEventListener('pageshow', syncThisForm)
    }
  }, [syncCredentialsFromDom])

  useEffect(() => {
    if (user && token) {
      navigate(resolvePostLoginPath(user), { replace: true })
    }
  }, [user, token, navigate])

  async function handleLogin(override?: { email: string; password: string }) {
    const nextEmail = override?.email ?? email
    const nextPassword = override?.password ?? password

    const eErr = validateEmail(nextEmail)
    const pErr = validatePassword(nextPassword)
    setEmailError(eErr)
    setPasswordError(pErr)
    if (eErr || pErr) return

    await submitGuard.run(submitting || loading, async () => {
      setSubmitting(true)
      try {
        const result = await dispatch(loginThunk({ email: nextEmail, password: nextPassword })).unwrap()
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, '1')
          localStorage.setItem(SAVED_EMAIL_KEY, nextEmail)
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY)
          localStorage.removeItem(SAVED_EMAIL_KEY)
        }
        const from =
          (location.state as { from?: { pathname?: string } })?.from?.pathname ||
          resolvePostLoginPath(result.user)
        navigate(from, { replace: true })
      } catch {
        // authError from Redux state shows the Alert
      } finally {
        setSubmitting(false)
      }
    })
  }

  // Visual enablement: effective React/DOM values + local submitting.
  // Redux auth.loading must not grey-out the initial button (Button.loading also disables).
  const canSubmit = isSignInEnabled(email, password, submitting, nativeFilled)

  const isDark = theme.palette.mode === 'dark'
  const eyeColor = alpha(theme.palette.text.primary, isDark ? 0.55 : 0.45)

  function handleFormAutofillSync(e: FormEvent<HTMLFormElement> | AnimationEvent<HTMLFormElement>) {
    if ('animationName' in e && !isAutofillAnimation(e.animationName)) return
    syncCredentialsFromDom(e.currentTarget)
  }

  return (
    <AuthSplitLayout>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '1.375rem', sm: '1.5rem' },
            lineHeight: 1.25,
            letterSpacing: -0.25,
            mb: 1,
          }}
        >
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14, lineHeight: 1.5 }}>
          Sign in to your account to continue
        </Typography>
      </Box>

      {authError && (
        <Alert severity="error" sx={{ mb: 3, fontSize: 12 }}>
          Invalid email or password. Please try again.
        </Alert>
      )}

      <Box
        component="form"
        ref={setFormNode}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const creds = readLoginCredentialsFromDom(e.currentTarget)
          const nextEmail = creds.email || email
          const nextPassword = creds.password || password
          setEmail(nextEmail)
          setPassword(nextPassword)
          void handleLogin({ email: nextEmail, password: nextPassword })
        }}
        onInputCapture={handleFormAutofillSync}
        onFocusCapture={handleFormAutofillSync}
        onAnimationStartCapture={handleFormAutofillSync}
      >
        <Stack spacing={2.5}>
          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            size="sm"
            fullWidth
            placeholder="you@company.com"
            value={email || undefined}
            onChange={val => {
              setEmail(val)
              setNativeFilled(prev => ({ ...prev, email: Boolean(val.trim()) }))
            }}
            onBlur={() => setEmailError(validateEmail(email))}
            error={!!emailError}
            helperText={emailError}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            size="sm"
            fullWidth
            placeholder="Enter your password"
            value={password || undefined}
            onChange={val => {
              setPassword(val)
              setNativeFilled(prev => ({ ...prev, password: Boolean(val) }))
            }}
            onBlur={() => setPasswordError(validatePassword(password))}
            error={!!passwordError}
            helperText={passwordError}
            endAdornment={
              <IconButton
                size="sm"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                sx={{ color: eyeColor }}
                icon={
                  showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />
                }
              />
            }
          />

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              pt: 0.5,
            }}
          >
            <Checkbox
              label="Remember me"
              size="sm"
              checked={rememberMe}
              onChange={setRememberMe}
            />
            <Typography
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              sx={{
                color: 'primary.main',
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Forgot Password?
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            type="submit"
            loading={submitting}
            disabled={!canSubmit}
            sx={{ height: 40, fontSize: 14, fontWeight: 600, mt: 0.5 }}
          >
            Sign In
          </Button>
        </Stack>
      </Box>
    </AuthSplitLayout>
  )
}

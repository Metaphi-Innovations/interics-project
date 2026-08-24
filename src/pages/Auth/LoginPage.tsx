import { useState, useEffect } from 'react'
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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (localStorage.getItem(REMEMBER_EMAIL_KEY) === '1') {
      setRememberMe(true)
      const saved = localStorage.getItem(SAVED_EMAIL_KEY)
      if (saved) setEmail(saved)
    }
  }, [])

  useEffect(() => {
    if (user && token) {
      navigate(resolvePostLoginPath(user), { replace: true })
    }
  }, [user, token, navigate])

  async function handleLogin() {
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailError(eErr)
    setPasswordError(pErr)
    if (eErr || pErr) return

    try {
      const result = await dispatch(loginThunk({ email, password })).unwrap()
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, '1')
        localStorage.setItem(SAVED_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
        localStorage.removeItem(SAVED_EMAIL_KEY)
      }
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || resolvePostLoginPath(result.user)
      navigate(from, { replace: true })
    } catch {
      // authError from Redux state shows the Alert
    }
  }

  const isDark = theme.palette.mode === 'dark'
  const eyeColor = alpha(theme.palette.text.primary, isDark ? 0.55 : 0.45)

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

      <Stack spacing={2.5}>
        <Input
          label="Email address"
          type="email"
          size="sm"
          fullWidth
          placeholder="you@company.com"
          value={email}
          onChange={val => setEmail(val)}
          onBlur={() => setEmailError(validateEmail(email))}
          error={!!emailError}
          helperText={emailError}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          size="sm"
          fullWidth
          placeholder="Enter your password"
          value={password}
          onChange={val => setPassword(val)}
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
          loading={loading}
          disabled={loading || !email || !password}
          onClick={handleLogin}
          sx={{ height: 40, fontSize: 14, fontWeight: 600, mt: 0.5 }}
        >
          Sign In
        </Button>
      </Stack>
    </AuthSplitLayout>
  )
}

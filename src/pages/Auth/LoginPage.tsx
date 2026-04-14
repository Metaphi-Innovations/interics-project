import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Alert, Divider } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Eye, EyeOff } from 'lucide-react'
import { Input, Button, IconButton, Checkbox } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginThunk } from '@/slices/auth/thunk'
import { APP_VERSION } from '@/config/version'
import AuthSplitLayout from '@/pages/Auth/components/AuthSplitLayout'
import {
  AUTH_PRODUCT_NAME,
  AUTH_SUPPORT_MAILTO,
  REMEMBER_EMAIL_KEY,
  SAVED_EMAIL_KEY,
} from '@/pages/Auth/authConstants'

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
      navigate('/dashboard', { replace: true })
    }
  }, [user, token, navigate])

  async function handleLogin() {
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailError(eErr)
    setPasswordError(pErr)
    if (eErr || pErr) return

    try {
      await dispatch(loginThunk({ email, password })).unwrap()
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, '1')
        localStorage.setItem(SAVED_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
        localStorage.removeItem(SAVED_EMAIL_KEY)
      }
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch {
      // authError from Redux state shows the Alert
    }
  }

  const isDark = theme.palette.mode === 'dark'
  const eyeColor = alpha(theme.palette.text.primary, isDark ? 0.55 : 0.45)

  return (
    <AuthSplitLayout>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Welcome back
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sign in to your account to continue
      </Typography>

      {authError && (
        <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
          Invalid email or password. Please try again.
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
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
      </Box>

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
          mt: 1.5,
          mb: 2.5,
        }}
      >
        <Checkbox
          label="Remember me"
          size="sm"
          checked={rememberMe}
          onChange={setRememberMe}
        />
        <Typography
          component="a"
          href={AUTH_SUPPORT_MAILTO}
          variant="body2"
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Need help?
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        loading={loading}
        disabled={loading || !email || !password}
        onClick={handleLogin}
        sx={{ height: 40, fontSize: 14, fontWeight: 600 }}
      >
        Sign In
      </Button>

      <Divider sx={{ my: 3 }} />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', lineHeight: 1.6 }}>
        <Box
          component="span"
          onClick={() => navigate('/forgot-password')}
          sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600 }}
        >
          Forgot password
        </Box>
        {' · '}
        Contact IT support for account issues · v{APP_VERSION}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
        {AUTH_PRODUCT_NAME} Project Accounts · Interics Design Consultants
      </Typography>
    </AuthSplitLayout>
  )
}

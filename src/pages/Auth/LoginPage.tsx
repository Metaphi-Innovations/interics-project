import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Alert, CircularProgress } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Input, Button, IconButton } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginThunk } from '@/slices/auth/thunk'

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

const FEATURES = [
  'Real-time project profitability tracking',
  'GST & TDS compliance built-in',
  'Complete milestone-to-invoice workflow',
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const { loading, error: authError, user, token } = useAppSelector(s => s.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

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
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch {
      // authError from Redux state shows the Alert
    }
  }

  const isDark = theme.palette.mode === 'dark'

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── LEFT PANEL (lg+) ── */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '45%',
          flexShrink: 0,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.main',
          p: 6,
          height: '100vh',
        }}
      >
        {/* Logo mark */}
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: alpha('#ffffff', 0.15),
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'white' }}>
            IDS
          </Typography>
        </Box>

        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: 'white', textAlign: 'center', mt: 4 }}
        >
          Project Accounts Tracking
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: alpha('#ffffff', 0.75), textAlign: 'center', mt: 1 }}
        >
          Manage your project finances with clarity
        </Typography>

        {/* Feature list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 6 }}>
          {FEATURES.map(feature => (
            <Box key={feature} sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, alignItems: 'center' }}>
              <CheckCircle size={16} color="white" />
              <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.85) }}>
                {feature}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── RIGHT PANEL ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 4,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Logo mark */}
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'white' }}>
              IDS
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to your account to continue
          </Typography>

          {/* Error alert */}
          {authError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
              Invalid email or password. Please try again.
            </Alert>
          )}

          {/* Email */}
          <Box sx={{ mb: 2 }}>
            <Input
              label="Email address"
              type="email"
              size="sm"
              fullWidth
              value={email}
              onChange={val => setEmail(val)}
              onBlur={() => setEmailError(validateEmail(email))}
              error={!!emailError}
              helperText={emailError}
            />
          </Box>

          {/* Password */}
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            size="sm"
            fullWidth
            value={password}
            onChange={val => setPassword(val)}
            onBlur={() => setPasswordError(validatePassword(password))}
            error={!!passwordError}
            helperText={passwordError}
            endAdornment={
              <IconButton
                size="sm"
                onClick={() => setShowPassword(v => !v)}
                sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
                icon={
                  showPassword
                    ? <EyeOff size={16} strokeWidth={1.75} />
                    : <Eye size={16} strokeWidth={1.75} />
                }
              />
            }
          />

          {/* Forgot password */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, mb: 2.5 }}>
            <Typography
              variant="body2"
              sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </Typography>
          </Box>

          {/* Submit */}
          <Button
            variant="primary"
            fullWidth
            disabled={loading || !email || !password}
            onClick={handleLogin}
            sx={{ height: 40, fontSize: 14, fontWeight: 600 }}
          >
            {loading
              ? <CircularProgress size={18} color="inherit" />
              : 'Sign In'
            }
          </Button>

          {/* Bottom text */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 3, textAlign: 'center' }}
          >
            IDS Project Accounts · Interics Design Consultants
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

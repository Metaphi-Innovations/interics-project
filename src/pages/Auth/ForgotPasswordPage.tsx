import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Alert, Divider } from '@mui/material'
import { ArrowLeft } from 'lucide-react'
import { Input, Button } from '@/design-system/components'
import { APP_VERSION } from '@/config/version'
import AuthSplitLayout from '@/pages/Auth/components/AuthSplitLayout'
import { AUTH_PRODUCT_NAME } from '@/pages/Auth/authConstants'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit() {
    if (!email) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  return (
    <AuthSplitLayout>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          mb: 3,
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        }}
        onClick={() => navigate('/login')}
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        <Typography variant="body2">Back to login</Typography>
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Reset your password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your email and we&apos;ll send you a reset link
      </Typography>

      {!submitted ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Input
              label="Email address"
              type="email"
              size="sm"
              fullWidth
              placeholder="you@company.com"
              value={email}
              onChange={val => setEmail(val)}
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            loading={loading}
            disabled={loading || !email}
            onClick={handleSubmit}
            sx={{ height: 40, fontSize: 14, fontWeight: 600 }}
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </>
      ) : (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            If an account exists for this email, you&apos;ll receive a reset link shortly.
          </Alert>
          <Button variant="outlined" color="primary" fullWidth onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', lineHeight: 1.6 }}>
        Contact IT support for account issues · v{APP_VERSION}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
        {AUTH_PRODUCT_NAME} Project Accounts · Interics Design Consultants
      </Typography>
    </AuthSplitLayout>
  )
}

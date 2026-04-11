import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Alert } from '@mui/material'
import { ArrowLeft } from 'lucide-react'
import { Input, Button } from '@/design-system/components'

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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 4,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400, p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
        {/* Back link */}
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
          Enter your email and we'll send you a reset link
        </Typography>

        {!submitted ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Input
                label="Email address"
                type="email"
                size="sm"
                fullWidth
                value={email}
                onChange={val => setEmail(val)}
              />
            </Box>
            <Button
              variant="primary"
              fullWidth
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
              If an account exists for this email, you'll receive a reset link shortly.
            </Alert>
            <Button variant="secondary" fullWidth onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </>
        )}
      </Box>
    </Box>
  )
}

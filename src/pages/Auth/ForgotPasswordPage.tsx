import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Input } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: tokens.color.neutral[50],
      }}
    >
      <Box
        sx={{
          width: 360,
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 5,
          boxShadow: tokens.shadow.md,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Reset password
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.neutral[500], mb: 4 }}>
          Enter your email to receive reset instructions.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Input label="Email" type="email" placeholder="you@company.com" />
          <Button variant="primary" fullWidth>
            Send reset link
          </Button>
          <Button
            variant="neutral"
            size="sm"
            startIcon={<ArrowLeft size={14} strokeWidth={1.75} />}
            onClick={() => navigate('/login')}
          >
            Back to sign in
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

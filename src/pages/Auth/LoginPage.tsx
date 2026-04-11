import { Box, Typography } from '@mui/material'
import { Button, Input } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'

export default function LoginPage() {
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
          Sign in
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.neutral[500], mb: 4 }}>
          IDC Project Accounts
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Input label="Email" type="email" placeholder="you@company.com" />
          <Input label="Password" type="password" placeholder="••••••••" />
          <Button variant="primary" fullWidth>
            Sign in
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

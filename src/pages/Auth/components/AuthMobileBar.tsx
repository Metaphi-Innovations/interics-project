import { Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { AUTH_LOGO_IS_FULL_LOCKUP, AUTH_LOGO_SRC, AUTH_PRODUCT_NAME } from '@/pages/Auth/authConstants'

const LOGO_ALT = `${AUTH_PRODUCT_NAME} logo`

export default function AuthMobileBar() {
  const theme = useTheme()
  const white = theme.palette.common.white

  return (
    <Box
      sx={{
        position: 'relative',
        display: { xs: 'flex', lg: 'none' },
        alignItems: 'center',
        gap: 1.5,
        flexShrink: 0,
        overflow: 'hidden',
        px: 2,
        py: 1.5,
        background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.1,
          backgroundImage: `repeating-linear-gradient(-18deg, transparent, transparent 24px, ${alpha(white, 0.08)} 24px, ${alpha(white, 0.08)} 25px)`,
          pointerEvents: 'none',
        }}
      />
      <Box
        component="img"
        src={AUTH_LOGO_SRC}
        alt={LOGO_ALT}
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'block',
          height: AUTH_LOGO_IS_FULL_LOCKUP ? 'auto' : 36,
          maxHeight: 36,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)',
        }}
      />
      {!AUTH_LOGO_IS_FULL_LOCKUP && (
        <Typography
          variant="subtitle2"
          sx={{ position: 'relative', zIndex: 1, fontWeight: 700, color: white, letterSpacing: 0.4 }}
        >
          {AUTH_PRODUCT_NAME}
        </Typography>
      )}
    </Box>
  )
}

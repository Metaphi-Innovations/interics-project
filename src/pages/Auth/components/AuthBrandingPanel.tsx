import { Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { tokens } from '@/design-system/tokens'
import {
  AUTH_HEADLINE,
  AUTH_LOGO_IS_FULL_LOCKUP,
  AUTH_LOGO_SRC,
  AUTH_PRODUCT_NAME,
  AUTH_TAGLINE_PILLARS,
} from '@/pages/Auth/authConstants'

export default function AuthBrandingPanel() {
  const theme = useTheme()
  const white = theme.palette.common.white

  return (
    <Box
      sx={{
        display: { xs: 'none', lg: 'flex' },
        position: 'relative',
        width: { lg: '42%' },
        flexShrink: 0,
        minHeight: { lg: '100vh' },
        flexDirection: 'column',
        overflow: 'hidden',
        background: `linear-gradient(165deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 45%, ${alpha(theme.palette.primary.dark, 0.95)} 100%)`,
      }}
    >
      {/* Subtle geometric overlay */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% 30%, ${alpha(white, 0.45)} 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 70%, ${alpha(white, 0.2)} 0%, transparent 45%),
            repeating-linear-gradient(
              -18deg,
              transparent,
              transparent 40px,
              ${alpha(white, 0.04)} 40px,
              ${alpha(white, 0.04)} 41px
            )
          `,
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          p: { lg: 6 },
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            alignSelf: 'flex-start',
            maxWidth: '100%',
          }}
        >
          <Box
            component="img"
            src={AUTH_LOGO_SRC}
            alt={`${AUTH_PRODUCT_NAME} logo`}
            sx={{
              display: 'block',
              height: AUTH_LOGO_IS_FULL_LOCKUP ? 'auto' : 44,
              maxHeight: 44,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
            }}
          />
          {!AUTH_LOGO_IS_FULL_LOCKUP && (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: 0.5,
                color: white,
                fontSize: { lg: '1rem' },
              }}
            >
              {AUTH_PRODUCT_NAME}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: white,
              lineHeight: 1.2,
              fontSize: { lg: '1.75rem' },
            }}
          >
            {AUTH_HEADLINE}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: alpha(white, 0.82), fontSize: tokens.fontSize.lg }}>
            {`· ${AUTH_TAGLINE_PILLARS.join(' · ')} ·`}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

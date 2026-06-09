import { Box, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { tokens } from '@/design-system/tokens'
import authBrandingOffice from '@/assets/auth-branding-office.png'
import {
  AUTH_FEATURE_HIGHLIGHTS,
  AUTH_HEADLINE,
  AUTH_LOGO_IS_FULL_LOCKUP,
  AUTH_LOGO_SRC,
  AUTH_PRODUCT_NAME,
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
        bgcolor: theme.palette.primary.dark,
      }}
    >
      <Box
        component="img"
        src={authBrandingOffice}
        alt=""
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.45,
          pointerEvents: 'none',
        }}
      />

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(165deg, ${alpha(theme.palette.primary.dark, 0.48)} 0%, ${alpha(theme.palette.primary.main, 0.38)} 48%, ${alpha(theme.palette.primary.dark, 0.52)} 100%)`,
        }}
      />

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(${alpha(white, 0.07)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha(white, 0.07)} 1px, transparent 1px),
            radial-gradient(ellipse 70% 45% at 15% 20%, ${alpha(white, 0.14)} 0%, transparent 55%),
            radial-gradient(ellipse 50% 35% at 85% 80%, ${alpha(white, 0.08)} 0%, transparent 50%)
          `,
          backgroundSize: '40px 40px, 40px 40px, auto, auto',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          p: { lg: 6, xl: 7 },
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

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 400,
            py: { lg: 4, xl: 6 },
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: white,
              lineHeight: 1.25,
              fontSize: { lg: '1.875rem', xl: '2rem' },
              letterSpacing: -0.25,
            }}
          >
            {AUTH_HEADLINE}
          </Typography>

          <Box
            sx={{
              mt: 3,
              mb: 1,
              width: 40,
              height: 3,
              borderRadius: tokens.borderRadius.full,
              bgcolor: alpha(white, 0.35),
            }}
          />

          <Stack
            component="ul"
            spacing={2}
            sx={{ mt: 3, p: 0, m: 0, listStyle: 'none' }}
          >
            {AUTH_FEATURE_HIGHLIGHTS.map((feature) => (
              <Box
                key={feature}
                component="li"
                sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: tokens.borderRadius.full,
                    bgcolor: alpha(white, 0.85),
                    mt: 0.875,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha(white, 0.92),
                    fontSize: tokens.fontSize.base,
                    lineHeight: tokens.lineHeight.relaxed,
                    fontWeight: 500,
                  }}
                >
                  {feature}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}

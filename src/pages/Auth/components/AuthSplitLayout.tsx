import type { ReactNode } from 'react'
import { Box } from '@mui/material'
import { Moon, Sun } from 'lucide-react'
import { IconButton } from '@/design-system/components'
import { useFoundationTheme } from '@/design-system/ThemeContext'
import { tokens } from '@/design-system/tokens'
import AuthBrandingPanel from '@/pages/Auth/components/AuthBrandingPanel'
import AuthMobileBar from '@/pages/Auth/components/AuthMobileBar'

export default function AuthSplitLayout({ children }: { children: ReactNode }) {
  const { toggleMode, isDark } = useFoundationTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      <AuthMobileBar />
      <AuthBrandingPanel />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: 0,
          minWidth: 0,
          bgcolor: (t) =>
            t.palette.mode === 'light' ? tokens.color.neutral[50] : t.palette.background.default,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 2,
            p: 2,
          }}
        >
          <IconButton
            size="sm"
            onClick={() => {
              toggleMode()
            }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: (t) => (t.palette.mode === 'light' ? t.palette.action.hover : t.palette.action.selected) },
            }}
            icon={isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 3, lg: 4 },
            pt: { xs: 6, sm: 7 },
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 440,
              bgcolor: 'background.paper',
              borderRadius: tokens.borderRadius.xl,
              boxShadow: tokens.shadow.md,
              border: (t) =>
                `1px solid ${t.palette.mode === 'light' ? tokens.color.neutral[100] : t.palette.divider}`,
              p: { xs: 3, sm: 4 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

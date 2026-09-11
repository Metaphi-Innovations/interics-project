import { useCallback, useState, type ReactNode } from 'react'
import {
  CircularProgress,
  IconButton as MuiIconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { Eye, EyeOff } from 'lucide-react'
import { usersApi } from '@/api/usersApi'
import { FormField } from '@/components/templates'
import { useToast } from '@/design-system/components'

const MASK = '********'

type CurrentPasswordRevealProps = {
  userId: string
  canView: boolean
}

/**
 * Masked current-password display. Fetches plaintext only via GET /users/:id/password
 * on explicit eye click. Does not store password in Redux or browser storage.
 */
export function CurrentPasswordReveal({ userId, canView }: CurrentPasswordRevealProps) {
  const theme = useTheme()
  const { showToast } = useToast()
  const eyeColor = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.55 : 0.45)

  const [revealed, setRevealed] = useState(false)
  const [password, setPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const hide = useCallback(() => {
    setRevealed(false)
    setPassword(null)
  }, [])

  const toggle = useCallback(async () => {
    if (!canView) {
      showToast({ title: 'You do not have permission to view passwords', variant: 'error' })
      return
    }
    if (revealed) {
      hide()
      return
    }
    setLoading(true)
    try {
      const data = await usersApi.getPassword(userId)
      const value = data?.password
      if (!value) {
        showToast({ title: 'Password is not available for viewing', variant: 'error' })
        return
      }
      setPassword(value)
      setRevealed(true)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to view password'
      showToast({ title: String(message), variant: 'error' })
      hide()
    } finally {
      setLoading(false)
    }
  }, [canView, hide, revealed, showToast, userId])

  return (
    <FormField
      label="Current Password"
      hint="Hidden by default. Click the eye to view (requires edit permission)."
    >
      <TextField
        size="small"
        fullWidth
        type="text"
        value={revealed && password ? password : MASK}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={16} sx={{ mr: 1 }} />
              ) : (
                <MuiIconButton
                  size="small"
                  onClick={() => {
                    void toggle()
                  }}
                  aria-label={revealed ? 'Hide current password' : 'View current password'}
                  edge="end"
                  disabled={!canView || loading}
                  sx={{ color: eyeColor }}
                >
                  {revealed ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </MuiIconButton>
              )}
            </InputAdornment>
          ),
        }}
        inputProps={{
          style: { fontSize: 13, fontFamily: revealed && password ? 'inherit' : 'monospace' },
          autoComplete: 'off',
        }}
      />
      {!canView ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Password viewing requires User Management edit permission.
        </Typography>
      ) : null}
    </FormField>
  )
}

/** Local-only eye toggle for newly typed passwords (never fetches server credentials). */
export function NewPasswordField(props: {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  touched?: boolean
  required?: boolean
  label?: string
  hint?: string
  placeholder?: string
}) {
  const theme = useTheme()
  const eyeColor = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.55 : 0.45)
  const [show, setShow] = useState(false)

  return (
    <FormField
      label={props.label ?? 'New Password'}
      required={props.required}
      error={props.touched ? props.error : undefined}
      hint={props.hint}
    >
      <TextField
        size="small"
        fullWidth
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        error={Boolean(props.touched && props.error)}
        inputProps={{ style: { fontSize: 13 } }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <MuiIconButton
                size="small"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                edge="end"
                sx={{ color: eyeColor }}
              >
                {show ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
              </MuiIconButton>
            </InputAdornment>
          ),
        }}
      />
    </FormField>
  )
}

export function PasswordRevealStack({ children }: { children: ReactNode }) {
  return <Stack gap={1.5}>{children}</Stack>
}

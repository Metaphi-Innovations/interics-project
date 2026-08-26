import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'

export interface InputProps {
  label?: string
  placeholder?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: boolean
  helperText?: string
  disabled?: boolean
  required?: boolean
  readonly?: boolean
  size?: 'sm' | 'md'
  type?: string
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  fullWidth?: boolean
  maxLength?: number
  showCount?: boolean
  autoFocus?: boolean
  name?: string
  autoComplete?: string
  sx?: SxProps<Theme>
}

export default function Input({
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  error = false,
  helperText,
  disabled = false,
  required = false,
  readonly = false,
  size = 'md',
  type = 'text',
  startAdornment,
  endAdornment,
  fullWidth = false,
  maxLength,
  showCount = false,
  autoFocus = false,
  name,
  autoComplete,
  sx,
}: InputProps) {
  const inputHeight = size === 'sm' ? '36px' : '42px'
  const charCount = value?.length ?? 0

  const helperContent =
    showCount && maxLength ? (
      <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{helperText ?? ''}</span>
        <Typography component="span" variant="caption" color={charCount > maxLength ? 'error' : 'text.secondary'}>
          {charCount}/{maxLength}
        </Typography>
      </Box>
    ) : (
      helperText
    )

  const valueProps =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {}

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      {...valueProps}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      onBlur={onBlur}
      error={error || (showCount && maxLength ? charCount > maxLength : false)}
      helperText={helperContent}
      disabled={disabled}
      required={required}
      type={type}
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      name={name}
      autoComplete={autoComplete}
      variant="outlined"
      size="small"
      slotProps={{
        input: {
          readOnly: readonly,
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
        },
        htmlInput: {
          name,
          maxLength,
          'aria-label': label,
          autoComplete,
        },
      }}
      sx={[
        { '& .MuiInputBase-root': { height: inputHeight } },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  )
}

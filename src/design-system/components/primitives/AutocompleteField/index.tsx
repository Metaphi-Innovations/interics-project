import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import type { SxProps, Theme } from '@mui/material/styles'

export interface AutocompleteFieldProps<T> {
  options: readonly T[]
  value: T | null
  onChange: (value: T | null) => void
  getOptionLabel: (option: T) => string
  isOptionEqualToValue?: (option: T, value: T) => boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  size?: 'sm' | 'md'
  fullWidth?: boolean
  sx?: SxProps<Theme>
}

const HEIGHT: Record<'sm' | 'md', string> = {
  sm: '36px',
  md: '42px',
}

export default function AutocompleteField<T>({
  options,
  value,
  onChange,
  getOptionLabel,
  isOptionEqualToValue,
  placeholder,
  disabled = false,
  error = false,
  size = 'sm',
  fullWidth = true,
  sx,
}: AutocompleteFieldProps<T>) {
  const h = HEIGHT[size]

  return (
    <Autocomplete<T>
      options={[...options]}
      value={value}
      onChange={(_, v) => onChange(v)}
      disabled={disabled}
      getOptionLabel={(o) => (o == null ? '' : getOptionLabel(o))}
      isOptionEqualToValue={isOptionEqualToValue ?? ((a, b) => a === b)}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder={placeholder}
          error={error}
          sx={{
            '& .MuiInputBase-root': { minHeight: h },
          }}
        />
      )}
      sx={[{ width: fullWidth ? '100%' : 'auto' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  )
}

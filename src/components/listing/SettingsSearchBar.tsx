import { Box, Button, TextField } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

export function SettingsSearchBar({
  placeholder,
  value,
  onChange,
  onReset,
  sx,
}: {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onReset: () => void
  sx?: SxProps<Theme>
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, ...sx }}>
      <TextField
        size="small"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: 280 }}
      />
      <Button size="small" variant="outlined" color="secondary" onClick={onReset} sx={{ height: 40 }}>
        Reset
      </Button>
    </Box>
  )
}

import { Switch } from '@mui/material'

export function StatusColumnToggle({
  active,
  disabled,
  onToggle,
}: {
  active: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <Switch
      checked={active}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={() => onToggle()}
      inputProps={{ 'aria-label': active ? 'Active' : 'Inactive' }}
      sx={{
        width: 52,
        height: 28,
        p: 0,
        '& .MuiSwitch-switchBase': {
          p: '2px',
          '&.Mui-checked': {
            transform: 'translateX(24px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
              backgroundColor: '#16A34A',
              opacity: 1,
              '&::before': { content: '"ON"', color: '#fff' },
              '&::after': { content: '""' },
            },
          },
        },
        '& .MuiSwitch-thumb': {
          width: 24,
          height: 24,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.25)',
        },
        '& .MuiSwitch-track': {
          borderRadius: 14,
          backgroundColor: '#DC2626',
          opacity: 1,
          '&::before, &::after': {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.04em',
            lineHeight: 1,
          },
          '&::before': { content: '""', left: 7 },
          '&::after': { content: '"OFF"', right: 6, color: '#fff' },
        },
      }}
    />
  )
}

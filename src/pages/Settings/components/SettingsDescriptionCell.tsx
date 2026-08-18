import TableCell from '@mui/material/TableCell'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import Tooltip from '@/design-system/components/primitives/Tooltip'
import { SETTINGS_TABLE_DESCRIPTION_CELL_SX } from './settingsTableStyles'

interface SettingsDescriptionCellProps {
  value?: string | null
  sx?: SxProps<Theme>
  textSx?: SxProps<Theme>
}

export default function SettingsDescriptionCell({ value, sx, textSx }: SettingsDescriptionCellProps) {
  const text = value?.trim() || '—'
  const showTooltip = text !== '—'

  const label = (
    <Typography
      component="span"
      variant="body2"
      noWrap
      sx={{
        display: 'block',
        fontSize: 12,
        minWidth: 0,
        ...textSx,
      }}
    >
      {text}
    </Typography>
  )

  return (
    <TableCell sx={{ ...SETTINGS_TABLE_DESCRIPTION_CELL_SX, ...sx }}>
      {showTooltip ? (
        <Tooltip content={text} placement="top-start" maxWidth={360}>
          {label}
        </Tooltip>
      ) : (
        label
      )}
    </TableCell>
  )
}

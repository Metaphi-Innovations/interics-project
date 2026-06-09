import { Stack, Typography, Chip as MuiChip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getSpecializationTagSx } from '@/utils/specializationTagStyles'

interface ProjectTypeTagsProps {
  types: string[]
  /** Max tags before "+N" (omit to show all). */
  maxVisible?: number
}

/** Project type chips for tables/cards — aligned with vendor specialization tags. */
export function ProjectTypeTags({ types, maxVisible }: ProjectTypeTagsProps) {
  const theme = useTheme()
  const tagMode = theme.palette.mode === 'dark' ? 'dark' : 'light'

  if (types.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
        —
      </Typography>
    )
  }

  const visible = maxVisible != null ? types.slice(0, maxVisible) : types
  const overflow = maxVisible != null ? types.length - maxVisible : 0

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap alignItems="center">
      {visible.map((tag) => {
        const c = getSpecializationTagSx(tag, tagMode)
        return (
          <MuiChip
            key={tag}
            label={tag}
            size="small"
            sx={{
              height: 20,
              fontSize: 10,
              bgcolor: c.bg,
              color: c.color,
              border: 'none',
              '& .MuiChip-label': { px: '6px' },
            }}
          />
        )
      })}
      {overflow > 0 ? (
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
          +{overflow}
        </Typography>
      ) : null}
    </Stack>
  )
}

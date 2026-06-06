import { Skeleton } from '@mui/material'

export function ChartLoadingState({ height = 220 }: { height?: number }) {
  return (
    <Skeleton
      variant="rectangular"
      width="100%"
      height={height}
      sx={{ borderRadius: 1, flex: 1 }}
    />
  )
}

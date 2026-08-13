import { Box, Skeleton, Stack } from '@mui/material'

/** Shared loading skeleton for project detail tab content while API data loads. */
export function ProjectTabSkeleton({
  rows = 4,
  showKpis = false,
}: {
  rows?: number
  showKpis?: boolean
}) {
  return (
    <Box sx={{ py: 0.5 }} aria-busy="true" aria-label="Loading">
      {showKpis ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={72}
              sx={{ flex: 1, borderRadius: 2 }}
            />
          ))}
        </Stack>
      ) : null}
      <Skeleton height={22} width={180} sx={{ mb: 1.5 }} />
      <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1.5, mb: 1.5 }} />
      <Stack spacing={1}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={56}
            sx={{ borderRadius: 1.5 }}
          />
        ))}
      </Stack>
    </Box>
  )
}

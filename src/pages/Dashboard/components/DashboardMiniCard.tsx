import { Paper, Typography } from '@mui/material'

interface DashboardMiniCardProps {
  label: string
  value: string
  subtext?: string
  onClick?: () => void
}

export function DashboardMiniCard({ label, value, subtext, onClick }: DashboardMiniCardProps) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick
          ? { borderColor: 'primary.main', boxShadow: 1 }
          : undefined,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600, display: 'block', mb: 0.5 }}
      >
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtext && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
          {subtext}
        </Typography>
      )}
    </Paper>
  )
}

import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'

export interface ComingSoonProps {
  icon: ReactNode
  moduleName: string
}

export default function ComingSoonPage({ icon, moduleName }: ComingSoonProps) {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.color.primary[400],
            mb: 2,
            '& > *': { width: 40, height: 40 },
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="overline"
          sx={{ color: tokens.color.neutral[400], letterSpacing: '1px' }}
        >
          Coming Soon
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, color: tokens.color.neutral[700], mt: '8px' }}
        >
          {moduleName}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: tokens.color.neutral[400], mt: '4px' }}
        >
          This module is under development and will be available soon.
        </Typography>
        <Box sx={{ mt: '24px' }}>
          <Button
            variant="secondary"
            size="sm"
            startIcon={<ArrowLeft size={14} strokeWidth={1.75} />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

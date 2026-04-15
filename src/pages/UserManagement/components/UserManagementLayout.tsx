import type { ReactNode } from 'react'
import { Box } from '@mui/material'

interface UserManagementLayoutProps {
  children: ReactNode
  endAdornment?: ReactNode
}

/** Page shell — sub-navigation lives in the app sidebar. */
export function UserManagementLayout({ children }: UserManagementLayoutProps) {
  return <Box sx={{ p: { xs: 2, md: 3, lg: 4 } }}>{children}</Box>
}

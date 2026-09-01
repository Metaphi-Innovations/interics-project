/**
 * Dashboard page shell. Tab internals live in their own tab folders.
 */
import { useState } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { Tabs } from '@/design-system/components'
import { RevenueTab } from './Revenue/Revenue'
import { ProjectsTab } from './Projects/Projects'
import { TeamTab } from './Teams/Teams'
import { VendorsTab } from './Vendors/Vendors'
import {
  getCurrentFinancialYearRange,
  type DashboardDateRange,
} from './dashboardDateRange'

type DashboardTab = 'revenue' | 'projects' | 'team' | 'vendors'
type DashboardDateRanges = Record<DashboardTab, DashboardDateRange>

const DASHBOARD_TABS = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Projects', value: 'projects' },
  { label: 'Team', value: 'team' },
  { label: 'Vendors', value: 'vendors' },
] as const

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('revenue')
  const [dateRanges, setDateRanges] = useState<DashboardDateRanges>(() => ({
    revenue: getCurrentFinancialYearRange(),
    projects: getCurrentFinancialYearRange(),
    team: getCurrentFinancialYearRange(),
    vendors: getCurrentFinancialYearRange(),
  }))

  const setTabDateRange = (tab: DashboardTab, range: DashboardDateRange) => {
    setDateRanges((prev) => ({ ...prev, [tab]: range }))
  }

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Revenue overview across purchase orders, collections, and vendor payments.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Tabs
          items={[...DASHBOARD_TABS]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as DashboardTab)}
          variant="underline"
          scrollable
          size="sm"
          sx={{ px: 2, width: '100%' }}
        />

        <Box sx={{ p: 2 }}>
          {activeTab === 'revenue' && (
            <RevenueTab
              dateRange={dateRanges.revenue}
              onDateRangeChange={(range) => setTabDateRange('revenue', range)}
            />
          )}
          {activeTab === 'projects' && (
            <ProjectsTab
              dateRange={dateRanges.projects}
              onDateRangeChange={(range) => setTabDateRange('projects', range)}
            />
          )}
          {activeTab === 'team' && (
            <TeamTab
              dateRange={dateRanges.team}
              onDateRangeChange={(range) => setTabDateRange('team', range)}
            />
          )}
          {activeTab === 'vendors' && (
            <VendorsTab
              dateRange={dateRanges.vendors}
              onDateRangeChange={(range) => setTabDateRange('vendors', range)}
            />
          )}
        </Box>
      </Paper>
    </Box>
  )
}

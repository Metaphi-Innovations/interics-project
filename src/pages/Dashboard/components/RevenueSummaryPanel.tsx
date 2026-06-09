import { Box, Paper } from '@mui/material'
import type { ChartScopeData } from '../chartScopeUtils'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { revenueThisCalendarYear, sumInvoiceRevenue } from '../dashboardMetrics'
import { DashboardMiniCard } from './DashboardMiniCard'
import { ChartLoadingState } from './ChartLoadingState'
import { PANEL_SX } from './chartLayout'

const CLIENT_PROJECT_TYPE_COUNT = 5

interface RevenueSummaryPanelProps {
  chartHeight: number
  loading?: boolean
  scope: ChartScopeData
  chartData: ChartDataSource
  ru: (n: number) => string
  onNavigate: (path: string) => void
}

export function RevenueSummaryPanel({
  chartHeight,
  loading,
  scope,
  chartData,
  ru,
  onNavigate,
}: RevenueSummaryPanelProps) {
  const totalRevenue = sumInvoiceRevenue(scope.scopedInvoices)
  const projectCount = Math.max(1, scope.filteredProjects.length)
  const uniqueClientCount = new Set(scope.filteredProjects.map((p) => p.customerId)).size

  const cardMinHeight = Math.max(88, Math.floor((chartHeight - 18) / 4))

  const cards = [
    {
      key: 'year',
      label: 'Total Revenue This Year',
      value: ru(revenueThisCalendarYear(chartData.clientInvoices)),
      onClick: () => onNavigate('/finance/receivables'),
    },
    {
      key: 'project',
      label: 'Revenue Per Project',
      value: ru(totalRevenue / projectCount),
      subtext: `${scope.filteredProjects.length} projects`,
      onClick: () => onNavigate('/projects'),
    },
    {
      key: 'client',
      label: 'Revenue Per Client',
      value: ru(totalRevenue / Math.max(1, uniqueClientCount)),
      onClick: () => onNavigate('/customers'),
    },
    {
      key: 'type',
      label: 'Revenue Per Project Type',
      value: ru(totalRevenue / CLIENT_PROJECT_TYPE_COUNT),
      onClick: () => onNavigate('/reports'),
    },
  ]

  return (
    <Paper elevation={0} sx={{ ...PANEL_SX, minWidth: 0 }}>
      {loading ? (
        <ChartLoadingState height={chartHeight} />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: '1fr' },
            gridTemplateRows: { xs: 'repeat(2, minmax(88px, 1fr))', lg: 'repeat(4, 1fr)' },
            gap: 1.5,
            flex: 1,
            minHeight: chartHeight,
            height: { lg: chartHeight },
            width: '100%',
          }}
        >
          {cards.map((card) => (
            <Box
              key={card.key}
              sx={{
                display: 'flex',
                minHeight: { xs: 88, lg: cardMinHeight },
                minWidth: 0,
              }}
            >
              <DashboardMiniCard
                label={card.label}
                value={card.value}
                subtext={card.subtext}
                onClick={card.onClick}
              />
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

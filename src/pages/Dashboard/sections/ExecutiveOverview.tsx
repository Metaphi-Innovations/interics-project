import { Box } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { formatGrowthTrend } from '../dashboardHelpers'
import type { ExecutiveKpis, DateRange } from '../types'
import { KpiCard } from '../components/KpiCard'
import { DashboardSection } from '../components/DashboardSection'

interface ExecutiveOverviewProps {
  theme: Theme
  kpis: ExecutiveKpis
  dateRange: DateRange
  ru: (n: number) => string
  onNavigate: (path: string) => void
}

export function ExecutiveOverview({
  theme,
  kpis,
  dateRange,
  ru,
  onNavigate,
}: ExecutiveOverviewProps) {
  const marginColor =
    kpis.avgProfitMargin > 20
      ? theme.palette.success.main
      : kpis.avgProfitMargin >= 10
        ? theme.palette.warning.main
        : theme.palette.error.main

  const cards = [
    {
      label: 'TOTAL REVENUE',
      value: ru(kpis.totalRevenue),
      subtext: 'Total billed value',
      trend: formatGrowthTrend(kpis.totalRevenue, kpis.prevTotalRevenue, dateRange),
      onClick: () => onNavigate('/finance/receivables'),
    },
    {
      label: 'TOTAL PROFIT',
      value: ru(kpis.totalProfit),
      subtext: 'Revenue − cost',
      trend: formatGrowthTrend(kpis.totalProfit, kpis.prevTotalProfit, dateRange),
      onClick: () => onNavigate('/reports'),
    },
    {
      label: 'ACTIVE PROJECTS',
      value: String(kpis.activeProjects),
      subtext: 'Live projects in scope',
      trend: formatGrowthTrend(
        kpis.activeProjects,
        kpis.prevActiveProjects,
        dateRange,
        false,
      ),
      onClick: () => onNavigate('/projects'),
    },
    {
      label: 'ACTIVE CLIENTS',
      value: String(kpis.activeClients),
      subtext: 'Clients with live work',
      trend: formatGrowthTrend(kpis.activeClients, kpis.prevActiveClients, dateRange),
      onClick: () => onNavigate('/customers'),
    },
    {
      label: 'AVG DESIGN FEE / SQ FT',
      value: kpis.avgDesignFeePerSqft > 0 ? ru(kpis.avgDesignFeePerSqft) : '—',
      subtext: 'Average fee earned per sqft',
      trend: formatGrowthTrend(
        kpis.avgDesignFeePerSqft,
        kpis.prevAvgDesignFeePerSqft,
        dateRange,
      ),
      onClick: () => onNavigate('/projects'),
    },
    {
      label: 'AVG PROFIT MARGIN',
      value: `${Math.round(kpis.avgProfitMargin)}%`,
      subtext: 'Overall profitability',
      trend: formatGrowthTrend(
        kpis.avgProfitMargin,
        kpis.prevAvgProfitMargin,
        dateRange,
      ),
      valueColor: marginColor,
      onClick: () => onNavigate('/reports'),
    },
    {
      label: 'OUTSTANDING RECEIVABLES',
      value: ru(kpis.outstandingReceivables),
      subtext: 'Pending collections',
      trend: formatGrowthTrend(
        kpis.outstandingReceivables,
        kpis.prevOutstandingReceivables,
        dateRange,
        true,
      ),
      valueColor:
        kpis.outstandingReceivables > 0 ? theme.palette.warning.main : undefined,
      onClick: () => onNavigate('/finance/receivables'),
    },
    {
      label: 'LABOUR CESS',
      value: ru(kpis.labourCess),
      subtext: 'Total from applicable invoices',
      trend: formatGrowthTrend(kpis.labourCess, kpis.prevLabourCess, dateRange),
      onClick: () => onNavigate('/finance/receivables'),
    },
    {
      label: 'REPEAT CLIENT %',
      value: `${Math.round(kpis.repeatClientPct)}%`,
      subtext: 'Repeat customers in scope',
      trend: formatGrowthTrend(kpis.repeatClientPct, kpis.prevRepeatClientPct, dateRange),
      onClick: () => onNavigate('/customers'),
    },
  ]

  return (
    <DashboardSection title="Executive Overview">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {cards.map((c) => (
          <KpiCard
            key={c.label}
            theme={theme}
            label={c.label}
            value={c.value}
            subtext={c.subtext}
            trendVariant={c.trend.variant}
            trendText={c.trend.text}
            valueColor={c.valueColor}
            onClick={c.onClick}
          />
        ))}
      </Box>
    </DashboardSection>
  )
}

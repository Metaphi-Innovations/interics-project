import type { ReactNode } from 'react'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { useChartFilterScope } from '../hooks/useChartFilterScope'
import type { DashboardFilters } from '../types'
import { ChartPanel, type ChartPanelRenderProps } from './ChartPanel'

interface ScopedChartPanelProps {
  title: string
  subtitle?: string
  chartHeight: number
  loading?: boolean
  showStatus?: boolean
  globalFilters: DashboardFilters
  data: ChartDataSource
  children: (props: ChartPanelRenderProps) => ReactNode
  footer?: ReactNode
}

export function ScopedChartPanel({
  title,
  subtitle,
  chartHeight,
  loading,
  showStatus,
  globalFilters,
  data,
  children,
  footer,
}: ScopedChartPanelProps) {
  const { chartFilters, applyFilters, resetFilters, scope, monthBuckets, filterOptions } =
    useChartFilterScope(globalFilters, data)

  return (
    <ChartPanel
      title={title}
      subtitle={subtitle}
      chartHeight={chartHeight}
      loading={loading}
      showStatus={showStatus}
      globalFilters={globalFilters}
      chartFilters={chartFilters}
      onApplyFilters={applyFilters}
      onResetFilters={resetFilters}
      filterOptions={filterOptions}
      footer={footer}
    >
      {children({ scope, monthBuckets, chartHeight })}
    </ChartPanel>
  )
}

export type {
  FinancialOverviewDto,
} from '@/api/liveApi'

export type ServicePerSqftRates = FinancialOverviewDto['commercialRates']
export type FinancialOverviewSummary = FinancialOverviewDto['summary']
export type FinancialOverviewTracking = FinancialOverviewDto['tracking']

import type { FinancialOverviewDto } from '@/api/liveApi'

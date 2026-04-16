import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/store'
import type { PitchVersion } from '@/slices/pitch/reducer'

export function sumVendorCostsOnVersion(version: PitchVersion | null): number {
  if (!version) return 0
  return version.categories.reduce(
    (acc, cat) =>
      acc +
      cat.services.reduce(
        (sum, s) => sum + s.vendorMappings.reduce((vs, vm) => vs + vm.value, 0),
        0,
      ),
    0,
  )
}

export function sumPlannedExpensesOnVersion(version: PitchVersion | null): number {
  if (!version) return 0
  return (version.plannedExpenses ?? []).reduce((s, e) => s + e.amount, 0)
}

export type PitchFinancialMetrics = {
  vendorCosts: number
  plannedExpensesTotal: number
  totalCost: number
  clientPOValue: number
  profitability: number
  marginPercent: number
}

/** Pure financial rollup (Pitch or Transition draft as PitchVersion-shaped). */
export function computePitchFinancialMetrics(version: PitchVersion | null): PitchFinancialMetrics {
  const vendorCosts = sumVendorCostsOnVersion(version)
  const plannedExpensesTotal = sumPlannedExpensesOnVersion(version)
  const totalCost = vendorCosts + plannedExpensesTotal
  const clientPOValue = version?.totalRevenue ?? 0
  const profitability = clientPOValue - totalCost
  const marginPercent = clientPOValue === 0 ? 0 : (profitability / clientPOValue) * 100
  return {
    vendorCosts,
    plannedExpensesTotal,
    totalCost,
    clientPOValue,
    profitability,
    marginPercent,
  }
}

const selectPitchVersionById = (state: RootState, versionId: string | null): PitchVersion | null => {
  if (!versionId) return null
  return state.pitch.versions.find((v) => v.id === versionId) ?? null
}

export const selectPitchFinancials = createSelector(
  [(state: RootState, versionId: string | null) => selectPitchVersionById(state, versionId)],
  (version) => computePitchFinancialMetrics(version),
)

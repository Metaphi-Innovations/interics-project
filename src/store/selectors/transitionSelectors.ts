import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/store'
import type { PitchVersion } from '@/slices/pitch/reducer'
import { transitionDraftToPitchVersion, type TransitionDraft } from '@/utils/transitionDraft'
import { computePitchFinancialMetrics, type PitchFinancialMetrics } from './pitchSelectors'

export function selectTransitionDraft(state: RootState, projectId: string): TransitionDraft | undefined {
  return state.transition.draftByProjectId[projectId]
}

export function selectTransitionSourceVersionId(state: RootState, projectId: string): string | null {
  return state.transition.selectedSourceVersionIdByProjectId[projectId] ?? null
}

/** PitchVersion-shaped view for expense drawer + financial metrics. */
export function selectTransitionAsPitchVersion(state: RootState, projectId: string): PitchVersion | null {
  const draft = selectTransitionDraft(state, projectId)
  if (!draft) return null
  return transitionDraftToPitchVersion(draft)
}

export const selectTransitionFinancials = createSelector(
  [(state: RootState, projectId: string) => selectTransitionAsPitchVersion(state, projectId)],
  (version): PitchFinancialMetrics => computePitchFinancialMetrics(version),
)

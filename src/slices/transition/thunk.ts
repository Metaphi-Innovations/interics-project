import { createAsyncThunk } from '@reduxjs/toolkit'
import type { PitchCategory, PlannedExpense } from '@/slices/pitch/reducer'
import { recalcTransitionDraft, type TransitionDraft } from '@/utils/transitionDraft'

const BASE = '/api/projects'

export type TransitionApiPayload = {
  versionId: string | null
  categories: PitchCategory[]
  plannedExpenses: PlannedExpense[]
  originalServiceValues?: Record<string, number>
  versionNumber?: number
  label?: string
  totalRevenue?: number
  totalCost?: number
  profitability?: number
}

export const fetchTransition = createAsyncThunk<
  TransitionApiPayload,
  string,
  { rejectValue: string }
>('transition/fetchTransition', async (projectId, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/transition`)
  if (!res.ok) return rejectWithValue('Failed to fetch transition')
  return (await res.json()) as TransitionApiPayload
})

export const saveTransition = createAsyncThunk<
  TransitionApiPayload,
  { projectId: string; body: TransitionApiPayload },
  { rejectValue: string }
>('transition/saveTransition', async ({ projectId, body }, { rejectWithValue }) => {
  const res = await fetch(`${BASE}/${projectId}/transition/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return rejectWithValue('Failed to save transition')
  return (await res.json()) as TransitionApiPayload
})

/** Merge API payload into TransitionDraft when versionId is set (needs pitch version for metadata). */
export function apiPayloadToDraft(
  projectId: string,
  payload: TransitionApiPayload,
  pitchMeta: { versionNumber: number; label: string } | null,
): TransitionDraft | null {
  if (!payload.versionId) return null
  const meta = pitchMeta ?? { versionNumber: 0, label: '' }
  const categories = payload.categories ?? []
  const originalFromPayload = payload.originalServiceValues
  const originalServiceValues: Record<string, number> = originalFromPayload
    ? { ...originalFromPayload }
    : {}
  if (!originalFromPayload) {
    for (const cat of categories) {
      for (const svc of cat.services) {
        originalServiceValues[svc.id] = svc.value
      }
    }
  }
  const base = recalcTransitionDraft({
    sourceVersionId: payload.versionId,
    projectId,
    versionNumber: payload.versionNumber ?? meta.versionNumber,
    label: payload.label ?? meta.label,
    categories,
    plannedExpenses: payload.plannedExpenses ?? [],
    originalServiceValues,
    totalRevenue: 0,
    totalCost: 0,
    profitability: 0,
  })
  return base as TransitionDraft
}

export { recalcTransitionDraft }
export type { TransitionDraft }

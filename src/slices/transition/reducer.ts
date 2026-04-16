import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { ClientMilestone, PitchCategory, PlannedExpense } from '@/slices/pitch/reducer'
import type { TransitionDraft } from '@/utils/transitionDraft'
import { recalcTransitionDraft } from '@/utils/transitionDraft'
import { fetchTransition, saveTransition, apiPayloadToDraft } from './thunk'

export type { TransitionDraft }

interface TransitionState {
  draftByProjectId: Record<string, TransitionDraft | undefined>
  /** Pitch version id user selected for alignment (null = none). */
  selectedSourceVersionIdByProjectId: Record<string, string | null>
  loading: boolean
  saving: boolean
  error: string | null
}

const initialState: TransitionState = {
  draftByProjectId: {},
  selectedSourceVersionIdByProjectId: {},
  loading: false,
  saving: false,
  error: null,
}

const transitionSlice = createSlice({
  name: 'transition',
  initialState,
  reducers: {
    clearTransitionForProject(state, action: PayloadAction<string>) {
      const id = action.payload
      delete state.draftByProjectId[id]
      delete state.selectedSourceVersionIdByProjectId[id]
    },
    setSelectedSourceVersionId(
      state,
      action: PayloadAction<{ projectId: string; versionId: string | null }>,
    ) {
      const { projectId, versionId } = action.payload
      state.selectedSourceVersionIdByProjectId[projectId] = versionId
    },
    setDraft(state, action: PayloadAction<{ projectId: string; draft: TransitionDraft }>) {
      const { projectId, draft } = action.payload
      state.draftByProjectId[projectId] = recalcTransitionDraft(draft) as TransitionDraft
    },
    updateDraftCategories(
      state,
      action: PayloadAction<{ projectId: string; categories: PitchCategory[] }>,
    ) {
      const { projectId, categories } = action.payload
      const cur = state.draftByProjectId[projectId]
      if (!cur) return
      state.draftByProjectId[projectId] = recalcTransitionDraft({
        ...cur,
        categories,
      }) as TransitionDraft
    },
    updateDraftPlannedExpenses(
      state,
      action: PayloadAction<{ projectId: string; plannedExpenses: PlannedExpense[] }>,
    ) {
      const { projectId, plannedExpenses } = action.payload
      const cur = state.draftByProjectId[projectId]
      if (!cur) return
      state.draftByProjectId[projectId] = recalcTransitionDraft({
        ...cur,
        plannedExpenses,
      }) as TransitionDraft
    },
    updateDraftServiceValue(
      state,
      action: PayloadAction<{ projectId: string; serviceId: string; value: number }>,
    ) {
      const { projectId, serviceId, value } = action.payload
      const cur = state.draftByProjectId[projectId]
      if (!cur) return
      const categories = cur.categories.map((cat) => ({
        ...cat,
        services: cat.services.map((svc) =>
          svc.id === serviceId ? { ...svc, value } : svc,
        ),
      }))
      state.draftByProjectId[projectId] = recalcTransitionDraft({
        ...cur,
        categories,
      }) as TransitionDraft
    },
    updateDraftClientMilestones(
      state,
      action: PayloadAction<{ projectId: string; serviceId: string; milestones: ClientMilestone[] }>,
    ) {
      const { projectId, serviceId, milestones } = action.payload
      const cur = state.draftByProjectId[projectId]
      if (!cur) return
      const categories = cur.categories.map((cat) => ({
        ...cat,
        services: cat.services.map((svc) =>
          svc.id === serviceId ? { ...svc, clientMilestones: milestones } : svc,
        ),
      }))
      state.draftByProjectId[projectId] = recalcTransitionDraft({
        ...cur,
        categories,
      }) as TransitionDraft
    },
    hydrateDraft(
      state,
      action: PayloadAction<{ projectId: string; draft: TransitionDraft }>,
    ) {
      const { projectId, draft } = action.payload
      state.draftByProjectId[projectId] = recalcTransitionDraft(draft) as TransitionDraft
      state.selectedSourceVersionIdByProjectId[projectId] = draft.sourceVersionId
    },
    resetTransition() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransition.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTransition.fulfilled, (state, action) => {
        state.loading = false
        const projectId = action.meta.arg
        const payload = action.payload
        if (payload.versionId) {
          const draft = apiPayloadToDraft(
            projectId,
            {
              ...payload,
              categories: payload.categories ?? [],
              plannedExpenses: payload.plannedExpenses ?? [],
            },
            {
              versionNumber: payload.versionNumber ?? 0,
              label: payload.label ?? '',
            },
          )
          if (draft) {
            state.draftByProjectId[projectId] = draft
            state.selectedSourceVersionIdByProjectId[projectId] = payload.versionId
          }
        }
      })
      .addCase(fetchTransition.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) ?? 'Failed to load transition'
      })
      .addCase(saveTransition.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(saveTransition.fulfilled, (state, action) => {
        state.saving = false
        const projectId = action.meta.arg.projectId
        const payload = action.payload
        if (payload.versionId) {
          const cur = state.draftByProjectId[projectId]
          const draft = apiPayloadToDraft(
            projectId,
            {
              ...payload,
              categories: payload.categories ?? [],
              plannedExpenses: payload.plannedExpenses ?? [],
            },
            cur ? { versionNumber: cur.versionNumber, label: cur.label } : null,
          )
          if (draft) state.draftByProjectId[projectId] = draft
        }
      })
      .addCase(saveTransition.rejected, (state, action) => {
        state.saving = false
        state.error = (action.payload as string) ?? 'Failed to save transition'
      })
  },
})

export const {
  clearTransitionForProject,
  setSelectedSourceVersionId,
  setDraft,
  updateDraftCategories,
  updateDraftPlannedExpenses,
  updateDraftServiceValue,
  updateDraftClientMilestones,
  hydrateDraft,
  resetTransition,
} = transitionSlice.actions

export default transitionSlice.reducer

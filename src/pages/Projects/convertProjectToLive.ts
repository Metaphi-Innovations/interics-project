import type { AppDispatch, RootState } from '@/store'
import {
  fetchClientPO,
  fetchBaseline,
  createBaseline,
  fetchBaselineHistory,
} from '@/slices/baseline/thunk'
import { fetchVersions } from '@/slices/pitch/thunk'
import { fetchTransition, saveTransition } from '@/slices/transition/thunk'
import { hydrateDraft, setSelectedSourceVersionId } from '@/slices/transition/reducer'
import { changeProjectStatus, fetchProjectById } from '@/slices/projects/thunk'
import type { Project } from '@/slices/projects/reducer'
import {
  selectTransitionDraft,
  selectTransitionSourceVersionId,
} from '@/store/selectors/transitionSelectors'
import {
  hydrateDraftFromPitchVersion,
  recalcTransitionDraft,
  type TransitionDraft,
} from '@/utils/transitionDraft'
import { validateTransitionForFinalize } from '@/utils/transitionFinalize'

export type ConvertProjectToLiveResult =
  | { ok: true }
  | { ok: false; message: string }

async function runFinalizeFromDraft(
  dispatch: AppDispatch,
  project: Project,
  draft: TransitionDraft,
  referenceClientPoId: string,
): Promise<void> {
  const recalc = recalcTransitionDraft({
    ...draft,
    plannedExpenses: draft.plannedExpenses ?? [],
  })

  await dispatch(
    saveTransition({
      projectId: project.id,
      body: {
        versionId: draft.sourceVersionId,
        categories: structuredClone(draft.categories),
        plannedExpenses: structuredClone(draft.plannedExpenses ?? []),
        originalServiceValues: { ...draft.originalServiceValues },
        versionNumber: draft.versionNumber,
        label: draft.label,
        totalRevenue: recalc.totalRevenue,
        totalCost: recalc.totalCost,
        profitability: recalc.profitability,
      },
    }),
  ).unwrap()

  await dispatch(
    createBaseline({
      projectId: project.id,
      data: {
        versionId: draft.sourceVersionId,
        versionLabel: draft.label,
        basedOnPitchVersion: draft.label,
        pitchVersionNumber: draft.versionNumber,
        clientPOId: referenceClientPoId,
        categories: structuredClone(recalc.categories),
        plannedExpenses: structuredClone(recalc.plannedExpenses ?? []),
        originalServiceValues: { ...draft.originalServiceValues },
        totalRevenue: recalc.totalRevenue,
        totalCost: recalc.totalCost,
        profitability: recalc.profitability,
      },
    }),
  ).unwrap()

  if (project.status !== 'Live') {
    await dispatch(changeProjectStatus({ id: project.id, status: 'Live' })).unwrap()
  }

  await dispatch(fetchProjectById(project.id)).unwrap()
  await dispatch(fetchBaseline(project.id)).unwrap()
  await dispatch(fetchBaselineHistory(project.id)).unwrap()
}

/**
 * Converts a Pitch project to Live: creates baseline when needed, then sets status to Live.
 */
export async function convertProjectToLive(
  dispatch: AppDispatch,
  getState: () => RootState,
  project: Project,
): Promise<ConvertProjectToLiveResult> {
  if (project.status === 'Live') {
    return { ok: true }
  }

  await dispatch(fetchClientPO(project.id)).unwrap()
  await dispatch(fetchBaseline(project.id)).unwrap()
  await dispatch(fetchVersions(project.id)).unwrap()
  await dispatch(fetchTransition(project.id)).unwrap()

  let state = getState()
  const existingBaseline = state.baseline.baseline

  if (existingBaseline) {
    await dispatch(changeProjectStatus({ id: project.id, status: 'Live' })).unwrap()
    await dispatch(fetchProjectById(project.id)).unwrap()
    return { ok: true }
  }

  let draft = selectTransitionDraft(state, project.id) ?? null
  let selectedVersionId = selectTransitionSourceVersionId(state, project.id)
  const clientPOs = state.baseline.clientPOs.filter((po) => po.projectId === project.id)
  const activePitchVersion =
    state.pitch.activeVersion ??
    state.pitch.versions.find((v) => v.isActive) ??
    state.pitch.versions[0] ??
    null

  if (!draft && activePitchVersion) {
    const hydrated = hydrateDraftFromPitchVersion(project.id, activePitchVersion)
    dispatch(
      setSelectedSourceVersionId({
        projectId: project.id,
        versionId: activePitchVersion.id,
      }),
    )
    dispatch(hydrateDraft({ projectId: project.id, draft: hydrated }))
    draft = hydrated
    selectedVersionId = activePitchVersion.id
    state = getState()
  }

  const validation = validateTransitionForFinalize({
    clientPOs,
    selectedVersionId,
    draft,
  })
  const referenceClientPoId = clientPOs[0]?.id ?? ''

  if (validation.ok && draft && referenceClientPoId) {
    try {
      await runFinalizeFromDraft(dispatch, project, draft, referenceClientPoId)
      return { ok: true }
    } catch {
      return { ok: false, message: 'Failed to convert project to Live.' }
    }
  }

  try {
    await dispatch(changeProjectStatus({ id: project.id, status: 'Live' })).unwrap()
    await dispatch(fetchProjectById(project.id)).unwrap()
    return { ok: true }
  } catch {
    return { ok: false, message: 'Failed to convert project to Live.' }
  }
}

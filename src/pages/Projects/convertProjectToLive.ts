import type { AppDispatch, RootState } from '@/store'
import {
  fetchClientPO,
  fetchBaseline,
  createBaseline,
  fetchBaselineHistory,
} from '@/slices/baseline/thunk'
import { fetchVersionById, fetchVersions } from '@/slices/pitch/thunk'
import { fetchTransition, saveTransition } from '@/slices/transition/thunk'
import { hydrateDraft, setSelectedSourceVersionId } from '@/slices/transition/reducer'
import { changeProjectStatus, fetchProjectById } from '@/slices/projects/thunk'
import type { Project } from '@/slices/projects/reducer'
import {
  selectTransitionDraft,
  selectTransitionSourceVersionId,
} from '@/store/selectors/transitionSelectors'
import { selectPitchVersionForProject } from '@/store/selectors/pitchSelectors'
import {
  hydrateDraftFromPitchVersion,
  recalcTransitionDraft,
  type TransitionDraft,
} from '@/utils/transitionDraft'
import {
  formatGoLiveBlockMessage,
  validateGoLiveMinimum,
} from '@/utils/transitionFinalize'

export type ConvertProjectToLiveResult =
  | { ok: true }
  | { ok: false; message: string }

const PITCH_SAVE_POLL_MS = 50
const PITCH_SAVE_TIMEOUT_MS = 5000

async function waitForPitchSaveIdle(getState: () => RootState): Promise<void> {
  const start = Date.now()
  while (getState().pitch.saving && Date.now() - start < PITCH_SAVE_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, PITCH_SAVE_POLL_MS))
  }
}

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
 * Converts a Pitch project to Live: requires a baseline (existing or newly created).
 * Never sets Live without a successful baseline for this project.
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

  const preFetchState = getState()
  const editingVersionId =
    preFetchState.pitch.activeVersion?.projectId === project.id
      ? preFetchState.pitch.activeVersionId
      : null

  await waitForPitchSaveIdle(getState)
  await dispatch(fetchVersions(project.id)).unwrap()
  if (editingVersionId) {
    await dispatch(
      fetchVersionById({ projectId: project.id, versionId: editingVersionId }),
    ).unwrap()
  }
  await dispatch(fetchTransition(project.id)).unwrap()

  let state = getState()
  const existingBaseline =
    state.baseline.baseline?.projectId === project.id ? state.baseline.baseline : null

  if (existingBaseline) {
    await dispatch(changeProjectStatus({ id: project.id, status: 'Live' })).unwrap()
    await dispatch(fetchProjectById(project.id)).unwrap()
    return { ok: true }
  }

  const clientPOs = state.baseline.clientPOs.filter((po) => po.projectId === project.id)
  const activePitchVersion = selectPitchVersionForProject(state, project.id)

  // Always sync from the latest pitch version so Pitch-tab edits are not blocked by a
  // stale or empty transition draft cached from an earlier Convert Live attempt.
  let draft: TransitionDraft | null = null
  let selectedVersionId: string | null = null
  if (activePitchVersion) {
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
  } else {
    draft = selectTransitionDraft(state, project.id) ?? null
    selectedVersionId = selectTransitionSourceVersionId(state, project.id)
  }

  const validation = validateGoLiveMinimum({
    projectId: project.id,
    clientPOs,
    selectedVersionId,
    draft,
  })
  const referenceClientPoId = clientPOs[0]?.id ?? ''

  if (!validation.ok || !draft) {
    return { ok: false, message: formatGoLiveBlockMessage(validation.messages) }
  }

  try {
    await runFinalizeFromDraft(dispatch, project, draft, referenceClientPoId)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Failed to create baseline and convert project to Live.' }
  }
}

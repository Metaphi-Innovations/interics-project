import { http, HttpResponse } from 'msw'
import type { PitchCategory, PlannedExpense } from '../../slices/pitch/reducer'

/** Transition tab persistence only — project CRUD hits the real API. */
type TransitionPersisted = {
  versionId: string | null
  categories: PitchCategory[]
  plannedExpenses: PlannedExpense[]
}

const transitionByProjectId = new Map<string, TransitionPersisted>()

export const projectsHandlers = [
  http.get('*/api/v1/projects/:id/transition', ({ params }) => {
    const id = params.id as string
    const saved = transitionByProjectId.get(id)
    if (!saved) {
      return HttpResponse.json({
        versionId: null,
        categories: [],
        plannedExpenses: [],
      } satisfies TransitionPersisted)
    }
    return HttpResponse.json(saved)
  }),

  http.post('*/api/v1/projects/:id/transition/save', async ({ params, request }) => {
    const id = params.id as string
    const body = (await request.json()) as TransitionPersisted
    transitionByProjectId.set(id, body)
    return HttpResponse.json(body)
  }),
]

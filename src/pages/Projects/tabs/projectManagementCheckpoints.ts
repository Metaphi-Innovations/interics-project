/**
 * Project-scoped category assignment and checkpoint progress.
 * Categories / checkpoint definitions come from Settings → Project Management Master.
 */

/** Saved completion state for a selected checkpoint (after Submit). */
export interface CheckpointProgress {
  completed: boolean
  /** ISO timestamp when marked complete; null if incomplete. */
  completedAt: string | null
}

export interface ProjectManagementCategory {
  id: string
  settingsCategoryId: string
  name: string
  selectedCheckpointIds: string[]
  /** Persisted completion map keyed by checkpoint id (updated on Submit). */
  checkpointProgress: Record<string, CheckpointProgress>
}

export function emptyProgress(): CheckpointProgress {
  return { completed: false, completedAt: null }
}

/** Build initial progress map for newly selected checkpoints. */
export function buildProgressMap(
  selectedCheckpointIds: string[],
  previous?: Record<string, CheckpointProgress>,
): Record<string, CheckpointProgress> {
  const next: Record<string, CheckpointProgress> = {}
  for (const id of selectedCheckpointIds) {
    next[id] = previous?.[id] ?? emptyProgress()
  }
  return next
}

import { formatDate, getDaysBetweenDates } from '@/utils/formatters'

/** Pure view-model for the combined Projects Start / End Date table cell. */
export type ProjectsStartEndCellModel = {
  startText: string
  endText: string
  durationText: string | null
}

export function buildProjectsStartEndCellModel(
  startDate: string | null | undefined,
  expectedEndDate: string | null | undefined,
): ProjectsStartEndCellModel {
  const days = getDaysBetweenDates(startDate ?? null, expectedEndDate ?? null)
  return {
    startText: formatDate(startDate),
    endText: formatDate(expectedEndDate),
    durationText: days === null ? null : days === 1 ? '1 day' : `${days} days`,
  }
}

/** Maps dual-date funnel drafts to existing exact-day API filter params. */
export function toProjectsDualDateFilterParams(start: string, end: string): {
  expectedStartDate?: string
  expectedEndDate?: string
} {
  return {
    ...(start ? { expectedStartDate: start } : {}),
    ...(end ? { expectedEndDate: end } : {}),
  }
}

/** Merge dual-date funnel apply/reset into listing column filters. */
export function mergeProjectsDualDateColFilters(
  prev: Record<string, string>,
  start: string,
  end: string,
): Record<string, string> {
  return {
    ...prev,
    expectedStartDate: start,
    expectedEndDate: end,
  }
}

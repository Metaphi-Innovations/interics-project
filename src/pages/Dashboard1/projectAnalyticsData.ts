/**
 * Sample data for Dashboard 1 — Project Analytics module.
 */

/** Planned vs actual average duration (days) by year. */
export const AVG_PROJECT_DURATION = [
  { year: '2022', planned: 118, actual: 132 },
  { year: '2023', planned: 112, actual: 124 },
  { year: '2024', planned: 108, actual: 115 },
  { year: '2025', planned: 105, actual: 110 },
  { year: '2026', planned: 100, actual: 98 },
]

/** Average project size (sqft) by year. */
export const AVG_PROJECT_SIZE_BY_YEAR = [
  { year: '2022', avgSqft: 4200 },
  { year: '2023', avgSqft: 4550 },
  { year: '2024', avgSqft: 4800 },
  { year: '2025', avgSqft: 5100 },
  { year: '2026', avgSqft: 4850 },
]

export const REPEAT_CLIENTS_KPI = {
  total: 9,
  percentage: 37.5,
  /** Monthly repeat-client count for sparkline. */
  trend: [4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 9, 9],
}

/** Projects completed per calendar year. */
export const PROJECTS_COMPLETED_BY_YEAR = [
  { year: '2022', completed: 6 },
  { year: '2023', completed: 9 },
  { year: '2024', completed: 11 },
  { year: '2025', completed: 14 },
  { year: '2026', completed: 8 },
]

export const PITCH_TO_LIVE_CONVERSION = {
  avgDays: 42,
  subtitle: 'Average days from pitch start to live.',
}

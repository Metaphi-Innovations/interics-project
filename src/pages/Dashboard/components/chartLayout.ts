export const CHART_HEIGHT_MD = 220
export const CHART_HEIGHT_SM = 180

/** Default margins — no axis titles; room for horizontal month/category ticks. */
export const CHART_MARGIN = {
  top: 12,
  right: 12,
  left: 0,
  bottom: 8,
} as const

/** Extra bottom space for horizontal legend below chart. */
export const CHART_MARGIN_WITH_LEGEND = {
  top: 12,
  right: 12,
  left: 0,
  bottom: 32,
} as const

/** Horizontal bar charts (category labels on Y). */
export const CHART_MARGIN_HORIZONTAL = {
  top: 8,
  right: 28,
  left: 0,
  bottom: 8,
} as const

/** Composed charts with angled category labels on X. */
export const CHART_MARGIN_COMPOSED = {
  top: 12,
  right: 36,
  left: 0,
  bottom: 52,
} as const

/** Profitability per team lead — room for right margin % axis outside plot. */
export const CHART_MARGIN_TEAM_PROFIT = {
  top: 12,
  right: 58,
  left: 0,
  bottom: 56,
} as const

/** Horizontal stacked bars + bottom legend. */
export const CHART_MARGIN_STACKED_HORIZONTAL = {
  top: 8,
  right: 16,
  left: 0,
  bottom: 36,
} as const

/** Grouped vertical bars + bottom legend. */
export const CHART_MARGIN_GROUPED_BARS = {
  top: 12,
  right: 12,
  left: 0,
  bottom: 36,
} as const

export const FILTER_SELECT_SX = {
  minWidth: 110,
  fontSize: 12,
  height: 32,
} as const

export const FILTER_DATE_SELECT_SX = {
  minWidth: 130,
  fontSize: 12,
  height: 32,
} as const

export const PANEL_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  p: 2.5,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
} as const

export const SECTION_CHART_ROW_SX = {
  display: 'grid',
  gap: 2.5,
  alignItems: 'stretch',
} as const

/** Y-axis width for horizontal bar charts with lead/client/project names. */
export const CHART_CATEGORY_AXIS_WIDTH = 128

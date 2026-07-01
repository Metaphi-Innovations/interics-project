export const CHART_HEIGHT_MD = 280
export const CHART_HEIGHT_SM = 220

/** Shared padding for all dashboard chart cards (16px). */
export const CHART_PANEL_PADDING = 2

/** Space between chart card header and plot area. */
export const CHART_HEADER_GAP = 1.5

/** Minimum header block height for consistent card title rows. */
export const CHART_HEADER_MIN_HEIGHT = 40

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
  p: CHART_PANEL_PADDING,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
} as const

export const CHART_PLOT_SX = {
  width: '100%',
  minWidth: 0,
  flex: '1 1 auto',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
} as const

export const CHART_HEADER_ROW_SX = {
  mb: CHART_HEADER_GAP,
  flexShrink: 0,
  minHeight: CHART_HEADER_MIN_HEIGHT,
} as const

export const SECTION_CHART_ROW_SX = {
  display: 'grid',
  gap: 2.5,
  alignItems: 'stretch',
} as const

/** Y-axis width for horizontal bar charts with lead/client/project names. */
export const CHART_CATEGORY_AXIS_WIDTH = 128

interface BarSizeOptions {
  legend?: boolean
  marginTop?: number
  marginBottom?: number
}

/** Scale horizontal bar thickness to fill the plot height for the category count. */
export function computeHorizontalBarSize(
  plotHeight: number,
  categoryCount: number,
  options: BarSizeOptions = {},
): number {
  if (categoryCount <= 0) return 16
  const marginTop = options.marginTop ?? 8
  const marginBottom = options.marginBottom ?? 8
  const legend = options.legend ? 36 : 0
  const plot = Math.max(0, plotHeight - marginTop - marginBottom - legend)
  const band = plot / categoryCount
  return Math.max(12, Math.min(36, Math.floor(band * 0.62)))
}

/** Scale grouped vertical bar thickness to fill the plot height for the category count. */
export function computeVerticalGroupedBarSize(
  plotHeight: number,
  categoryCount: number,
  margin: { top?: number; bottom?: number } = {},
): number {
  if (categoryCount <= 0) return 12
  const marginTop = margin.top ?? 12
  const marginBottom = margin.bottom ?? 36
  const plot = Math.max(0, plotHeight - marginTop - marginBottom)
  const band = plot / categoryCount
  return Math.max(10, Math.min(28, Math.floor(band * 0.24)))
}

/** Tight inner height for horizontal bar charts so the plot can be vertically centered. */
export function computeHorizontalChartContentHeight(
  maxHeight: number,
  categoryCount: number,
  options: BarSizeOptions & { rowHeight?: number } = {},
): number {
  if (categoryCount <= 0) return maxHeight
  const rowHeight = options.rowHeight ?? 44
  const marginTop = options.marginTop ?? 8
  const marginBottom = options.marginBottom ?? 8
  const legend = options.legend ? 40 : 0
  const needed = marginTop + marginBottom + legend + categoryCount * rowHeight
  return Math.min(maxHeight, Math.max(needed, 120))
}

export interface TeamProfitChartLayout {
  contentHeight: number
  margin: { top: number; right: number; left: number; bottom: number }
  xAxisHeight: number
  categoryBand: number
}

/** Layout for Profitability Per Team Lead — synced margin, axis, and inner height. */
export function computeTeamProfitChartLayout(
  categoryCount: number,
  plotHeight: number,
): TeamProfitChartLayout {
  if (categoryCount <= 0) {
    return {
      contentHeight: plotHeight,
      margin: { ...CHART_MARGIN_TEAM_PROFIT },
      xAxisHeight: 52,
      categoryBand: 48,
    }
  }

  const categoryBand = categoryCount <= 2 ? 40 : categoryCount <= 4 ? 44 : 48
  const categoryGap = 8
  const plotBands = categoryCount * categoryBand + Math.max(0, categoryCount - 1) * categoryGap

  const marginTop = CHART_MARGIN_TEAM_PROFIT.top
  const marginRight = CHART_MARGIN_TEAM_PROFIT.right
  const xAxisHeight =
    categoryCount <= 2 ? 36 : categoryCount <= 4 ? 40 : Math.min(52, 36 + categoryCount * 2)
  const legendHeight = 28
  const bottomPadding =
    categoryCount <= 2 ? 24 : categoryCount <= 4 ? 32 : Math.min(56, 36 + categoryCount * 4)

  const margin = {
    top: marginTop,
    right: marginRight,
    left: CHART_MARGIN_TEAM_PROFIT.left,
    bottom: bottomPadding,
  }

  const needed = marginTop + plotBands + xAxisHeight + legendHeight + bottomPadding
  const contentHeight = Math.min(plotHeight, Math.max(needed, 160))

  return { contentHeight, margin, xAxisHeight, categoryBand }
}

/** Tight inner height for vertical category charts (composed / column bars). */
export function computeVerticalCategoryChartContentHeight(
  maxHeight: number,
  categoryCount: number,
  options: {
    marginTop?: number
    marginBottom?: number
    xAxisHeight?: number
    legend?: boolean
    categoryBand?: number
  } = {},
): number {
  if (categoryCount <= 0) return maxHeight
  const marginTop = options.marginTop ?? 12
  const marginBottom = options.marginBottom ?? 8
  const xAxisHeight = options.xAxisHeight ?? 52
  const legend = options.legend ? 36 : 0
  const categoryBand = options.categoryBand ?? 52
  const needed = marginTop + marginBottom + xAxisHeight + legend + categoryCount * categoryBand
  return Math.min(maxHeight, Math.max(needed, 160))
}

import dayjs, { type Dayjs } from 'dayjs'
import { isInvalidDateRange, toDateOnlyParam } from '@/components/listing/listingStandards'

export type ReceivableKpiPeriod =
  | 'Today'
  | 'This Week'
  | 'This Month'
  | 'This Year'
  | 'Custom Date Range'

export type ReceivableKpiDateBounds = {
  dateFrom: string
  dateTo: string
}

export type ReceivableListDateParams = {
  dateFrom?: string
  dateTo?: string
  /** True when global ∩ toolbar is empty (from > to). Listing must show zero rows. */
  emptyIntersection?: boolean
}

function formatDateOnly(value: Date | Dayjs | string): string | undefined {
  const parsed = dayjs(value)
  if (!parsed.isValid()) return undefined
  return toDateOnlyParam(parsed.format('YYYY-MM-DD'))
}

/**
 * Merge global KPI Date Range with toolbar From/To (AND intersection).
 * Does not mutate Redux toolbar state — returns params for the list API only.
 */
export function mergeReceivableListDateParams(
  global: ReceivableKpiDateBounds | null,
  toolbarFrom?: string | null,
  toolbarTo?: string | null,
): ReceivableListDateParams {
  const tFrom = toDateOnlyParam(toolbarFrom)
  const tTo = toDateOnlyParam(toolbarTo)
  const gFrom = global?.dateFrom
  const gTo = global?.dateTo

  let dateFrom: string | undefined
  let dateTo: string | undefined

  if (gFrom && tFrom) dateFrom = gFrom > tFrom ? gFrom : tFrom
  else dateFrom = gFrom ?? tFrom

  if (gTo && tTo) dateTo = gTo < tTo ? gTo : tTo
  else dateTo = gTo ?? tTo

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return { emptyIntersection: true }
  }

  return {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }
}

/**
 * Resolve the Receivable KPI Date Range control into inclusive YYYY-MM-DD bounds.
 * Returns null when Custom is incomplete or invalid (end < start).
 * Week bounds use Dayjs local week (Sunday–Saturday by default).
 */
export function resolveReceivableKpiDateRange(
  period: ReceivableKpiPeriod,
  customFrom: Date | null,
  customTo: Date | null,
  now: Dayjs | Date = dayjs(),
): ReceivableKpiDateBounds | null {
  const current = dayjs(now)

  if (period === 'Custom Date Range') {
    const dateFrom = customFrom ? formatDateOnly(customFrom) : undefined
    const dateTo = customTo ? formatDateOnly(customTo) : undefined
    if (!dateFrom || !dateTo) return null
    if (isInvalidDateRange(dateFrom, dateTo)) return null
    return { dateFrom, dateTo }
  }

  if (period === 'Today') {
    const today = formatDateOnly(current)
    if (!today) return null
    return { dateFrom: today, dateTo: today }
  }

  if (period === 'This Week') {
    const dateFrom = formatDateOnly(current.startOf('week'))
    const dateTo = formatDateOnly(current.endOf('week'))
    if (!dateFrom || !dateTo) return null
    return { dateFrom, dateTo }
  }

  if (period === 'This Month') {
    const dateFrom = formatDateOnly(current.startOf('month'))
    const dateTo = formatDateOnly(current.endOf('month'))
    if (!dateFrom || !dateTo) return null
    return { dateFrom, dateTo }
  }

  const dateFrom = formatDateOnly(current.startOf('year'))
  const dateTo = formatDateOnly(current.endOf('year'))
  if (!dateFrom || !dateTo) return null
  return { dateFrom, dateTo }
}

import type { ColumnFilterOption } from '@/components/listing'

export type ListingControls = {
  sortField?: string
  sortDirection: 'asc' | 'desc'
  filters: Record<string, string>
}

export function emptyListingControls(): ListingControls {
  return { sortDirection: 'asc', filters: {} }
}

export function uniqueFilterOptions(values: Array<string | number>): ColumnFilterOption[] {
  const seen = new Set<string>()
  const out: ColumnFilterOption[] = []
  for (const raw of values) {
    const value = String(raw)
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push({ value, label: value })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function compareListingValues(left: unknown, right: unknown, direction: 'asc' | 'desc') {
  const dir = direction === 'asc' ? 1 : -1
  if (typeof left === 'number' || typeof right === 'number') {
    return ((Number(left) || 0) - (Number(right) || 0)) * dir
  }
  return (
    String(left ?? '').localeCompare(String(right ?? ''), undefined, { sensitivity: 'base' }) * dir
  )
}

export function matchesExactFilter(filter: string | undefined, value: string | number) {
  if (!filter) return true
  return String(value) === filter
}

export function matchesDateFilter(filter: string | undefined, iso: string) {
  if (!filter) return true
  return iso.slice(0, 10) === filter.slice(0, 10)
}

export function listingFieldValue(row: object, field: string): unknown {
  return (row as unknown as Record<string, unknown>)[field]
}

export function sortByField<T>(
  rows: T[],
  sortField: string | undefined,
  sortDirection: 'asc' | 'desc',
  resolve: (row: T, field: string) => unknown = (row, field) =>
    listingFieldValue(row as object, field),
) {
  if (!sortField) return rows
  return [...rows].sort((a, b) =>
    compareListingValues(resolve(a, sortField), resolve(b, sortField), sortDirection),
  )
}

export function hasActiveListingControls(controls: ListingControls) {
  return Boolean(controls.sortField) || Object.keys(controls.filters).length > 0
}

export function percentFilterOptions(values: number[]): ColumnFilterOption[] {
  return uniqueFilterOptions(values).map((opt) => ({
    value: opt.value,
    label: `${opt.value}%`,
  }))
}

export function currentIndianFyStartYear(now = new Date()) {
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

export function indianFyLabel(startYear: number) {
  return `FY ${String(startYear % 100).padStart(2, '0')}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function indianFyStartYearFromIso(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return month >= 4 ? year : year - 1
}

export function distinctIndianFyStartYears(dates: Array<string | null | undefined>): number[] {
  const seen = new Set<number>()
  for (const iso of dates) {
    if (!iso) continue
    const startYear = indianFyStartYearFromIso(iso)
    if (startYear != null) seen.add(startYear)
  }
  return [...seen].sort((a, b) => b - a)
}

/** @deprecated Prefer financialYearSelectOptionsFromYears with page-specific years from API. */
export function financialYearSelectOptions(now = new Date(), yearsBack = 4) {
  const current = currentIndianFyStartYear(now)
  return financialYearSelectOptionsFromYears(
    Array.from({ length: yearsBack + 1 }, (_, i) => current - i),
    now,
  )
}

export function financialYearSelectOptionsFromYears(startYears: number[], _now = new Date()) {
  const uniqueYears = [...new Set(startYears.filter((year) => Number.isInteger(year)))].sort(
    (a, b) => b - a,
  )
  return [
    { value: '', label: 'All' },
    ...uniqueYears.map((startYear) => ({
      value: String(startYear),
      label: indianFyLabel(startYear),
    })),
  ]
}

export function selectedFyHeading(startYear: number | '', _now = new Date()) {
  if (startYear === '' || startYear == null) return 'All Financial Years'
  return indianFyLabel(startYear)
}

/**
 * Default Period Breakdown FY selection: current Indian FY when it has page data;
 * otherwise All (do not invent an empty current year).
 * Works for any calendar date (current and future years) via currentIndianFyStartYear(now).
 */
export function defaultFyStartYearFromAvailable(
  availableYears: number[],
  now = new Date(),
): number | '' {
  const current = currentIndianFyStartYear(now)
  return availableYears.includes(current) ? current : ''
}

export function parseFyStartYear(value: unknown): number | '' {
  if (value === '' || value == null) return ''
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(next) ? next : ''
}

export function parseChartPeriod(period: string): Date | null {
  const match = period.trim().match(/^([A-Za-z]{3})\s+(\d{2})$/)
  if (!match) return null
  const parsed = new Date(`${match[1]} 1, 20${match[2]}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Indian FY quarters: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar. */
export function indianFyQuarterLabel(date: Date): string {
  const month = date.getMonth()
  const quarter = month >= 3 ? Math.floor((month - 3) / 3) + 1 : 4
  return `Q${quarter}`
}

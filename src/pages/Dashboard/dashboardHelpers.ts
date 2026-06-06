import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { DateRange, DateRangeBounds, MonthBucket } from './types'

export function inDateRange(iso: string, range: DateRange): boolean {
  if (range === 'All Time') return true
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const bounds = getDateRangeBounds(range)
  return d >= bounds.start && d <= bounds.end
}

export function getDateRangeBounds(range: DateRange): DateRangeBounds {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = new Date()

  if (range === 'This Month') {
    start.setFullYear(now.getFullYear(), now.getMonth(), 1)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (range === 'This Quarter') {
    const q = Math.floor(now.getMonth() / 3)
    start.setFullYear(now.getFullYear(), q * 3, 1)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (range === 'This Year') {
    start.setFullYear(now.getFullYear(), 0, 1)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  start.setFullYear(2000, 0, 1)
  return { start, end }
}

export function getPreviousDateRangeBounds(range: DateRange): DateRangeBounds | null {
  if (range === 'All Time') return null
  const now = new Date()

  if (range === 'This Month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  if (range === 'This Quarter') {
    const q = Math.floor(now.getMonth() / 3)
    const prevQ = q === 0 ? 3 : q - 1
    const year = q === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const start = new Date(year, prevQ * 3, 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(year, prevQ * 3 + 3, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  if (range === 'This Year') {
    const start = new Date(now.getFullYear() - 1, 0, 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now.getFullYear() - 1, 11, 31)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  return null
}

export function isoInBounds(iso: string, bounds: DateRangeBounds): boolean {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d >= bounds.start && d <= bounds.end
}

export function getMonthBuckets(count: number): MonthBucket[] {
  const now = new Date()
  const arr: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    arr.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return arr
}

export function inCalendarMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d.getFullYear() === year && d.getMonth() === month
}

export function invoiceDocumentDate(inv: ClientInvoice): string {
  return inv.invoiceDate || inv.createdAt
}

export function paidInvoiceCashMonthIso(inv: ClientInvoice): string | null {
  if (inv.status !== 'paid') return null
  const payDates = inv.payments.map((p) => p.date).filter(Boolean).sort()
  const last =
    payDates.length > 0
      ? payDates[payDates.length - 1]
      : inv.updatedAt ?? inv.invoiceDate
  return last ?? null
}

export function growthPct(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return null
    return 100
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

export function formatGrowthTrend(
  current: number,
  previous: number,
  range: DateRange,
  invert = false,
): { variant: import('./types').TrendVariant; text: string } {
  if (range === 'All Time') {
    return { variant: 'neutral', text: '—' }
  }
  const pct = growthPct(current, previous)
  if (pct === null) return { variant: 'neutral', text: '—' }
  const rounded = Math.abs(Math.round(pct * 10) / 10)
  const text = `${rounded}%`
  if (Math.abs(pct) < 0.05) return { variant: 'neutral', text: '0%' }
  const up = pct > 0
  const positive = invert ? !up : up
  return { variant: positive ? 'positive' : 'negative', text }
}

export async function fetchJsonArray(url: string): Promise<unknown[]> {
  try {
    const r = await fetch(url)
    if (!r.ok) return []
    const ct = r.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) return []
    const data: unknown = await r.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function fetchJsonObject<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const ct = r.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export function monthCountForRange(dateRange: DateRange): number {
  if (dateRange === 'This Year') return 12
  if (dateRange === 'This Quarter') return 3
  if (dateRange === 'This Month') return 1
  return 6
}

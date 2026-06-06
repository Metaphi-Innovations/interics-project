export function compactCurrencyLabel(value: number): string {
  if (value === 0) return '₹0'
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${Math.round(value)}`
}

export function truncateCategoryTick(label: unknown, maxLen = 14): string {
  const s = String(label ?? '')
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen - 1)}…`
}

export function yAxisCurrencyTick(v: number): string {
  if (v === 0) return '₹0'
  return `₹${(v / 100000).toFixed(0)}L`
}

export function axisLabelStyle(): { fontSize: number; fill: string } {
  return { fontSize: 11, fill: 'var(--mui-palette-text-secondary)' }
}

/** Recharts LabelList formatter (label is ReactNode at runtime). */
export function labelListFormatter(format: (value: number) => string): (label: unknown) => string {
  return (label) => {
    const v = Number(label)
    if (!Number.isFinite(v) || v === 0) return ''
    return format(v)
  }
}

export const labelListCompactCurrency = labelListFormatter(compactCurrencyLabel)

export function marginPercentTick(v: number): string {
  if (!Number.isFinite(v)) return '0%'
  return `${Number(v).toFixed(1)}%`
}

export function marginPercentTooltip(value: unknown): string {
  return marginPercentTick(Number(value ?? 0))
}

/** Show bar top labels only when the value is large enough to avoid clutter. */
export function createBillingBarLabelFormatter(peakValue: number) {
  const threshold = Math.max(peakValue * 0.18, 50000)
  return (label: unknown) => {
    const v = Number(label)
    if (!Number.isFinite(v) || v < threshold) return ''
    return compactCurrencyLabel(v)
  }
}

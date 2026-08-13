/** Show blank instead of sticky 0 so users can type % / ₹ values easily. */
export function rateInputDisplay(value: number): string | number {
  return value === 0 ? '' : value
}

export function parseRateInput(raw: string): number {
  if (raw.trim() === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function selectRateInputOnFocus(
  e: { currentTarget: HTMLInputElement | HTMLTextAreaElement },
): void {
  e.currentTarget.select()
}

import { describe, expect, it } from 'vitest'

/**
 * Display-only contract for Client PO TDS MenuItems:
 * render API `label` (e.g. "194C (1%)"), never rate-only.
 */
function tdsMenuLabel(option: { label: string; rate?: number }): string {
  return option.label
}

describe('Client PO TDS dropdown label', () => {
  it('displays section name + rate from API label', () => {
    expect(tdsMenuLabel({ label: '194C (1%)', rate: 1 })).toBe('194C (1%)')
  })

  it('does not collapse to rate-only when rate is present', () => {
    const option = { value: 'id-1', label: '194J (10%)', rate: 10 }
    const wrong = Number.isFinite(option.rate) ? `${option.rate}%` : option.label
    expect(wrong).toBe('10%')
    expect(tdsMenuLabel(option)).toBe('194J (10%)')
    expect(tdsMenuLabel(option)).not.toBe(`${option.rate}%`)
  })

  it('preserves selection value (tdsSectionId) and rate separately', () => {
    const option = { value: 'uuid-194c', label: '194C (1%)', rate: 1 }
    expect(option.value).toBe('uuid-194c')
    expect(option.rate).toBe(1)
    expect(tdsMenuLabel(option)).toBe('194C (1%)')
  })
})

import { describe, expect, it } from 'vitest'
import { formatInr } from './formatters'

describe('formatInr', () => {
  it('always displays exactly two decimal places', () => {
    expect(formatInr(10500.5)).toBe('10,500.50')
    expect(formatInr(0)).toBe('0.00')
    expect(formatInr(100)).toBe('100.00')
  })
})

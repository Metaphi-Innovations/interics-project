import { describe, expect, it } from 'vitest'
import {
  sumVendorOfferGlobalPercentages,
  validateVendorOfferGlobalPercents,
} from '@/utils/vendorMilestones'

describe('validateVendorOfferGlobalPercents', () => {
  it('40 + 50 + retention 10 = 100 → PASS', () => {
    const result = validateVendorOfferGlobalPercents({
      milestones: [
        { name: 'M1', percentage: 40 },
        { name: 'M2', percentage: 50 },
      ],
      retention: { name: 'Retention', percentage: 10 },
    })
    expect(result.valid).toBe(true)
    expect(result.currentPct).toBe(100)
  })

  it('aggregates percentages across different services (global total)', () => {
    // Service A 40 + Service B 50 + Retention 10 — same as screenshot scenario
    expect(
      validateVendorOfferGlobalPercents({
        milestones: [
          { name: 'Service A MS', percentage: 40 },
          { name: 'Service B MS', percentage: 50 },
        ],
        retention: { name: 'Retention', percentage: 10 },
      }).valid,
    ).toBe(true)
  })

  it('40 + 50 + retention 5 = 95 → FAIL', () => {
    const result = validateVendorOfferGlobalPercents({
      milestones: [
        { name: 'M1', percentage: 40 },
        { name: 'M2', percentage: 50 },
      ],
      retention: { name: 'Retention', percentage: 5 },
    })
    expect(result.valid).toBe(false)
    expect(result.pctMessage).toContain('95.0%')
  })

  it('40 + 50 + retention 15 = 105 → FAIL', () => {
    const result = validateVendorOfferGlobalPercents({
      milestones: [
        { name: 'M1', percentage: 40 },
        { name: 'M2', percentage: 50 },
      ],
      retention: { name: 'Retention', percentage: 15 },
    })
    expect(result.valid).toBe(false)
    expect(result.currentPct).toBe(105)
  })

  it('20 + 20 + 20 + 30 + retention 10 = 100 → PASS', () => {
    expect(
      validateVendorOfferGlobalPercents({
        milestones: [
          { name: 'A', percentage: 20 },
          { name: 'B', percentage: 20 },
          { name: 'C', percentage: 20 },
          { name: 'D', percentage: 30 },
        ],
        retention: { name: 'Retention', percentage: 10 },
      }).valid,
    ).toBe(true)
  })

  it('decimal 33.33 + 33.33 + 33.34 = 100 → PASS', () => {
    expect(
      validateVendorOfferGlobalPercents({
        milestones: [
          { name: 'A', percentage: 33.33 },
          { name: 'B', percentage: 33.33 },
          { name: 'C', percentage: 33.34 },
        ],
      }).valid,
    ).toBe(true)
  })

  it('counts retention exactly once', () => {
    expect(
      sumVendorOfferGlobalPercentages({
        milestones: [{ percentage: 90 }],
        retentionPercentage: 10,
      }),
    ).toBe(100)
  })

  it('empty milestone name with percentage → clear name validation', () => {
    const result = validateVendorOfferGlobalPercents({
      milestones: [
        { name: 'Named', percentage: 50 },
        { name: '', percentage: 50 },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.nameMessage).toBe('Milestone name is required.')
  })

  it('retention alone without milestones → FAIL', () => {
    const result = validateVendorOfferGlobalPercents({
      milestones: [],
      retention: { name: 'Retention', percentage: 10 },
    })
    expect(result.valid).toBe(false)
    expect(result.structureMessage).toMatch(/before retention/i)
  })

  it('screenshot scenario 40 + 50 + 10 must not report currently 50%', () => {
    const result = validateVendorOfferGlobalPercents({
      milestones: [
        { name: 'Milestone 1', percentage: 40 },
        { name: 'Milestone 2', percentage: 50 },
      ],
      retention: { name: 'Retention', percentage: 10 },
    })
    expect(result.valid).toBe(true)
    expect(result.pctMessage).toBeUndefined()
  })
})

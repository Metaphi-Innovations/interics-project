/** Mirrors payables.service toPayablesListItem net amount extraction. */
import { describe, expect, it } from 'vitest'

function payablesInvoiceAmount(data: Record<string, unknown>): number {
  return Number(data.netPayable ?? data.totalAmount ?? data.baseAmount ?? 0) || 0
}

describe('finance payables listing net amount', () => {
  it('displays netPayable not baseAmount', () => {
    const amount = payablesInvoiceAmount({
      baseAmount: 300_000,
      netPayable: 348_000,
      gstAmount: 54_000,
      tdsAmount: 6_000,
    })
    expect(amount).toBe(348_000)
    expect(amount).not.toBe(300_000)
    expect(amount).not.toBe(354_000)
  })

  it('falls back to totalAmount then baseAmount for legacy rows', () => {
    expect(payablesInvoiceAmount({ totalAmount: 118_000, baseAmount: 100_000 })).toBe(118_000)
    expect(payablesInvoiceAmount({ baseAmount: 100_000 })).toBe(100_000)
  })
})

/** Mirrors payables.service toPayablesListItem amount extraction. */
import { describe, expect, it } from 'vitest'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function payablesListingAmounts(data: Record<string, unknown>, lineItems: Array<Record<string, unknown>> = []) {
  const headerBase = Number(data.baseAmount ?? 0) || 0
  const headerGst = Number(data.gstAmount ?? 0) || 0
  const headerNet = Number(data.netPayable ?? data.totalAmount ?? data.baseAmount ?? 0) || 0
  const headerTds = Number(data.tdsAmount ?? data.tdsDeducted ?? 0) || 0

  let lineBaseSum = 0
  let lineGstSum = 0
  let lineNetSum = 0
  let lineTdsSum = 0
  for (const li of lineItems) {
    lineBaseSum += Number(li.amount ?? 0) || 0
    lineGstSum += Number(li.gstAmount ?? 0) || 0
    lineNetSum += Number(li.netAmount ?? li.amount ?? 0) || 0
    lineTdsSum += Number(li.tdsAmount ?? 0) || 0
  }

  return {
    totalAmount: round2(headerBase > 0 ? headerBase : lineBaseSum),
    gstAmount: round2(headerGst > 0 ? headerGst : lineGstSum),
    invoiceAmount: round2(headerNet > 0 ? headerNet : lineNetSum),
    tdsAmount: round2(headerTds > 0 ? headerTds : lineTdsSum),
  }
}

describe('finance payables listing amounts', () => {
  it('maps GST, Total Amount, TDS, and Net payable from header', () => {
    const amounts = payablesListingAmounts({
      baseAmount: 300_000,
      gstAmount: 54_000,
      tdsAmount: 6_000,
      netPayable: 348_000,
    })
    expect(amounts).toEqual({
      totalAmount: 300_000,
      gstAmount: 54_000,
      tdsAmount: 6_000,
      invoiceAmount: 348_000,
    })
  })

  it('falls back to line sums when header tax fields are missing', () => {
    const amounts = payablesListingAmounts(
      { netPayable: 10_800 },
      [
        { amount: 9_000, gstAmount: 1_620, tdsAmount: 900, netAmount: 9_720 },
        { amount: 1_000, gstAmount: 180, tdsAmount: 100, netAmount: 1_080 },
      ],
    )
    expect(amounts.totalAmount).toBe(10_000)
    expect(amounts.gstAmount).toBe(1_800)
    expect(amounts.tdsAmount).toBe(1_000)
    expect(amounts.invoiceAmount).toBe(10_800)
  })

  it('falls back to totalAmount then baseAmount for legacy net rows', () => {
    expect(payablesListingAmounts({ totalAmount: 118_000, baseAmount: 100_000 }).invoiceAmount).toBe(118_000)
    expect(payablesListingAmounts({ baseAmount: 100_000 }).invoiceAmount).toBe(100_000)
  })
})

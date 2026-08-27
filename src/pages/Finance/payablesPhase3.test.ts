import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const paymentsPage = fs.readFileSync(
  path.resolve(__dirname, './PaymentsPage.tsx'),
  'utf8',
)

describe('Payables KPI refresh wiring', () => {
  it('uses shared refreshPayablesSummaryAndList for upload, delete, and workflow close', () => {
    expect(paymentsPage).toContain('async function refreshPayablesSummaryAndList')
    expect(paymentsPage).toMatch(/handleInvoiceUploaded[\s\S]*?refreshPayablesSummaryAndList/)
    expect(paymentsPage).toMatch(/onClose=\{\(\) => \{[\s\S]*?refreshPayablesSummaryAndList\(\)/)
    expect(paymentsPage).toMatch(/confirmDeletePayableInvoice[\s\S]*?refreshPayablesSummaryAndList/)
  })
})

describe('Payables draft delete visibility', () => {
  it('gates Delete on invoice lifecycle status, not payment status alone', () => {
    expect(paymentsPage).toContain('isDraftEquivalentVendorInvoiceStatus')
    expect(paymentsPage).toMatch(
      /actionMenuItemsForStatus\([\s\S]*?invoiceStatus[\s\S]*?canDeletePayable/,
    )
    expect(paymentsPage).toContain('title="Delete draft invoice?"')
  })
})

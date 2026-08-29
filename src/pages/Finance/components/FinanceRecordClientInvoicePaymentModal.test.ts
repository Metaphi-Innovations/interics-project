import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const financeAdapterSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'FinanceRecordClientInvoicePaymentModal.tsx'),
  'utf8',
)
const sharedModalSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../../Projects/tabs/live/RecordClientInvoicePaymentModal.tsx',
  ),
  'utf8',
)

describe('FinanceRecordClientInvoicePaymentModal', () => {
  it('reuses Project Live RecordClientInvoicePaymentModal', () => {
    expect(financeAdapterSource).toContain('RecordClientInvoicePaymentModal')
    expect(financeAdapterSource).toContain('invoiceToClientInvoice')
  })

  it('routes payments through receivables recordPayment with zero TDS', () => {
    expect(financeAdapterSource).toContain('recordPayment')
    expect(financeAdapterSource).toContain('tdsDeducted: 0')
    expect(financeAdapterSource).toContain('onRecordPayment')
  })

  it('does not define a duplicate payment form UI', () => {
    expect(financeAdapterSource).not.toContain('<Input')
    expect(financeAdapterSource).not.toContain('Amount Received')
  })
})

describe('RecordClientInvoicePaymentModal (shared)', () => {
  it('does not render payment-level TDS input controls', () => {
    expect(sharedModalSource).not.toMatch(/label="TDS/)
    expect(sharedModalSource).not.toContain('TDS on this payment')
  })

  it('supports Finance adapter via onRecordPayment', () => {
    expect(sharedModalSource).toContain('onRecordPayment?:')
    expect(sharedModalSource).toContain('onRecorded?:')
  })
})

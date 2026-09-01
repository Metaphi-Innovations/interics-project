import { describe, expect, it } from 'vitest'
import {
  isDraftEquivalentClientInvoiceStatus,
  isDraftEquivalentVendorInvoiceStatus,
} from './invoiceLifecycle'

describe('invoiceLifecycle', () => {
  describe('isDraftEquivalentClientInvoiceStatus', () => {
    it('allows draft and uploaded only', () => {
      expect(isDraftEquivalentClientInvoiceStatus('draft')).toBe(true)
      expect(isDraftEquivalentClientInvoiceStatus('uploaded')).toBe(true)
      expect(isDraftEquivalentClientInvoiceStatus('UPLOADED')).toBe(true)
    })

    it('rejects non-draft client invoice states', () => {
      for (const status of ['sent', 'tax', 'partially_paid', 'paid', 'overdue']) {
        expect(isDraftEquivalentClientInvoiceStatus(status)).toBe(false)
      }
    })
  })

  describe('isDraftEquivalentVendorInvoiceStatus', () => {
    it('allows draft-equivalent vendor invoice states', () => {
      for (const status of ['draft', 'uploaded', 'pending', 'not_paid', '']) {
        expect(isDraftEquivalentVendorInvoiceStatus(status)).toBe(true)
      }
    })

    it('rejects sent/paid vendor invoice states', () => {
      for (const status of ['sent', 'paid', 'partially_paid', 'approved']) {
        expect(isDraftEquivalentVendorInvoiceStatus(status)).toBe(false)
      }
    })
  })
})
